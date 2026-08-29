import hashlib
import logging

from flask import Blueprint, g, jsonify, request

from connection import get_db_connection
from email_identity import normalize_email
from admin_audit import record_administrative_event


auth_views = Blueprint('auth_views', __name__)
logger = logging.getLogger(__name__)


def _claim_error(code, error, message, status):
    logger.warning('Invitation claim rejected code=%s status=%s', code, status)
    return jsonify({
        'error': error,
        'code': code,
        'message': message,
    }), status


@auth_views.route('/api/v1/auth/session-diagnostics')
def session_diagnostics():
    """Return safe session facts without exposing token contents or identifiers."""
    diagnostics = getattr(g, 'session_diagnostics', None)
    if diagnostics is None:
        return jsonify({
            'error': 'Unavailable',
            'message': 'Session diagnostics are unavailable',
        }), 503
    return jsonify(diagnostics)


@auth_views.route('/api/v1/auth/claim-invitation', methods=['POST'])
def claim_invitation():
    payload = request.get_json(silent=True) or {}
    raw_token = str(payload.get('token', '')).strip()
    if not raw_token:
        return _claim_error(
            'INVITATION_TOKEN_REQUIRED',
            'Input error',
            'Invitation token is required',
            400,
        )

    if getattr(g, 'ombuds_id', None):
        return _claim_error(
            'ACCOUNT_ALREADY_LINKED',
            'Conflict',
            'This Auth0 account is already linked to an Ombuddi user',
            409,
        )

    authenticated_email = normalize_email(getattr(g, 'auth0_email', None))
    if not getattr(g, 'auth0_email_verified', False) or not authenticated_email:
        return _claim_error(
            'VERIFIED_EMAIL_REQUIRED',
            'Forbidden',
            'A verified Auth0 email is required to accept an invitation',
            403,
        )

    token_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT i.id, o.id, o.organization_id, o.auth0_sub,
                       i.invited_email
                FROM ombuds_invitations i
                JOIN ombuds o ON o.id = i.ombuds_id
                JOIN organizations organization ON organization.id = o.organization_id
                WHERE i.token_hash = %s
                  AND i.claimed_at IS NULL
                  AND i.revoked_at IS NULL
                  AND i.expires_at > now()
                  AND o.is_active = TRUE
                  AND organization.is_active = TRUE
                FOR UPDATE OF i, o, organization
                """,
                (token_hash,),
            )
            invitation = cur.fetchone()
            if invitation is None:
                conn.rollback()
                return _claim_error(
                    'INVITATION_INVALID',
                    'Invalid invitation',
                    'This invitation is invalid, expired, or has already been used',
                    400,
                )
            if invitation[3] is not None:
                conn.rollback()
                return _claim_error(
                    'SEAT_ALREADY_LINKED',
                    'Conflict',
                    'This user seat is already linked to an Auth0 account',
                    409,
                )
            invited_email = normalize_email(invitation[4])
            if not invited_email or authenticated_email != invited_email:
                conn.rollback()
                return _claim_error(
                    'INVITATION_EMAIL_MISMATCH',
                    'Forbidden',
                    'The signed-in Auth0 account does not match this invitation',
                    403,
                )

            cur.execute(
                """
                UPDATE ombuds
                SET auth0_sub = %s
                WHERE id = %s AND auth0_sub IS NULL
                """,
                (g.auth0_sub, invitation[1]),
            )
            if cur.rowcount != 1:
                conn.rollback()
                return _claim_error(
                    'INVITATION_LINK_CONFLICT',
                    'Conflict',
                    'Unable to link this user seat',
                    409,
                )

            cur.execute(
                """
                UPDATE ombuds_invitations
                SET claimed_at = now(), claimed_by_auth0_sub = %s,
                    claimed_by_email = %s
                WHERE id = %s
                """,
                (g.auth0_sub, authenticated_email, invitation[0]),
            )
            record_administrative_event(
                cur,
                actor_ombuds_id=invitation[1],
                organization_id=invitation[2],
                target_ombuds_id=invitation[1],
                event_type='ombuds_invitation_claimed',
                details={
                    'invitationId': str(invitation[0]),
                    'claimedByEmail': authenticated_email,
                },
            )
        conn.commit()
        logger.info('Invitation claim completed')
        return jsonify({
            'success': True,
            'ombudsId': str(invitation[1]),
            'organizationId': str(invitation[2]),
        })
    except Exception as exc:
        if conn:
            conn.rollback()
        if getattr(exc, 'pgcode', None) == '23505':
            return _claim_error(
                'SUBJECT_ALREADY_LINKED',
                'Conflict',
                'This Auth0 account is already linked to another Ombuddi user',
                409,
            )
        logger.exception('Invitation claim failed code=INVITATION_CLAIM_FAILED')
        return jsonify({
            'error': 'Database error',
            'code': 'INVITATION_CLAIM_FAILED',
            'message': 'Unable to claim invitation',
        }), 500
    finally:
        if conn:
            conn.close()
