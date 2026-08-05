-- Phase 3 (Financial): purchases, depreciation snapshots, disposals.
-- Reuses columns the initial schema already reserved for this
-- (assets.purchase_id, purchase_cost_base, in_service_date,
-- useful_life_months, salvage_value; asset_categories.default_tax_depr_rate)
-- instead of adding a redundant join table.

CREATE TABLE purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor TEXT NOT NULL,
    invoice_number TEXT,
    purchase_date DATE NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    amount NUMERIC NOT NULL,
    fx_rate NUMERIC NOT NULL DEFAULT 1,
    warranty_until DATE,
    invoice_file_data_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE assets ADD CONSTRAINT assets_purchase_id_fkey FOREIGN KEY (purchase_id) REFERENCES purchases(id);

-- One snapshot per asset/period/method — re-running the month-end job for
-- a period that already has snapshots is a no-op (ON CONFLICT DO NOTHING
-- at the call site), not a duplicate.
CREATE TABLE depreciation_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID REFERENCES assets(id) NOT NULL,
    period DATE NOT NULL, -- first day of the month the snapshot covers
    method TEXT NOT NULL CHECK (method IN ('book', 'tax')),
    opening_value NUMERIC NOT NULL,
    charge NUMERIC NOT NULL,
    closing_value NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (asset_id, period, method)
);

CREATE TABLE disposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID REFERENCES assets(id) NOT NULL UNIQUE,
    disposal_date DATE NOT NULL,
    method TEXT NOT NULL,
    proceeds NUMERIC NOT NULL DEFAULT 0,
    book_value_at_disposal NUMERIC NOT NULL,
    gain_loss NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE depreciation_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE disposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on purchases" ON purchases FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything on depreciation_snapshots" ON depreciation_snapshots FOR ALL USING (is_admin());
CREATE POLICY "Admins can do everything on disposals" ON disposals FOR ALL USING (is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON purchases TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON depreciation_snapshots TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON disposals TO anon;

CREATE POLICY "Public can do everything on purchases" ON purchases FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Public can do everything on depreciation_snapshots" ON depreciation_snapshots FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Public can do everything on disposals" ON disposals FOR ALL TO anon USING (true) WITH CHECK (true);
