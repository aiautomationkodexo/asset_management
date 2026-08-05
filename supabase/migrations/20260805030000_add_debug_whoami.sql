-- Temporary diagnostic RPC for the "DB says true, frontend says false" bug.
-- Returns exactly what Postgres sees for the calling request's JWT, so we
-- can compare it against the actual admin row instead of assuming the two
-- match. Safe to drop once the bug is found (see matching frontend
-- instrumentation in AuthContext.tsx).
CREATE OR REPLACE FUNCTION debug_whoami() RETURNS jsonb AS $$
BEGIN
    RETURN jsonb_build_object(
        'jwt_email', auth.jwt() ->> 'email',
        'jwt_role', auth.jwt() ->> 'role',
        'jwt_sub', auth.jwt() ->> 'sub',
        'is_admin_result', is_admin()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
