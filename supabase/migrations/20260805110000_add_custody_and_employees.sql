-- Phase 2 (Custody): employees, assignments (custody chain), and
-- offboarding clearance. Follows this project's existing conventions:
-- UUID PKs, anon-open RLS to match the app's no-login posture, and a
-- Postgres function for the one truly atomic multi-row operation
-- (transfer) rather than trying to fake atomicity from the client.

-- 1. employees
CREATE TYPE employment_status AS ENUM ('active', 'notice', 'exited');

CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    work_email TEXT UNIQUE NOT NULL,
    department TEXT,
    designation TEXT,
    join_date DATE,
    employment_status employment_status NOT NULL DEFAULT 'active',
    location_id UUID REFERENCES locations(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
-- Explicitly excluded by design: salary, national ID, date of birth, banking details.

-- 2. assignments (custody chain) — append-only, never deleted.
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID REFERENCES assets(id) NOT NULL,
    employee_id UUID REFERENCES employees(id) NOT NULL,
    condition_out asset_condition NOT NULL,
    issued_by TEXT NOT NULL,
    signature_data_url TEXT,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    returned_at TIMESTAMPTZ,
    condition_in asset_condition,
    damage_notes TEXT,
    received_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Hard DB rule: one open assignment per asset at a time.
CREATE UNIQUE INDEX one_open_assignment_per_asset ON assignments (asset_id) WHERE returned_at IS NULL;

CREATE INDEX idx_assignments_employee ON assignments (employee_id);

-- Transfer is one atomic action: close the current open assignment and
-- open a new one for the new employee, in a single transaction. Doing
-- this as two separate PostgREST calls from the client would not be
-- atomic and could momentarily violate the one-open-assignment rule.
CREATE OR REPLACE FUNCTION transfer_asset(
    p_asset_id UUID,
    p_new_employee_id UUID,
    p_condition asset_condition,
    p_admin TEXT,
    p_signature TEXT
) RETURNS UUID AS $$
DECLARE
    new_assignment_id UUID;
BEGIN
    UPDATE assignments
    SET returned_at = now(), condition_in = p_condition, received_by = p_admin
    WHERE asset_id = p_asset_id AND returned_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No open assignment found for asset %', p_asset_id;
    END IF;

    INSERT INTO assignments (asset_id, employee_id, condition_out, issued_by, signature_data_url)
    VALUES (p_asset_id, p_new_employee_id, p_condition, p_admin, p_signature)
    RETURNING id INTO new_assignment_id;

    RETURN new_assignment_id;
END;
$$ LANGUAGE plpgsql;

-- 3. offboarding clearance
CREATE TABLE offboarding_clearances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id) NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'complete')),
    created_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE offboarding_clearance_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clearance_id UUID REFERENCES offboarding_clearances(id) NOT NULL,
    assignment_id UUID REFERENCES assignments(id) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'returned', 'lost')),
    notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Employment status change to notice/exited auto-generates a clearance
-- checklist covering every currently open assignment for that employee.
CREATE OR REPLACE FUNCTION trig_employee_offboarding() RETURNS TRIGGER AS $$
DECLARE
    new_clearance_id UUID;
BEGIN
    IF NEW.employment_status IN ('notice', 'exited')
       AND (OLD.employment_status IS DISTINCT FROM NEW.employment_status)
       AND NOT EXISTS (
           SELECT 1 FROM offboarding_clearances WHERE employee_id = NEW.id AND status = 'open'
       ) THEN
        INSERT INTO offboarding_clearances (employee_id) VALUES (NEW.id) RETURNING id INTO new_clearance_id;

        INSERT INTO offboarding_clearance_items (clearance_id, assignment_id)
        SELECT new_clearance_id, a.id FROM assignments a
        WHERE a.employee_id = NEW.id AND a.returned_at IS NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER employee_offboarding_trigger
AFTER UPDATE ON employees
FOR EACH ROW
EXECUTE FUNCTION trig_employee_offboarding();

-- A clearance is complete only once every item is resolved (no longer
-- "pending"). Re-checked whenever an item is updated.
CREATE OR REPLACE FUNCTION trig_check_clearance_complete() RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM offboarding_clearance_items
        WHERE clearance_id = NEW.clearance_id AND status = 'pending'
    ) THEN
        UPDATE offboarding_clearances
        SET status = 'complete', completed_at = now()
        WHERE id = NEW.clearance_id AND status != 'complete';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clearance_item_updated_trigger
AFTER UPDATE ON offboarding_clearance_items
FOR EACH ROW
EXECUTE FUNCTION trig_check_clearance_complete();

-- --- RLS: match the app's existing anon-open posture ---
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE offboarding_clearances ENABLE ROW LEVEL SECURITY;
ALTER TABLE offboarding_clearance_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on employees" ON employees FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything on assignments" ON assignments FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything on offboarding_clearances" ON offboarding_clearances FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything on offboarding_clearance_items" ON offboarding_clearance_items FOR ALL USING (is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON employees TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON assignments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON offboarding_clearances TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON offboarding_clearance_items TO anon;
GRANT EXECUTE ON FUNCTION transfer_asset(UUID, UUID, asset_condition, TEXT, TEXT) TO anon;

CREATE POLICY "Public can do everything on employees" ON employees FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Public can do everything on assignments" ON assignments FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Public can do everything on offboarding_clearances" ON offboarding_clearances FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Public can do everything on offboarding_clearance_items" ON offboarding_clearance_items FOR ALL TO anon USING (true) WITH CHECK (true);
