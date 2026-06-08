-- Ombuddi — source-of-truth DDL.
--
-- This file captures the current intended shape of every table. It is
-- canonical: when a column changes, change it here first, then in code.
--
-- For now there is no migration tooling. To rebuild a dev DB:
--   docker compose down -v
--   docker compose up -d db
--   docker exec -i $(docker compose ps -q db) psql -U "$DB_USER" -d "$DB_NAME" < service/schema.sql
--
-- IOA reference codes and categories are NOT seeded to the database; they
-- live in web/src/constants/ioaConstants.ts and are loaded at runtime.
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
-- `organization_id` is the canonical ownership column. Today the API does
-- not enforce that the caller's principal matches it; enforcement lands
-- with Phase 4 auth (see docs/MULTI_TENANCY.md). The column exists now so
-- that landing is a small change.
CREATE TABLE cases (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    description     TEXT NOT NULL DEFAULT '',
    codes           UUID[] NOT NULL DEFAULT '{}',   -- references codes.id; not enforced by FK because arrays
    status          TEXT NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX cases_organization_id_idx ON cases (organization_id);

CREATE TRIGGER cases_set_updated_at
    BEFORE UPDATE ON cases
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =====================================================================
-- entries
-- =====================================================================
-- The unit of work. One meeting, phone call, email, etc. attached to
-- exactly one case (the "catch-all" case exists per ombuds for entries
-- without a real case home).
--
-- `organization_id` is denormalized: it can be derived via
-- entries.case_id → cases.organization_id, but storing it directly lets
-- every query AND in an org filter without a join. utils.py's generic
-- CRUD helpers don't support joins; the redundancy is worth it.
-- Enforce consistency in application code (and eventually a CHECK trigger
-- if we ever see drift).
CREATE TABLE entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id         UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    ombuds_id       UUID NOT NULL REFERENCES ombuds(id) ON DELETE RESTRICT,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    medium          TEXT NOT NULL DEFAULT 'inPerson',
    duration        INT  NOT NULL DEFAULT 0,         -- minutes
    notes           TEXT NOT NULL DEFAULT '',
    -- Per-entry tags. Issue-level tagging happens on cases.codes; this column
    -- is for action-level tagging on the individual meeting (e.g. "intake",
    -- "policy clarification", "mediation"). Same UUID array shape as cases.codes
    -- and the same CodeChip / CodeSetterBox plumbing on the frontend.
    codes           UUID[] NOT NULL DEFAULT '{}'
);

CREATE INDEX entries_case_id_idx         ON entries (case_id);
CREATE INDEX entries_ombuds_id_idx       ON entries (ombuds_id);
CREATE INDEX entries_organization_id_idx ON entries (organization_id);


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
-- No "IOA organization" row is seeded here.
-- =====================================================================
-- IOA reporting categories and codes are application-level reference data,
-- not DB rows. They live in web/src/constants/ioaConstants.ts and are
-- resolved client-side. See docs/CONTEXT.md "Settled decisions" for why.
