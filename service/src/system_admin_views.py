import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone

from flask import Blueprint, g, jsonify, request

from connection import get_db_connection
from email_identity import normalize_email


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
                    COUNT(ombuds.id) FILTER (WHERE ombuds.is_active)              AS seat_count,
                    COUNT(ombuds.id)                                             AS total_seat_count,
                    COUNT(ombuds.id) FILTER (
                        WHERE ombuds.is_active AND ombuds.auth0_sub IS NOT NULL
                    )                                                            AS linked_count,
                    o.is_active,
                    o.deactivated_at
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
                'totalSeatCount': row[5],
                'linkedCount': row[6],
                'isActive': bool(row[7]),
                'deactivatedAt': row[8].isoformat() if row[8] else None,
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
    admin_email = normalize_email(payload.get('adminEmail'))
    tier = str(payload.get('subscriptionTier', 'alpha')).strip()
    try:
        seat_limit = int(payload.get('seatLimit', 10))
    except (TypeError, ValueError):
        return jsonify({'error': 'Input error', 'message': 'Seat limit must be a number'}), 400

    if not org_name:
        return jsonify({'error': 'Input error', 'message': 'Organization name is required'}), 400
    if not admin_name:
        return jsonify({'error': 'Input error', 'message': 'First administrator name is required'}), 400
    if not admin_email:
        return jsonify({
            'error': 'Input error',
            'message': 'A valid first administrator email is required',
        }), 400
    if seat_limit < 1:
        return jsonify({'error': 'Input error', 'message': 'Seat limit must be at least 1'}), 400

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
                    ombuds_id, token_hash, created_by_ombuds_id, expires_at,
                    invited_email
                )
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
                """,
                (ombuds_id, token_hash, g.ombuds_id, expires_at, admin_email),
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
        if not fields['name']:
            return jsonify({'error': 'Input error', 'message': 'Organization name is required'}), 400
    if 'subscriptionTier' in payload:
        fields['subscription_tier'] = str(payload['subscriptionTier']).strip()
        if not fields['subscription_tier']:
            return jsonify({'error': 'Input error', 'message': 'Subscription tier is required'}), 400
    if 'seatLimit' in payload:
        try:
            fields['seat_limit'] = int(payload['seatLimit'])
        except (TypeError, ValueError):
            return jsonify({'error': 'Input error', 'message': 'Seat limit must be a number'}), 400
        if fields['seat_limit'] < 1:
            return jsonify({'error': 'Input error', 'message': 'Seat limit must be at least 1'}), 400

    if not fields:
        return jsonify({'error': 'Input error', 'message': 'No fields to update'}), 400

    set_clause = ', '.join(f'{col} = %s' for col in fields)
    values = list(fields.values()) + [org_id]

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                'SELECT id FROM organizations WHERE id = %s FOR UPDATE',
                (org_id,),
            )
            if cur.fetchone() is None:
                conn.rollback()
                return jsonify({'error': 'Not found', 'message': 'Organization not found'}), 404
            if 'seat_limit' in fields:
                cur.execute(
                    """
                    SELECT COUNT(*)
                    FROM ombuds
                    WHERE organization_id = %s AND is_active = TRUE
                    """,
                    (org_id,),
                )
                active_seats = cur.fetchone()[0]
                if fields['seat_limit'] < active_seats:
                    conn.rollback()
                    return jsonify({
                        'error': 'Conflict',
                        'message': (
                            f'Seat limit cannot be lower than the organization\'s '
                            f'{active_seats} active seats'
                        ),
                    }), 409
            cur.execute(
                f'UPDATE organizations SET {set_clause} WHERE id = %s',
                values,
            )
        conn.commit()
        return jsonify({'success': True})
    except Exception:
        if conn:
            conn.rollback()
        return jsonify({'error': 'Database error', 'message': 'Unable to update organization'}), 500
    finally:
        if conn:
            conn.close()


@system_admin_views.route('/api/v1/system/organizations/<org_id>/status', methods=['PUT'])
def update_organization_status(org_id):
    payload = request.get_json(silent=True) or {}
    if not isinstance(payload.get('active'), bool):
        return jsonify({
            'error': 'Input error',
            'message': 'active must be true or false',
        }), 400
    make_active = payload['active']
    reason = str(payload.get('reason', '')).strip() or None
    if reason and len(reason) > 1000:
        return jsonify({
            'error': 'Input error',
            'message': 'Reason must be 1000 characters or fewer',
        }), 400
    if not make_active and str(org_id) == str(g.organization_id):
        return jsonify({
            'error': 'Conflict',
            'message': 'You cannot deactivate the organization containing your own account',
        }), 409

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                'SELECT is_active FROM organizations WHERE id = %s FOR UPDATE',
                (org_id,),
            )
            organization = cur.fetchone()
            if organization is None:
                conn.rollback()
                return jsonify({'error': 'Not found', 'message': 'Organization not found'}), 404
            if bool(organization[0]) == make_active:
                conn.rollback()
                return jsonify({'success': True, 'isActive': make_active})

            cur.execute(
                """
                UPDATE organizations
                SET is_active = %s,
                    deactivated_at = CASE WHEN %s THEN NULL ELSE now() END
                WHERE id = %s
                """,
                (make_active, make_active, org_id),
            )
            if not make_active:
                cur.execute(
                    """
                    UPDATE ombuds_invitations invitation
                    SET revoked_at = now()
                    FROM ombuds
                    WHERE ombuds.id = invitation.ombuds_id
                      AND ombuds.organization_id = %s
                      AND invitation.claimed_at IS NULL
                      AND invitation.revoked_at IS NULL
                    """,
                    (org_id,),
                )
            cur.execute(
                """
                INSERT INTO administrative_status_events (
                    actor_ombuds_id, organization_id, event_type, reason
                )
                VALUES (%s, %s, %s, %s)
                """,
                (
                    g.ombuds_id,
                    org_id,
                    'organization_reactivated' if make_active else 'organization_deactivated',
                    reason,
                ),
            )
        conn.commit()
        return jsonify({'success': True, 'isActive': make_active})
    except Exception:
        if conn:
            conn.rollback()
        return jsonify({
            'error': 'Database error',
            'message': 'Unable to update organization status',
        }), 500
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
                    o.is_active, o.deactivated_at,
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
                SELECT o.id, o.auth0_sub, o.email, o.is_active,
                       organization.is_active
                FROM ombuds o
                JOIN organizations organization ON organization.id = o.organization_id
                WHERE o.id = %s AND o.organization_id = %s
                FOR UPDATE OF o, organization
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
            if not seat[3] or not seat[4]:
                conn.rollback()
                return jsonify({
                    'error': 'Conflict',
                    'message': 'The user seat and organization must be active before creating an invitation',
                }), 409
            invited_email = normalize_email(seat[2])
            if not invited_email:
                conn.rollback()
                return jsonify({
                    'error': 'Input error',
                    'message': 'This user seat needs a valid email before it can be invited',
                }), 400

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
                    ombuds_id, token_hash, created_by_ombuds_id, expires_at,
                    invited_email
                )
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
                """,
                (ombuds_id, token_hash, g.ombuds_id, expires_at, invited_email),
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
        'isActive': bool(row[5]),
        'deactivatedAt': row[6].isoformat() if row[6] else None,
        'invitation': None if row[7] is None else {
            'id': str(row[7]),
            'createdAt': row[8].isoformat(),
            'expiresAt': row[9].isoformat(),
            'claimedAt': row[10].isoformat() if row[10] else None,
            'revokedAt': row[11].isoformat() if row[11] else None,
            'isActive': (
                row[10] is None
                and row[11] is None
                and row[9] > datetime.now(timezone.utc)
            ),
        },
    }
