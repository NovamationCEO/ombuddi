-- Expand the status-only audit table into a general privileged-action log while
-- preserving every existing event. Safe to run more than once.

BEGIN;

CREATE TABLE IF NOT EXISTS administrative_events (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_ombuds_id   UUID NOT NULL REFERENCES ombuds(id) ON DELETE RESTRICT,
    organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    target_ombuds_id  UUID REFERENCES ombuds(id) ON DELETE RESTRICT,
    event_type        TEXT NOT NULL CHECK (event_type IN (
        'organization_created',
        'organization_updated',
        'organization_deactivated',
        'organization_reactivated',
        'ombuds_created',
        'ombuds_email_changed',
        'ombuds_admin_granted',
        'ombuds_admin_revoked',
        'ombuds_invitation_created',
        'ombuds_invitation_cancelled',
        'ombuds_invitation_claimed',
        'ombuds_deactivated',
        'ombuds_reactivated'
    )),
    reason            TEXT,
    details           JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT administrative_events_target_check CHECK (
        (event_type LIKE 'organization_%' AND target_ombuds_id IS NULL)
        OR (event_type LIKE 'ombuds_%' AND target_ombuds_id IS NOT NULL)
    ),
    CONSTRAINT administrative_events_reason_length_check CHECK (
        reason IS NULL OR char_length(reason) <= 1000
    )
);

DO $$
BEGIN
    IF to_regclass('public.administrative_status_events') IS NOT NULL THEN
        INSERT INTO administrative_events (
            id, actor_ombuds_id, organization_id, target_ombuds_id,
            event_type, reason, created_at
        )
        SELECT
            id, actor_ombuds_id, organization_id, target_ombuds_id,
            event_type, reason, created_at
        FROM administrative_status_events
        ON CONFLICT (id) DO NOTHING;

        DROP TABLE administrative_status_events;
    END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS administrative_events_organization_idx
    ON administrative_events (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS administrative_events_target_ombuds_idx
    ON administrative_events (target_ombuds_id, created_at DESC)
    WHERE target_ombuds_id IS NOT NULL;

CREATE OR REPLACE FUNCTION prevent_administrative_event_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'administrative events are immutable';
END;
$$;

DROP TRIGGER IF EXISTS administrative_events_immutable ON administrative_events;
CREATE TRIGGER administrative_events_immutable
BEFORE UPDATE OR DELETE ON administrative_events
FOR EACH ROW EXECUTE FUNCTION prevent_administrative_event_changes();

DROP FUNCTION IF EXISTS prevent_administrative_status_event_changes();

COMMIT;
