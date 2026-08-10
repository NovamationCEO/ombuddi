-- Bind each active invitation to a normalized target email. Existing active
-- invitations without a usable seat email are revoked and must be reissued.
-- Safe to run more than once.

BEGIN;

ALTER TABLE ombuds_invitations
    ADD COLUMN IF NOT EXISTS invited_email TEXT,
    ADD COLUMN IF NOT EXISTS claimed_by_email TEXT;

-- Preserve usable targets for existing invitations where possible.
UPDATE ombuds_invitations invitation
SET invited_email = lower(btrim(ombuds.email))
FROM ombuds
WHERE invitation.ombuds_id = ombuds.id
  AND invitation.invited_email IS NULL
  AND length(btrim(ombuds.email)) BETWEEN 3 AND 254
  AND btrim(ombuds.email) ~ '^[^[:space:]@]+@[^[:space:]@]+$';

-- Fail closed: a bearer-only invitation must no longer remain claimable.
UPDATE ombuds_invitations
SET revoked_at = now()
WHERE invited_email IS NULL
  AND claimed_at IS NULL
  AND revoked_at IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'ombuds_invitations'::regclass
          AND conname = 'ombuds_invitations_email_format_check'
    ) THEN
        ALTER TABLE ombuds_invitations
            ADD CONSTRAINT ombuds_invitations_email_format_check CHECK (
                (
                    invited_email IS NULL
                    OR (
                        invited_email = lower(btrim(invited_email))
                        AND length(invited_email) BETWEEN 3 AND 254
                        AND invited_email ~ '^[^[:space:]@]+@[^[:space:]@]+$'
                    )
                )
                AND (
                    claimed_by_email IS NULL
                    OR (
                        claimed_by_email = lower(btrim(claimed_by_email))
                        AND length(claimed_by_email) BETWEEN 3 AND 254
                        AND claimed_by_email ~ '^[^[:space:]@]+@[^[:space:]@]+$'
                    )
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'ombuds_invitations'::regclass
          AND conname = 'ombuds_invitations_active_email_check'
    ) THEN
        ALTER TABLE ombuds_invitations
            ADD CONSTRAINT ombuds_invitations_active_email_check CHECK (
                invited_email IS NOT NULL
                OR claimed_at IS NOT NULL
                OR revoked_at IS NOT NULL
            );
    END IF;
END;
$$;

COMMIT;
