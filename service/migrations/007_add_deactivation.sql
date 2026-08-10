-- Reversible organization and Ombuddi-seat deactivation with an immutable
-- administrative audit trail. Safe to run more than once.

BEGIN;

ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;

ALTER TABLE ombuds
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;

-- Repair any partial/manual status changes before adding consistency checks.
UPDATE organizations
SET deactivated_at = now()
WHERE is_active = FALSE AND deactivated_at IS NULL;

UPDATE organizations
SET deactivated_at = NULL
WHERE is_active = TRUE AND deactivated_at IS NOT NULL;

UPDATE ombuds
SET deactivated_at = now()
WHERE is_active = FALSE AND deactivated_at IS NULL;

UPDATE ombuds
SET deactivated_at = NULL
WHERE is_active = TRUE AND deactivated_at IS NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'organizations'::regclass
          AND conname = 'organizations_positive_seat_limit_check'
    ) THEN
        ALTER TABLE organizations
            ADD CONSTRAINT organizations_positive_seat_limit_check
            CHECK (seat_limit >= 1);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'organizations'::regclass
          AND conname = 'organizations_active_timestamp_check'
    ) THEN
        ALTER TABLE organizations
            ADD CONSTRAINT organizations_active_timestamp_check CHECK (
                (is_active AND deactivated_at IS NULL)
                OR (NOT is_active AND deactivated_at IS NOT NULL)
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'ombuds'::regclass
          AND conname = 'ombuds_active_timestamp_check'
    ) THEN
        ALTER TABLE ombuds
            ADD CONSTRAINT ombuds_active_timestamp_check CHECK (
                (is_active AND deactivated_at IS NULL)
                OR (NOT is_active AND deactivated_at IS NOT NULL)
            );
    END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS administrative_status_events (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_ombuds_id   UUID NOT NULL REFERENCES ombuds(id) ON DELETE RESTRICT,
    organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    target_ombuds_id  UUID REFERENCES ombuds(id) ON DELETE RESTRICT,
    event_type        TEXT NOT NULL CHECK (event_type IN (
        'organization_deactivated',
        'organization_reactivated',
        'ombuds_deactivated',
        'ombuds_reactivated'
    )),
    reason            TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT administrative_status_events_target_check CHECK (
        (event_type LIKE 'organization_%' AND target_ombuds_id IS NULL)
        OR (event_type LIKE 'ombuds_%' AND target_ombuds_id IS NOT NULL)
    ),
    CONSTRAINT administrative_status_events_reason_length_check CHECK (
        reason IS NULL OR char_length(reason) <= 1000
    )
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'administrative_status_events'::regclass
          AND conname = 'administrative_status_events_reason_length_check'
    ) THEN
        ALTER TABLE administrative_status_events
            ADD CONSTRAINT administrative_status_events_reason_length_check CHECK (
                reason IS NULL OR char_length(reason) <= 1000
            );
    END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS administrative_status_events_organization_idx
    ON administrative_status_events (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS administrative_status_events_target_ombuds_idx
    ON administrative_status_events (target_ombuds_id, created_at DESC)
    WHERE target_ombuds_id IS NOT NULL;

CREATE OR REPLACE FUNCTION prevent_administrative_status_event_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'administrative status events are immutable';
END;
$$;

DROP TRIGGER IF EXISTS administrative_status_events_immutable
    ON administrative_status_events;
CREATE TRIGGER administrative_status_events_immutable
BEFORE UPDATE OR DELETE ON administrative_status_events
FOR EACH ROW EXECUTE FUNCTION prevent_administrative_status_event_changes();

COMMIT;
