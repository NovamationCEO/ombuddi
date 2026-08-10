-- Admin-managed Ombuddi seats and one-time account invitations.
-- Safe to run more than once.

BEGIN;

ALTER TABLE ombuds
    ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE ombuds
    ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS ombuds_organization_email_idx
    ON ombuds (organization_id, lower(email))
    WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS ombuds_invitations (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ombuds_id             UUID NOT NULL REFERENCES ombuds(id) ON DELETE CASCADE,
    token_hash            TEXT NOT NULL UNIQUE CHECK (length(token_hash) = 64),
    created_by_ombuds_id  UUID NOT NULL REFERENCES ombuds(id) ON DELETE RESTRICT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at            TIMESTAMPTZ NOT NULL,
    claimed_at            TIMESTAMPTZ,
    claimed_by_auth0_sub  TEXT,
    revoked_at            TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ombuds_invitations_ombuds_id_idx
    ON ombuds_invitations (ombuds_id);

CREATE INDEX IF NOT EXISTS ombuds_invitations_active_idx
    ON ombuds_invitations (token_hash)
    WHERE claimed_at IS NULL AND revoked_at IS NULL;

COMMIT;

-- Bootstrap the first administrator separately after this migration:
--
-- UPDATE ombuds
-- SET is_admin = TRUE
-- WHERE auth0_sub = 'auth0|...';
