"""Persist attempt and outcome independently of the invitation transaction."""
import logging
from admin_audit import record_administrative_event
from invitation_email import deliver_invitation as send_email, SENDER

logger = logging.getLogger(__name__)


def deliver_invitation(recipient, invite_url, expires_at, *, conn,
                       invitation_id, organization_id, actor_ombuds_id, target_ombuds_id):
    def record(status):
        with conn.cursor() as cur:
            record_administrative_event(
                cur, actor_ombuds_id=actor_ombuds_id, organization_id=organization_id,
                target_ombuds_id=target_ombuds_id,
                event_type='ombuds_invitation_email',
                details={'invitationId': str(invitation_id), **status},
            )
        conn.commit()

    def rollback_audit():
        try:
            conn.rollback()
        except Exception:
            logger.warning('Invitation email audit connection unavailable')

    try:
        record({'sender': SENDER, 'status': 'started'})
    except Exception:
        rollback_audit()
        logger.warning('Invitation email attempt audit could not be saved; submission skipped')
        return {'sender': SENDER, 'status': 'failed', 'message':
                'Email was not sent because its audit record could not be saved. The invitation link remains valid.'}
    result = send_email(recipient, invite_url, expires_at)
    try:
        record(result)
    except Exception:
        rollback_audit()
        logger.warning('Invitation email outcome audit could not be saved')
        result = {**result, 'auditWarning':
                  'The final email status could not be saved. Check Microsoft message trace; do not assume sending failed.'}
    return result
