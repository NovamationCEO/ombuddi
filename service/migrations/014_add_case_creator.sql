-- Record who opened each standard case so ombuds-level reports can distinguish
-- case creation from organization-wide case activity. Historical cases use the
-- author of their earliest dated entry when one is available.

BEGIN;

ALTER TABLE cases
    ADD COLUMN IF NOT EXISTS created_by_ombuds_id UUID;

UPDATE cases AS c
SET created_by_ombuds_id = first_entry.ombuds_id
FROM (
    SELECT DISTINCT ON (case_id)
        case_id,
        ombuds_id
    FROM entries
    ORDER BY case_id, date, id
) AS first_entry
WHERE c.id = first_entry.case_id
  AND c.created_by_ombuds_id IS NULL;

UPDATE cases
SET created_by_ombuds_id = owner_ombuds_id
WHERE case_kind = 'general'
  AND created_by_ombuds_id IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'cases'::regclass
          AND conname = 'cases_creator_ombuds_organization_fk'
    ) THEN
        ALTER TABLE cases
            ADD CONSTRAINT cases_creator_ombuds_organization_fk
            FOREIGN KEY (created_by_ombuds_id, organization_id)
            REFERENCES ombuds (id, organization_id)
            ON DELETE RESTRICT;
    END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS cases_created_by_ombuds_idx
    ON cases (created_by_ombuds_id);

COMMIT;
