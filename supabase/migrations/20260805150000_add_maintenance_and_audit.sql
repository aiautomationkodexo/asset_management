-- Phase 4: maintenance logs, audit sweep sessions, and a small settings
-- table for the one configurable threshold this phase needs.

CREATE TABLE app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
INSERT INTO app_settings (key, value) VALUES ('maintenance_flag_threshold_percent', '40');

CREATE TABLE maintenance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID REFERENCES assets(id) NOT NULL,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    log_type TEXT NOT NULL DEFAULT 'repair' CHECK (log_type IN ('repair', 'service', 'upgrade', 'inspection')),
    vendor TEXT,
    cost NUMERIC NOT NULL DEFAULT 0,
    downtime_hours NUMERIC,
    description TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_maintenance_logs_asset ON maintenance_logs (asset_id);

-- in_repair status requires an open (unresolved) maintenance log entry.
CREATE OR REPLACE FUNCTION trig_require_open_maintenance() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'in_repair' AND NOT EXISTS (
        SELECT 1 FROM maintenance_logs WHERE asset_id = NEW.id AND resolved_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Asset % cannot be set to in_repair without an open maintenance log entry', NEW.asset_tag;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assets_require_maintenance_log
BEFORE UPDATE ON assets
FOR EACH ROW
WHEN (NEW.status = 'in_repair')
EXECUTE FUNCTION trig_require_open_maintenance();

-- Audit sweeps
CREATE TABLE audit_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID REFERENCES locations(id),
    started_at TIMESTAMPTZ DEFAULT now(),
    closed_at TIMESTAMPTZ,
    created_by TEXT
);

CREATE TABLE audit_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES audit_sessions(id) NOT NULL,
    scanned_slug TEXT NOT NULL,
    asset_id UUID REFERENCES assets(id),
    scanned_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_scans_session ON audit_scans (session_id);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on app_settings" ON app_settings FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything on maintenance_logs" ON maintenance_logs FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything on audit_sessions" ON audit_sessions FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything on audit_scans" ON audit_scans FOR ALL USING (is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON app_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON maintenance_logs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON audit_sessions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON audit_scans TO anon;

CREATE POLICY "Public can do everything on app_settings" ON app_settings FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Public can do everything on maintenance_logs" ON maintenance_logs FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Public can do everything on audit_sessions" ON audit_sessions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Public can do everything on audit_scans" ON audit_scans FOR ALL TO anon USING (true) WITH CHECK (true);
