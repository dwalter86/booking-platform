-- Role, database and grant setup for booking_platform.
-- Captured from the sandbox DB Pi (PostgreSQL 17) on 2026-10-23.
-- schema.sql is dumped --no-owner --no-privileges, so this file carries
-- everything a schema-only dump cannot: role, database, schema ownership,
-- and explicit grants.
--
-- Usage (as postgres superuser), with the real password from backend/.env:
--   psql -v booking_app_password='<DB_PASSWORD from backend/.env>' -f roles-grants.sql
--   psql -d booking_platform -U booking_app -f schema.sql
--
-- pg_hba.conf needs a line allowing the app server to connect, e.g.:
--   host    booking_platform    booking_app    <app-server-ip>/32    scram-sha-256
-- (sandbox value was 192.168.0.72/32)

CREATE ROLE booking_app;
ALTER ROLE booking_app WITH NOSUPERUSER INHERIT NOCREATEROLE NOCREATEDB LOGIN NOREPLICATION NOBYPASSRLS PASSWORD :'booking_app_password';

CREATE DATABASE booking_platform ENCODING 'UTF8' LC_COLLATE 'C.UTF-8' LC_CTYPE 'C.UTF-8' TEMPLATE template0;

\connect booking_platform

-- booking_app owns the app schema and (on the sandbox) all tables except
-- public.booking_drafts, which is owned by postgres and granted instead.
-- Running schema.sql as booking_app reproduces that ownership; the grant
-- below is then redundant but harmless.
CREATE SCHEMA app AUTHORIZATION booking_app;
GRANT ALL ON SCHEMA public TO booking_app;

-- Explicit grants present on the sandbox:
-- GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.booking_drafts TO booking_app;
