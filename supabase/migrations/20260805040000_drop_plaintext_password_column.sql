-- app_admins.password was added manually via the table editor and holds a
-- plaintext credential. It is never read by any app code — is_admin() and
-- RLS key off auth.jwt() ->> 'email' from a real Supabase Auth session, not
-- this table. Storing a plaintext password with no functional purpose is a
-- pure liability, so it's dropped here.
ALTER TABLE app_admins DROP COLUMN IF EXISTS password;
