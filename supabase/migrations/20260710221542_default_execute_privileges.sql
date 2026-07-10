-- The previous migration used ALTER DEFAULT PRIVILEGES ... IN SCHEMA public, which is
-- additive-only in PostgreSQL and cannot remove the built-in PUBLIC execute default.
-- Only a global default-privileges entry overrides the built-in default, so future
-- functions created by postgres are not PUBLIC-executable. New RPCs must ship an
-- explicit GRANT EXECUTE to the roles that call them.
alter default privileges for role postgres revoke execute on functions from public;
