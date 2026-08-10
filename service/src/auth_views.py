import hashlib

from flask import Blueprint, g, jsonify, request

from connection import get_db_connection
from email_identity import normalize_email


auth_views = Blueprint('auth_views', __name__)


@auth_views.route('/api/v1/auth/claim-invitation', methods=['POST'])
def claim_invitation():
    payload = request.get_json(silent=True) or {}
    raw_token = str(payload.get('token', '')).strip()
    if not raw_token:
        return jsonify({'error': 'Input error', 'message': 'Invitation token is required'}), 400

    if getattr(g, 'ombuds_id', None):
        return jsonify({
            'error': 'Conflict',
            'message': 'This Auth0 account is already linked to an Ombuddi user',
        }), 409

    authenticated_email = normalize_email(getattr(g, 'auth0_email', None))
    if not getattr(g, 'auth0_email_verified', False) or not authenticated_email:
        return jsonify({
            'error': 'Forbidden',
            'message': 'A verified Auth0 email is required to accept an invitation',
        }), 403

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
                WHERE i.token_hash = %s
                  AND i.claimed_at IS NULL
                  AND i.revoked_at IS NULL
                  AND i.expires_at > now()
                FOR UPDATE OF i, o
                """,
                (token_hash,),
            )
            invitation = cur.fetchone()
            if invitation is None:
                conn.rollback()
                return jsonify({
                    'error': 'Invalid invitation',
                    'message': 'This invitation is invalid, expired, or has already been used',
                }), 400
            if invitation[3] is not None:
                conn.rollback()
                return jsonify({
                    'error': 'Conflict',
                    'message': 'This user seat is already linked to an Auth0 account',
                }), 409
            invited_email = normalize_email(invitation[4])
            if not invited_email or authenticated_email != invited_email:
                conn.rollback()
                return jsonify({
                    'error': 'Forbidden',
                    'message': 'The signed-in Auth0 account does not match this invitation',
                }), 403

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
                return jsonify({'error': 'Conflict', 'message': 'Unable to link this user seat'}), 409

            cur.execute(
                """
                UPDATE ombuds_invitations
                SET claimed_at = now(), claimed_by_auth0_sub = %s,
                    claimed_by_email = %s
                WHERE id = %s
                """,
                (g.auth0_sub, authenticated_email, invitation[0]),
            )
        conn.commit()
        return jsonify({
            'success': True,
            'ombudsId': str(invitation[1]),
            'organizationId': str(invitation[2]),
        })
    except Exception as exc:
        if conn:
            conn.rollback()
        if getattr(exc, 'pgcode', None) == '23505':
            return jsonify({
                'error': 'Conflict',
                'message': 'This Auth0 account is already linked to another Ombuddi user',
            }), 409
        return jsonify({'error': 'Database error', 'message': 'Unable to claim invitation'}), 500
    finally:
        if conn:
            conn.close()
