-- debug_whoami() was a temporary diagnostic added in 20260805030000 to
-- root-cause the is_admin() allowlist mismatch. That's now confirmed fixed
-- (is_admin() correctly returns true for the seeded admin), so this drops
-- the diagnostic rather than leaving an unnecessary RPC exposed permanently.
DROP FUNCTION IF EXISTS debug_whoami();
