-- Let each Ombuddi user choose how person identity markers are presented.
-- This affects only their display; every style consumes the same stable seed.

BEGIN;

ALTER TABLE ombuds
    ADD COLUMN IF NOT EXISTS person_avatar_style TEXT NOT NULL DEFAULT 'monster';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'ombuds'::regclass
          AND conname = 'ombuds_person_avatar_style_check'
    ) THEN
        ALTER TABLE ombuds
            ADD CONSTRAINT ombuds_person_avatar_style_check
            CHECK (person_avatar_style IN ('monster', 'geometric'));
    END IF;
END;
$$;

COMMIT;
