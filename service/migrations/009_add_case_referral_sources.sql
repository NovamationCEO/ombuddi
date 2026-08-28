-- Persist organization-defined referral sources on cases. Safe to run more
-- than once and preserves every existing case.

BEGIN;

ALTER TABLE picklists
    ADD COLUMN IF NOT EXISTS behavior TEXT NOT NULL DEFAULT 'standard';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'picklists'::regclass
          AND conname = 'picklists_behavior_check'
    ) THEN
        ALTER TABLE picklists
            ADD CONSTRAINT picklists_behavior_check
            CHECK (behavior IN ('standard', 'other_detail', 'exclusive'));
    END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS picklists_id_organization_id_uidx
    ON picklists (id, organization_id);

CREATE TABLE IF NOT EXISTS case_referral_sources (
    case_id             UUID NOT NULL,
    organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    referral_source_id  UUID NOT NULL,
    detail              TEXT,
    PRIMARY KEY (case_id, referral_source_id),
    CONSTRAINT case_referral_sources_case_organization_fk
        FOREIGN KEY (case_id, organization_id)
        REFERENCES cases (id, organization_id)
        ON DELETE CASCADE,
    CONSTRAINT case_referral_sources_picklist_organization_fk
        FOREIGN KEY (referral_source_id, organization_id)
        REFERENCES picklists (id, organization_id)
        ON DELETE RESTRICT,
    CONSTRAINT case_referral_sources_detail_length_check
        CHECK (detail IS NULL OR char_length(detail) <= 250)
);

CREATE INDEX IF NOT EXISTS case_referral_sources_organization_idx
    ON case_referral_sources (organization_id);
CREATE INDEX IF NOT EXISTS case_referral_sources_source_idx
    ON case_referral_sources (referral_source_id);

INSERT INTO picklists (organization_id, kind, name, description, index, soft_delete, behavior)
SELECT organization.id, 'referral_source', defaults.name, '', defaults.index, FALSE, defaults.behavior
FROM organizations AS organization
CROSS JOIN (VALUES
    ('Other (please specify)', 10000, 'other_detail'),
    ('Unknown', 10001, 'exclusive')
) AS defaults(name, index, behavior)
ON CONFLICT DO NOTHING;

UPDATE picklists
SET behavior = 'other_detail', index = 10000
WHERE kind = 'referral_source'
  AND lower(name) = 'other (please specify)'
  AND soft_delete = FALSE;

UPDATE picklists
SET behavior = 'exclusive', index = 10001
WHERE kind = 'referral_source'
  AND lower(name) = 'unknown'
  AND soft_delete = FALSE;

-- These two application-defined options exist for every organization and are
-- deliberately separate from its editable referral-source vocabulary.
CREATE OR REPLACE FUNCTION seed_universal_referral_sources()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO picklists (
        organization_id, kind, name, description, index, soft_delete, behavior
    ) VALUES
        (NEW.id, 'referral_source', 'Other (please specify)', '', 10000, FALSE, 'other_detail'),
        (NEW.id, 'referral_source', 'Unknown', '', 10001, FALSE, 'exclusive')
    ON CONFLICT DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS organizations_seed_universal_referral_sources ON organizations;
CREATE TRIGGER organizations_seed_universal_referral_sources
AFTER INSERT ON organizations
FOR EACH ROW EXECUTE FUNCTION seed_universal_referral_sources();

COMMIT;
