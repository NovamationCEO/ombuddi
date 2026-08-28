-- Ensure every existing organization has the two application-managed
-- referral options. Safe to run repeatedly.

BEGIN;

INSERT INTO picklists (
    organization_id, kind, name, description, index, soft_delete, behavior
)
SELECT
    organization.id,
    'referral_source',
    defaults.name,
    '',
    defaults.index,
    FALSE,
    defaults.behavior
FROM organizations AS organization
CROSS JOIN (VALUES
    ('Other (please specify)', 10000, 'other_detail'),
    ('Unknown', 10001, 'exclusive')
) AS defaults(name, index, behavior)
ON CONFLICT (organization_id, kind, name) WHERE soft_delete = FALSE
DO UPDATE SET
    behavior = EXCLUDED.behavior,
    index = EXCLUDED.index
WHERE picklists.behavior IS DISTINCT FROM EXCLUDED.behavior
   OR picklists.index IS DISTINCT FROM EXCLUDED.index;

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
    ON CONFLICT (organization_id, kind, name) WHERE soft_delete = FALSE
    DO UPDATE SET
        behavior = EXCLUDED.behavior,
        index = EXCLUDED.index;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS organizations_seed_universal_referral_sources ON organizations;
CREATE TRIGGER organizations_seed_universal_referral_sources
AFTER INSERT ON organizations
FOR EACH ROW EXECUTE FUNCTION seed_universal_referral_sources();

COMMIT;
