import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone

from flask import Blueprint, g, jsonify, request

from connection import get_db_connection


system_admin_views = Blueprint('system_admin_views', __name__)


@system_admin_views.before_request
def require_system_admin():
    if not getattr(g, 'is_system_admin', False):
        return jsonify({
            'error': 'Forbidden',
            'message': 'Ombuddi system administrator access is required',
        }), 403


# ---------------------------------------------------------------------------
# Organizations
# ---------------------------------------------------------------------------

@system_admin_views.route('/api/v1/system/organizations')
def list_organizations():
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    o.id,
                    o.name,
                    o.subscription_tier,
                    o.seat_limit,
                    COUNT(ombuds.id)                                             AS seat_count,
                    COUNT(ombuds.id) FILTER (WHERE ombuds.auth0_sub IS NOT NULL) AS linked_count
                FROM organizations o
                LEFT JOIN ombuds ON ombuds.organization_id = o.id
                GROUP BY o.id
                ORDER BY lower(o.name), o.id
                """
            )
            rows = cur.fetchall()
        return jsonify([
            {
                'id': str(row[0]),
                'name': row[1],
                'subscriptionTier': row[2],
                'seatLimit': row[3],
                'seatCount': row[4],
                'linkedCount': row[5],
            }
            for row in rows
        ])
    except Exception:
        return jsonify({'error': 'Database error', 'message': 'Unable to list organizations'}), 500
    finally:
        if conn:
            conn.close()


@system_admin_views.route('/api/v1/system/organizations', methods=['POST'])
def create_organization():
    """
    Create a new organization and its first administrator seat in one step,
    returning an invitation URL the first user can claim without any Auth0
    metadata changes.
    """
    payload = request.get_json(silent=True) or {}
    org_name = str(payload.get('name', '')).strip()
    admin_name = str(payload.get('adminName', '')).strip()
    admin_email = str(payload.get('adminEmail', '')).strip().lower() or None
    tier = str(payload.get('subscriptionTier', 'alpha')).strip()
    seat_limit = int(payload.get('seatLimit', 10))

    if not org_name:
        return jsonify({'error': 'Input error', 'message': 'Organization name is required'}), 400
    if not admin_name:
        return jsonify({'error': 'Input error', 'message': 'First administrator name is required'}), 400

    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO organizations (name, subscription_tier, seat_limit)
                VALUES (%s, %s, %s)
                RETURNING id
                """,
                (org_name, tier, seat_limit),
            )
            org_id = cur.fetchone()[0]

            cur.execute(
                """
                INSERT INTO ombuds (name, email, is_admin, organization_id)
                VALUES (%s, %s, TRUE, %s)
                RETURNING id
                """,
                (admin_name, admin_email, org_id),
            )
            ombuds_id = cur.fetchone()[0]

            cur.execute(
                """
                INSERT INTO ombuds_invitations (
                    ombuds_id, token_hash, created_by_ombuds_id, expires_at
                )
                VALUES (%s, %s, %s, %s)
                RETURNING id
                """,
                (ombuds_id, token_hash, g.ombuds_id, expires_at),
            )
            invitation_id = cur.fetchone()[0]

        conn.commit()

        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:5173').rstrip('/')
        return jsonify({
            'success': True,
            'organizationId': str(org_id),
            'ombudsId': str(ombuds_id),
            'invitationId': str(invitation_id),
            'expiresAt': expires_at.isoformat(),
            'inviteUrl': f'{frontend_url}/accept-invite?token={raw_token}',
        }), 201
    except Exception as exc:
        if conn:
            conn.rollback()
        if getattr(exc, 'pgcode', None) == '23505':
            return jsonify({
                'error': 'Conflict',
                'message': 'An organization with that name already exists',
            }), 409
        return jsonify({'error': 'Database error', 'message': 'Unable to create organization'}), 500
    finally:
        if conn:
            conn.close()


@system_admin_views.route('/api/v1/system/organizations/<org_id>', methods=['PUT'])
def update_organization(org_id):
    payload = request.get_json(silent=True) or {}
    fields = {}
    if 'name' in payload:
        fields['name'] = str(payload['name']).strip()
    if 'subscriptionTier' in payload:
        fields['subscription_tier'] = str(payload['subscriptionTier']).strip()
    if 'seatLimit' in payload:
        fields['seat_limit'] = int(payload['seatLimit'])

    if not fields:
        return jsonify({'error': 'Input error', 'message': 'No fields to update'}), 400

    set_clause = ', '.join(f'{col} = %s' for col in fields)
    values = list(fields.values()) + [org_id]

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                f'UPDATE organizations SET {set_clause} WHERE id = %s',
                values,
            )
            if cur.rowcount == 0:
                conn.rollback()
                return jsonify({'error': 'Not found', 'message': 'Organization not found'}), 404
        conn.commit()
        return jsonify({'success': True})
    except Exception:
        if conn:
            conn.rollback()
        return jsonify({'error': 'Database error', 'message': 'Unable to update organization'}), 500
    finally:
        if conn:
            conn.close()


# ---------------------------------------------------------------------------
# Superuser access to any org's seats — same logic as admin_views but without
# the organization_id restriction from g.organization_id.
# ---------------------------------------------------------------------------

@system_admin_views.route('/api/v1/system/organizations/<org_id>/ombuds')
def list_org_ombuds(org_id):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    o.id, o.name, o.email, o.is_admin, o.auth0_sub,
                    invitation.id, invitation.created_at, invitation.expires_at,
                    invitation.claimed_at, invitation.revoked_at
                FROM ombuds o
                LEFT JOIN LATERAL (
                    SELECT i.*
                    FROM ombuds_invitations i
                    WHERE i.ombuds_id = o.id
                    ORDER BY i.created_at DESC
                    LIMIT 1
                ) invitation ON TRUE
                WHERE o.organization_id = %s
                ORDER BY lower(o.name), o.id
                """,
                (org_id,),
            )
            rows = cur.fetchall()
        return jsonify([_seat_json(row) for row in rows])
    except Exception:
        return jsonify({'error': 'Database error', 'message': 'Unable to load seats'}), 500
    finally:
        if conn:
            conn.close()


@system_admin_views.route('/api/v1/system/organizations/<org_id>/ombuds/<ombuds_id>/invitation', methods=['POST'])
def create_org_invitation(org_id, ombuds_id):
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, auth0_sub FROM ombuds
                WHERE id = %s AND organization_id = %s
                FOR UPDATE
                """,
                (ombuds_id, org_id),
            )
            seat = cur.fetchone()
            if seat is None:
                conn.rollback()
                return jsonify({'error': 'Not found', 'message': 'User seat not found'}), 404
            if seat[1] is not None:
                conn.rollback()
                return jsonify({
                    'error': 'Conflict',
                    'message': 'This seat is already linked to an Auth0 account',
                }), 409

            cur.execute(
                """
                UPDATE ombuds_invitations
                SET revoked_at = now()
                WHERE ombuds_id = %s AND claimed_at IS NULL AND revoked_at IS NULL
                """,
                (ombuds_id,),
            )
            cur.execute(
                """
                INSERT INTO ombuds_invitations (
                    ombuds_id, token_hash, created_by_ombuds_id, expires_at
                )
                VALUES (%s, %s, %s, %s)
                RETURNING id
                """,
                (ombuds_id, token_hash, g.ombuds_id, expires_at),
            )
            invitation_id = cur.fetchone()[0]
        conn.commit()

        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:5173').rstrip('/')
        return jsonify({
            'success': True,
            'id': str(invitation_id),
            'expiresAt': expires_at.isoformat(),
            'inviteUrl': f'{frontend_url}/accept-invite?token={raw_token}',
        }), 201
    except Exception:
        if conn:
            conn.rollback()
        return jsonify({'error': 'Database error', 'message': 'Unable to create invitation'}), 500
    finally:
        if conn:
            conn.close()


def _seat_json(row) -> dict:
    return {
        'id': str(row[0]),
        'name': row[1],
        'email': row[2],
        'isAdmin': bool(row[3]),
        'isLinked': row[4] is not None,
        'invitation': None if row[5] is None else {
            'id': str(row[5]),
            'createdAt': row[6].isoformat(),
            'expiresAt': row[7].isoformat(),
            'claimedAt': row[8].isoformat() if row[8] else None,
            'revokedAt': row[9].isoformat() if row[9] else None,
            'isActive': (
                row[8] is None
                and row[9] is None
                and row[7] > datetime.now(timezone.utc)
            ),
        },
    }
