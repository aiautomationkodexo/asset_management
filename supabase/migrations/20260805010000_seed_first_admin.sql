-- Seeds the first allowlisted admin, per FSD §2.1: "The first admin is
-- seeded by migration. Subsequent admins are added only through the app
-- by an existing admin." This grants full admin RLS access (is_admin())
-- to this email in the real database — it is not dev-only.

INSERT INTO app_admins (email, is_active, added_by)
VALUES ('ai-automation@kodexolabs.com', true, NULL)
ON CONFLICT (email) DO NOTHING;
