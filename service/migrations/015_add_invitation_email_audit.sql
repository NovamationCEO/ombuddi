-- Expand accepted audit types without changing existing immutable events.
BEGIN;
ALTER TABLE administrative_events
    DROP CONSTRAINT administrative_events_event_type_check;
ALTER TABLE administrative_events
    ADD CONSTRAINT administrative_events_event_type_check CHECK (event_type IN (
        'organization_created',
        'organization_updated',
        'organization_deactivated',
        'organization_reactivated',
        'ombuds_created',
        'ombuds_email_changed',
        'ombuds_admin_granted',
        'ombuds_admin_revoked',
        'ombuds_invitation_created',
        'ombuds_invitation_email',
        'ombuds_invitation_cancelled',
        'ombuds_invitation_claimed',
        'ombuds_deactivated',
        'ombuds_reactivated'

    ));
COMMIT;
