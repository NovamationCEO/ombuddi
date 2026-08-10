-- Add the Auth0 subject as an external identity alongside the existing local
-- UUID primary key. Safe to run more than once.
--
-- After applying this migration, link each existing ombuds row explicitly:
--
--   UPDATE ombuds
--   SET auth0_sub = 'auth0|example'
--   WHERE id = '00000000-0000-0000-0000-000000000000';
--
-- The application rejects authenticated users whose subject is not linked.

BEGIN;

ALTER TABLE ombuds
    ADD COLUMN IF NOT EXISTS auth0_sub TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS ombuds_auth0_sub_idx
    ON ombuds (auth0_sub)
    WHERE auth0_sub IS NOT NULL;

COMMIT;
