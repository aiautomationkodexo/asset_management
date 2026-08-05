-- Support the admin-invite flow: an admin creates a user row with only an
-- email (+ role) and no password. On that user's first login attempt, the
-- app detects the missing password and prompts them to set one instead of
-- rejecting the login — but only for emails an admin has already added.
-- Safe to run even if the column is already nullable.

ALTER TABLE auth_users ALTER COLUMN password DROP NOT NULL;
