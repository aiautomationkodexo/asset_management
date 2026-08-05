-- Import batch log (FR-1.4 / §8.4): one row per CSV bulk-import attempt,
-- recording the outcome counts so admins can audit what was imported when.
-- Row-level validation happens client-side during dry-run; only rows that
-- pass validation are ever sent to the assets insert, so this table logs
-- the result of that insert, not the raw file.

CREATE TABLE import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    total_rows INTEGER NOT NULL,
    inserted_count INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    duplicate_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'committed' CHECK (status IN ('committed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID
);

ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on import_batches" ON import_batches
  FOR ALL USING (is_admin());

-- Matches the anon open-access posture from
-- 20260805060000_remove_auth_open_access.sql — no login is required
-- anywhere in the admin console right now.
GRANT SELECT, INSERT ON import_batches TO anon;

CREATE POLICY "Public can do everything on import_batches" ON import_batches
  FOR ALL TO anon USING (true) WITH CHECK (true);
