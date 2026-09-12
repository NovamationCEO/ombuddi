-- Give every person a stable, random, non-identifying seed for their local
-- procedural monster portrait. The seed is deliberately independent of the
-- person's name, lookup phrase, demographics, organization, and Auth0 user.

BEGIN;

ALTER TABLE persons
    ADD COLUMN IF NOT EXISTS monster_seed UUID,
    ADD COLUMN IF NOT EXISTS monster_version SMALLINT NOT NULL DEFAULT 1;

UPDATE persons
SET monster_seed = gen_random_uuid()
WHERE monster_seed IS NULL;

ALTER TABLE persons
    ALTER COLUMN monster_seed SET DEFAULT gen_random_uuid(),
    ALTER COLUMN monster_seed SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS persons_monster_seed_uidx
    ON persons (monster_seed);

COMMIT;
