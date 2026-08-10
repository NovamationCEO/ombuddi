-- Ombuddi — source-of-truth DDL.
--
-- This file captures the current intended shape of every table. It is
-- canonical: when a column changes, change it here first, then in code.
--
-- For now there is no migration tooling. To rebuild a dev DB from service/:
--   docker compose stop app
--   set -a; source .env; set +a
--   docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" \
--       -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
--   docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" < schema.sql
--   docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" < seed_dev.sql
--   docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" < seed_demo.sql
--   python seed_demo.py | docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME"
--   docker compose start app
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
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name              TEXT NOT NULL,
    subscription_tier TEXT NOT NULL DEFAULT 'alpha',
    seat_limit        INT  NOT NULL DEFAULT 10
);


-- =====================================================================
-- ombuds
-- =====================================================================
-- One row per ombuds seat at an organization.
CREATE TABLE ombuds (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Auth0's external user identifier (the JWT `sub` claim). This is not a
    -- local primary key: entries and other relationships continue to use id.
    -- NULL supports provisioning a seat before its Auth0 account is linked;
    -- UNIQUE allows at most one Ombuddi seat per Auth0 identity.
    auth0_sub         TEXT UNIQUE,
    email             TEXT,
    is_admin          BOOLEAN NOT NULL DEFAULT FALSE,
    is_system_admin   BOOLEAN NOT NULL DEFAULT FALSE,
    name              TEXT NOT NULL,
    organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT
);

CREATE INDEX ombuds_organization_id_idx ON ombuds (organization_id);
CREATE UNIQUE INDEX ombuds_id_organization_id_uidx
    ON ombuds (id, organization_id);
CREATE UNIQUE INDEX ombuds_organization_email_idx
    ON ombuds (organization_id, lower(email))
    WHERE email IS NOT NULL;


-- =====================================================================
-- ombuds_invitations
-- =====================================================================
-- Raw invitation tokens are shown once and never stored. Only their SHA-256
-- hashes live in the database. A seat may be re-invited; older active links
-- are revoked when a new invitation is issued.
CREATE TABLE ombuds_invitations (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ombuds_id             UUID NOT NULL REFERENCES ombuds(id) ON DELETE CASCADE,
    token_hash            TEXT NOT NULL UNIQUE CHECK (length(token_hash) = 64),
    created_by_ombuds_id  UUID NOT NULL REFERENCES ombuds(id) ON DELETE RESTRICT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at            TIMESTAMPTZ NOT NULL,
    claimed_at            TIMESTAMPTZ,
    claimed_by_auth0_sub  TEXT,
    revoked_at            TIMESTAMPTZ
);

CREATE INDEX ombuds_invitations_ombuds_id_idx
    ON ombuds_invitations (ombuds_id);
CREATE INDEX ombuds_invitations_active_idx
    ON ombuds_invitations (token_hash)
    WHERE claimed_at IS NULL AND revoked_at IS NULL;


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
CREATE UNIQUE INDEX code_categories_id_organization_id_uidx
    ON code_categories (id, organization_id);


-- =====================================================================
-- codes
-- =====================================================================
CREATE TABLE codes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    category_id     UUID NOT NULL,
    code            TEXT NOT NULL,
    description     TEXT NOT NULL DEFAULT '',
    soft_delete     BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT codes_category_organization_fk
        FOREIGN KEY (category_id, organization_id)
        REFERENCES code_categories (id, organization_id)
        ON DELETE CASCADE
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
-- picklists
-- =====================================================================
-- Generic key-by-kind store for every org-customizable single-select list:
-- entry mediums, entry priorities, ombuds-action tags, referral sources,
-- case-related contacts, risk levels, etc.
--
-- A single TEXT column on each entry / case / person stores the chosen
-- picklist row's `name` directly (e.g. entries.medium = 'In Person'). This
-- means renaming a row affects future selections only; historic data keeps
-- the prior label. That's a deliberate trade-off — see docs/LESSONS.md.
--
-- `primary_roles` is structurally identical and could be folded into this
-- table eventually; for now it stays separate to avoid churn during the
-- pre-auth lift.
CREATE TABLE picklists (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    kind            TEXT NOT NULL,
    name            TEXT NOT NULL,
    description     TEXT NOT NULL DEFAULT '',
    index           INT NOT NULL DEFAULT 0,
    soft_delete     BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX picklists_org_kind_idx ON picklists (organization_id, kind);

-- Partial unique: prevents two *active* picklist rows with the same name
-- inside the same org+kind. Soft-deleted rows still hold their slot in
-- history but don't block re-creating a name later (after the soft-delete
-- is reversed or after enough drift). Also lets the dev seed use ON CONFLICT.
CREATE UNIQUE INDEX picklists_active_unique_idx
    ON picklists (organization_id, kind, name)
    WHERE soft_delete = FALSE;


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
CREATE UNIQUE INDEX cases_id_organization_id_uidx
    ON cases (id, organization_id);

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
-- Composite foreign keys below enforce that the case, ombuds, and entry all
-- carry the same organization_id; application checks provide friendly 404s.
CREATE TABLE entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id         UUID NOT NULL,
    ombuds_id       UUID NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    medium          TEXT NOT NULL DEFAULT 'inPerson',
    duration        INT  NOT NULL DEFAULT 0,         -- minutes
    notes           TEXT NOT NULL DEFAULT '',
    CONSTRAINT entries_case_organization_fk
        FOREIGN KEY (case_id, organization_id)
        REFERENCES cases (id, organization_id)
        ON DELETE CASCADE,
    CONSTRAINT entries_ombuds_organization_fk
        FOREIGN KEY (ombuds_id, organization_id)
        REFERENCES ombuds (id, organization_id)
        ON DELETE RESTRICT
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
    hashed_name      TEXT,           -- NULL for public persons; NOT NULL for private visitors
    public_name      TEXT,           -- plaintext name, populated only when is_public = TRUE
    is_public        BOOLEAN NOT NULL DEFAULT FALSE,
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

-- A join row must never connect an entry from one organization to a person
-- from another.  The join table intentionally remains minimal; this trigger
-- enforces the invariant without duplicating organization_id on every row.
CREATE OR REPLACE FUNCTION enforce_entry_person_organization()
RETURNS TRIGGER AS $$
DECLARE
    entry_org  UUID;
    person_org UUID;
BEGIN
    SELECT organization_id INTO entry_org FROM entries WHERE id = NEW.entry_id;
    SELECT organization_id INTO person_org FROM persons WHERE id = NEW.person_id;

    IF entry_org IS NULL OR person_org IS NULL OR entry_org IS DISTINCT FROM person_org THEN
        RAISE EXCEPTION 'entry and person must belong to the same organization'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER entry_person_same_organization
    BEFORE INSERT OR UPDATE ON entry_person
    FOR EACH ROW EXECUTE FUNCTION enforce_entry_person_organization();


-- =====================================================================
-- No "IOA organization" row is seeded here.
-- =====================================================================
-- IOA reporting categories and codes are application-level reference data,
-- not DB rows. They live in web/src/constants/ioaConstants.ts and are
-- resolved client-side. See docs/CONTEXT.md "Settled decisions" for why.
