-- Add one system-managed General activity container per ombuds. Entries in
-- these containers remain part of activity reports, but the containers are
-- distinguishable from ordinary cases for case-count and code reporting.

BEGIN;

ALTER TABLE cases
    ADD COLUMN IF NOT EXISTS case_kind TEXT NOT NULL DEFAULT 'standard',
    ADD COLUMN IF NOT EXISTS owner_ombuds_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'cases'::regclass
          AND conname = 'cases_kind_owner_check'
    ) THEN
        ALTER TABLE cases
            ADD CONSTRAINT cases_kind_owner_check CHECK (
                (case_kind = 'standard' AND owner_ombuds_id IS NULL)
                OR (case_kind = 'general' AND owner_ombuds_id IS NOT NULL)
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'cases'::regclass
          AND conname = 'cases_general_codes_empty_check'
    ) THEN
        ALTER TABLE cases
            ADD CONSTRAINT cases_general_codes_empty_check CHECK (
                case_kind <> 'general' OR cardinality(codes) = 0
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'cases'::regclass
          AND conname = 'cases_owner_ombuds_organization_fk'
    ) THEN
        ALTER TABLE cases
            ADD CONSTRAINT cases_owner_ombuds_organization_fk
            FOREIGN KEY (owner_ombuds_id, organization_id)
            REFERENCES ombuds (id, organization_id)
            ON DELETE RESTRICT;
    END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS cases_general_owner_uidx
    ON cases (owner_ombuds_id)
    WHERE case_kind = 'general';

CREATE INDEX IF NOT EXISTS cases_kind_idx ON cases (case_kind);

COMMIT;
