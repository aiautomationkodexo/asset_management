-- Fix for "Access Not Granted" when signing in as the seeded first admin.
--
-- I do not have credentials to connect to the live project and inspect the
-- current app_admins row directly, so this migration is written to be
-- correct regardless of which of the following turns out to have been true:
--
-- 1. is_admin() compared emails with a case-sensitive, whitespace-sensitive
--    `=` (see 20260805000000_initial_schema.sql line 18). Email addresses
--    are conventionally treated case-insensitively (Google/Workspace do
--    this too), and it's easy for an email typed into Supabase's "Add user"
--    dialog to differ only in case, or pick up a stray space, from what was
--    inserted into app_admins. Both sides are now normalized with
--    lower(trim(...)) before comparing, which is strictly more permissive
--    than before and cannot break a match that already worked.
--
-- 2. The app_admins row for this admin may have been missing, inactive, or
--    stored with different casing/whitespace than the real auth user's
--    email. Rather than assume which, this upserts a single normalized,
--    active row for the address instead of INSERT ... ON CONFLICT DO
--    NOTHING (which would silently no-op if the row existed but was wrong).

CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM app_admins
        WHERE lower(trim(email)) = lower(trim(auth.jwt() ->> 'email'))
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Normalize and reactivate any existing row for this admin...
UPDATE app_admins
SET email = 'ai-automation@kodexolabs.com', is_active = true
WHERE lower(trim(email)) = lower(trim('ai-automation@kodexolabs.com'));

-- ...or insert it fresh if no such row existed at all.
INSERT INTO app_admins (email, is_active, added_by)
SELECT 'ai-automation@kodexolabs.com', true, NULL
WHERE NOT EXISTS (
    SELECT 1 FROM app_admins
    WHERE lower(trim(email)) = lower(trim('ai-automation@kodexolabs.com'))
);
