-- System-level administrator flag for Ombuddi staff.
-- Safe to run more than once.
--
-- After applying, promote your own account:
--
--   UPDATE ombuds SET is_system_admin = TRUE WHERE auth0_sub = 'auth0|...';

BEGIN;

ALTER TABLE ombuds
    ADD COLUMN IF NOT EXISTS is_system_admin BOOLEAN NOT NULL DEFAULT FALSE;

COMMIT;
