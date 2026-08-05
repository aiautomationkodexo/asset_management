-- Documents the auth_users table backing the client-side login gate
-- (src/lib/simpleAuth.ts). This table was created directly in the Supabase
-- dashboard, not by a prior migration — this file exists so a fresh
-- environment can recreate it. IF NOT EXISTS guards against re-running
-- against the project where it already exists.
--
-- Security note (status quo, not introduced here): RLS is disabled and
-- password is stored in plaintext, matching this app's existing "no real
-- auth for now" posture (see 20260805060000_remove_auth_open_access.sql).
-- Anyone with the anon key can already read every row, including
-- passwords. Do not treat this table as a secure credential store.

CREATE TABLE IF NOT EXISTS auth_users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
    password TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
