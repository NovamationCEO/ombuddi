-- Preserve historical visitor counts; roles describe involvement in one entry.
BEGIN;
ALTER TABLE entry_person
    ADD COLUMN entry_role TEXT NOT NULL DEFAULT 'visitor'
    CONSTRAINT entry_person_role_check CHECK (
        entry_role IN ('visitor', 'referenced', 'consulted', 'support_person', 'participant', 'other')
    );
COMMIT;
