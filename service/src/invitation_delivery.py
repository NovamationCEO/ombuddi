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
                details={'invitationId': str(invitation_id), **{
                    key: value for key, value in status.items()
                    if key in {'sender', 'status', 'reason', 'stage', 'httpStatus', 'submissionAttempts'}
                }},
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
        return {'sender': SENDER, 'status': 'failed', 'reason': 'audit_unavailable'}
    result = send_email(recipient, invite_url, expires_at)
    try:
        record(result)
    except Exception:
        rollback_audit()
        logger.warning('Invitation email outcome audit could not be saved')
        result = {**result, 'auditWarning': 'outcome_not_saved'}
    return result
