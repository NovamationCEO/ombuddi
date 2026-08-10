-- Prevent tenant-owned rows and relationships from crossing organization
-- boundaries. Safe to run more than once.

BEGIN;

-- Refuse to install the constraints over already-inconsistent data. This keeps
-- a deployment from silently blessing a pre-existing cross-tenant reference.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM entries e
        JOIN cases c ON c.id = e.case_id
        WHERE e.organization_id IS DISTINCT FROM c.organization_id
    ) THEN
        RAISE EXCEPTION 'entries contain case references from another organization';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM entries e
        JOIN ombuds o ON o.id = e.ombuds_id
        WHERE e.organization_id IS DISTINCT FROM o.organization_id
    ) THEN
        RAISE EXCEPTION 'entries contain ombuds references from another organization';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM codes c
        JOIN code_categories cc ON cc.id = c.category_id
        WHERE c.organization_id IS DISTINCT FROM cc.organization_id
    ) THEN
        RAISE EXCEPTION 'codes contain category references from another organization';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM entry_person ep
        JOIN entries e ON e.id = ep.entry_id
        JOIN persons p ON p.id = ep.person_id
        WHERE e.organization_id IS DISTINCT FROM p.organization_id
    ) THEN
        RAISE EXCEPTION 'entry_person contains cross-organization relationships';
    END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS ombuds_id_organization_id_uidx
    ON ombuds (id, organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS code_categories_id_organization_id_uidx
    ON code_categories (id, organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS cases_id_organization_id_uidx
    ON cases (id, organization_id);

-- Replace single-column foreign keys with composite tenant-aware keys.
ALTER TABLE codes DROP CONSTRAINT IF EXISTS codes_category_id_fkey;
ALTER TABLE entries DROP CONSTRAINT IF EXISTS entries_case_id_fkey;
ALTER TABLE entries DROP CONSTRAINT IF EXISTS entries_ombuds_id_fkey;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'codes'::regclass
          AND conname = 'codes_category_organization_fk'
    ) THEN
        ALTER TABLE codes
            ADD CONSTRAINT codes_category_organization_fk
            FOREIGN KEY (category_id, organization_id)
            REFERENCES code_categories (id, organization_id)
            ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'entries'::regclass
          AND conname = 'entries_case_organization_fk'
    ) THEN
        ALTER TABLE entries
            ADD CONSTRAINT entries_case_organization_fk
            FOREIGN KEY (case_id, organization_id)
            REFERENCES cases (id, organization_id)
            ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'entries'::regclass
          AND conname = 'entries_ombuds_organization_fk'
    ) THEN
        ALTER TABLE entries
            ADD CONSTRAINT entries_ombuds_organization_fk
            FOREIGN KEY (ombuds_id, organization_id)
            REFERENCES ombuds (id, organization_id)
            ON DELETE RESTRICT;
    END IF;
END;
$$;

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

DROP TRIGGER IF EXISTS entry_person_same_organization ON entry_person;
CREATE TRIGGER entry_person_same_organization
    BEFORE INSERT OR UPDATE ON entry_person
    FOR EACH ROW EXECUTE FUNCTION enforce_entry_person_organization();

COMMIT;
