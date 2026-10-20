-- Runs only when the Postgres volume is initialised for the first time.
-- On an existing volume apply it once by hand:
--   docker compose exec -T db psql -U ads_manager -d ads_manager < docker/postgres/init/01-sandbox-ads-provider.sql

-- Database of the simulated ad network (sandbox-ads-provider). CREATEDB lets `prisma migrate dev` make its shadow database.
CREATE ROLE ads_sandbox WITH LOGIN CREATEDB PASSWORD 'ads_sandbox';
CREATE DATABASE ads_sandbox OWNER ads_sandbox;
