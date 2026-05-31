-- Ombuddi — source-of-truth DDL.
--
-- This file captures the current intended shape of every table. It is
-- canonical: when a column changes, change it here first, then in code.
--
-- For now there is no migration tooling. To rebuild a dev DB:
--   docker compose down -v
--   docker compose up -d db
--   docker exec -i $(docker compose ps -q db) psql -U "$DB_USER" -d "$DB_NAME" < service/schema.sql
--   python service/scripts/seed_ioa.py | docker compose exec -T db \
--     psql -U "$DB_USER" -d "$DB_NAME"
--
-- Pre-production: feel free to drop and recreate. See docs/CONTEXT.md
-- "Guiding principles" — backwards compatibility is not a concern yet.

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- for gen_random_uuid()


-- =====================================================================
-- Reusable updated_at trigger
-- =====================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =====================================================================
-- organizations
-- =====================================================================
-- Org `name` is decorative (CONTEXT.md "Settled decisions"). All hashing,
-- ownership, and lookup keys off `id`. Names may change freely.
CREATE TABLE organizations (
    id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL
);


-- =====================================================================
-- ombuds
-- =====================================================================
-- One row per ombuds seat at an organization.
CREATE TABLE ombuds (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT
);

CREATE INDEX ombuds_organization_id_idx ON ombuds (organization_id);


-- =====================================================================
-- code_categories
-- =====================================================================
-- Customizable per organization. The IOA "organization" holds the nine
-- standard reporting categories so they appear alongside an org's own.
CREATE TABLE code_categories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    index           INT NOT NULL DEFAULT 0,
    soft_delete     BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX code_categories_organization_id_idx ON code_categories (organization_id);


-- =====================================================================
-- codes
-- =====================================================================
CREATE TABLE codes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    category_id     UUID NOT NULL REFERENCES code_categories(id) ON DELETE CASCADE,
    code            TEXT NOT NULL,
    description     TEXT NOT NULL DEFAULT '',
    soft_delete     BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX codes_organization_id_idx ON codes (organization_id);
CREATE INDEX codes_category_id_idx     ON codes (category_id);


-- =====================================================================
-- primary_roles
-- =====================================================================
-- Org-customizable list of "primary role" values for persons. The hard-coded
-- list in AddPerson.tsx will eventually be replaced by FK lookups here.
CREATE TABLE primary_roles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    index           INT NOT NULL DEFAULT 0,
    soft_delete     BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX primary_roles_organization_id_idx ON primary_roles (organization_id);


-- =====================================================================
-- cases
-- =====================================================================
-- A case bundles related entries about the same issue or people. Tagged
-- with one or more code ids (UUID[]). Status is currently a free TEXT
-- field ('active', etc.); could become an enum later.
--
-- NOTE: `organization_id` is intentionally absent in the current DB but
-- will be added in Phase 0 Tier 5 (multi-tenancy) — see ROADMAP.md. Once
-- added, `get_all_cases` filters on it.
CREATE TABLE cases (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    codes       UUID[] NOT NULL DEFAULT '{}',   -- references codes.id; not enforced by FK because arrays
    status      TEXT NOT NULL DEFAULT 'active',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER cases_set_updated_at
    BEFORE UPDATE ON cases
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =====================================================================
-- entries
-- =====================================================================
-- The unit of work. One meeting, phone call, email, etc. attached to
-- exactly one case (the "catch-all" case exists per ombuds for entries
-- without a real case home).
CREATE TABLE entries (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id   UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    ombuds_id UUID NOT NULL REFERENCES ombuds(id) ON DELETE RESTRICT,
    date      DATE NOT NULL,
    medium    TEXT NOT NULL DEFAULT 'inPerson',
    duration  INT  NOT NULL DEFAULT 0,         -- minutes
    notes     TEXT NOT NULL DEFAULT ''
);

CREATE INDEX entries_case_id_idx   ON entries (case_id);
CREATE INDEX entries_ombuds_id_idx ON entries (ombuds_id);


-- =====================================================================
-- persons
-- =====================================================================
-- Visitors (and optionally public persons in a later phase). Identity is
-- not stored — `hashed_name` is the result of:
--   sha256( sha256(name + salt + organization.id).norm() + NAME_SALT_env )
-- so a row can only be found by an ombuds who re-enters the exact name
-- and salt phrase under the right org.
CREATE TABLE persons (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hashed_name      TEXT NOT NULL,
    gender           TEXT,
    generation       TEXT,
    race             TEXT,
    primary_role     TEXT,                                 -- TODO: FK to primary_roles.id
    is_international BOOLEAN NOT NULL DEFAULT FALSE,
    category_1       TEXT,
    category_2       TEXT,
    category_3       TEXT,
    organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX persons_hashed_name_idx     ON persons (hashed_name);
CREATE INDEX persons_organization_id_idx ON persons (organization_id);


-- =====================================================================
-- entry_person  (join table)
-- =====================================================================
CREATE TABLE entry_person (
    entry_id  UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    PRIMARY KEY (entry_id, person_id)
);

CREATE INDEX entry_person_person_id_idx ON entry_person (person_id);


-- =====================================================================
-- Seed: the IOA organization and reporting categories
-- =====================================================================
-- The IOA org id is referenced by the frontend at web/src/tools/useIoaOrgId.ts.
-- Keep this UUID stable.
INSERT INTO organizations (id, name) VALUES
  ('628b5737-43e6-49c7-a632-2f723a455e59', 'International Ombuds Association')
ON CONFLICT (id) DO NOTHING;

-- Code categories and codes for the IOA org are emitted by
-- service/scripts/seed_ioa.py, which reads web/src/constants/ioaConstants.ts
-- so the frontend display and the DB seed stay in lockstep. Run that script
-- after applying this schema (see header for the exact command).
