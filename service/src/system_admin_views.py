import hashlib
import logging
import os
import secrets
from datetime import datetime, timedelta, timezone

from flask import Blueprint, g, jsonify, request

from connection import get_db_connection
from email_identity import normalize_email
from admin_audit import record_administrative_event


system_admin_views = Blueprint('system_admin_views', __name__)
logger = logging.getLogger(__name__)


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
        logger.exception('Failed to list organizations')
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

            record_administrative_event(
                cur,
                actor_ombuds_id=g.ombuds_id,
                organization_id=org_id,
                event_type='organization_created',
                details={
                    'name': org_name,
                    'subscriptionTier': tier,
                    'seatLimit': seat_limit,
                },
            )
            record_administrative_event(
                cur,
                actor_ombuds_id=g.ombuds_id,
                organization_id=org_id,
                target_ombuds_id=ombuds_id,
                event_type='ombuds_created',
                details={'name': admin_name, 'email': admin_email, 'isAdmin': True},
            )
            record_administrative_event(
                cur,
                actor_ombuds_id=g.ombuds_id,
                organization_id=org_id,
                target_ombuds_id=ombuds_id,
                event_type='ombuds_invitation_created',
                details={
                    'invitationId': str(invitation_id),
                    'invitedEmail': admin_email,
                    'expiresAt': expires_at.isoformat(),
                    'replacedInvitationCount': 0,
                },
            )

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
        logger.exception('Failed to create organization')
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
                """
                SELECT id, name, subscription_tier, seat_limit
                FROM organizations
                WHERE id = %s
                FOR UPDATE
                """,
                (org_id,),
            )
            previous = cur.fetchone()
            if previous is None:
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
            old_values = {
                'name': previous[1],
                'subscriptionTier': previous[2],
                'seatLimit': previous[3],
            }
            new_values = {
                'name': fields.get('name', previous[1]),
                'subscriptionTier': fields.get('subscription_tier', previous[2]),
                'seatLimit': fields.get('seat_limit', previous[3]),
            }
            record_administrative_event(
                cur,
                actor_ombuds_id=g.ombuds_id,
                organization_id=org_id,
                event_type='organization_updated',
                details={'old': old_values, 'new': new_values},
            )
        conn.commit()
        return jsonify({'success': True})
    except Exception:
        if conn:
            conn.rollback()
        logger.exception('Failed to update organization')
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
            record_administrative_event(
                cur,
                actor_ombuds_id=g.ombuds_id,
                organization_id=org_id,
                event_type='organization_reactivated' if make_active else 'organization_deactivated',
                reason=reason,
            )
        conn.commit()
        return jsonify({'success': True, 'isActive': make_active})
    except Exception:
        if conn:
            conn.rollback()
        logger.exception('Failed to update organization status')
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
                    o.id, o.name, o.email, o.is_admin, o.is_system_admin, o.auth0_sub,
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
        logger.exception('Failed to list organization seats')
        return jsonify({'error': 'Database error', 'message': 'Unable to load seats'}), 500
    finally:
        if conn:
            conn.close()


@system_admin_views.route('/api/v1/system/organizations/<org_id>/ombuds', methods=['POST'])
def create_org_ombuds(org_id):
    payload = request.get_json(silent=True) or {}
    name = str(payload.get('name', '')).strip()
    email = normalize_email(payload.get('email'))
    is_admin = payload.get('isAdmin') is True
    create_invitation = payload.get('createInvitation') is not False
    if not name:
        return jsonify({'error': 'Input error', 'message': 'User name is required'}), 400
    if not email:
        return jsonify({'error': 'Input error', 'message': 'A valid email is required'}), 400

    raw_token = secrets.token_urlsafe(32) if create_invitation else None
    token_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest() if raw_token else None
    expires_at = datetime.now(timezone.utc) + timedelta(days=7) if raw_token else None

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT seat_limit, is_active
                FROM organizations
                WHERE id = %s
                FOR UPDATE
                """,
                (org_id,),
            )
            organization = cur.fetchone()
            if organization is None:
                conn.rollback()
                return jsonify({'error': 'Not found', 'message': 'Organization not found'}), 404
            if not organization[1]:
                conn.rollback()
                return jsonify({'error': 'Conflict', 'message': 'The organization is not active'}), 409
            cur.execute(
                'SELECT COUNT(*) FROM ombuds WHERE organization_id = %s AND is_active = TRUE',
                (org_id,),
            )
            if cur.fetchone()[0] >= organization[0]:
                conn.rollback()
                return jsonify({
                    'error': 'Seat limit reached',
                    'message': f'This organization has reached its {organization[0]}-seat limit',
                }), 409
            cur.execute(
                """
                INSERT INTO ombuds (name, email, is_admin, organization_id)
                VALUES (%s, %s, %s, %s)
                RETURNING id
                """,
                (name, email, is_admin, org_id),
            )
            ombuds_id = cur.fetchone()[0]
            record_administrative_event(
                cur,
                actor_ombuds_id=g.ombuds_id,
                organization_id=org_id,
                target_ombuds_id=ombuds_id,
                event_type='ombuds_created',
                details={'name': name, 'email': email, 'isAdmin': is_admin},
            )

            invitation_id = None
            if create_invitation:
                cur.execute(
                    """
                    INSERT INTO ombuds_invitations (
                        ombuds_id, token_hash, created_by_ombuds_id, expires_at,
                        invited_email
                    )
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    (ombuds_id, token_hash, g.ombuds_id, expires_at, email),
                )
                invitation_id = cur.fetchone()[0]
                record_administrative_event(
                    cur,
                    actor_ombuds_id=g.ombuds_id,
                    organization_id=org_id,
                    target_ombuds_id=ombuds_id,
                    event_type='ombuds_invitation_created',
                    details={
                        'invitationId': str(invitation_id),
                        'invitedEmail': email,
                        'expiresAt': expires_at.isoformat(),
                        'replacedInvitationCount': 0,
                    },
                )
        conn.commit()

        result = {'success': True, 'ombudsId': str(ombuds_id)}
        if raw_token:
            frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:5173').rstrip('/')
            result.update({
                'invitationId': str(invitation_id),
                'expiresAt': expires_at.isoformat(),
                'inviteUrl': f'{frontend_url}/accept-invite?token={raw_token}',
            })
        return jsonify(result), 201
    except Exception as exc:
        if conn:
            conn.rollback()
        if getattr(exc, 'pgcode', None) == '23505':
            return jsonify({
                'error': 'Conflict',
                'message': 'That email already has a seat in this organization',
            }), 409
        logger.exception('Failed to create system-managed organization seat')
        return jsonify({'error': 'Database error', 'message': 'Unable to create user seat'}), 500
    finally:
        if conn:
            conn.close()


@system_admin_views.route('/api/v1/system/organizations/<org_id>/ombuds/<ombuds_id>', methods=['PUT'])
def update_org_ombuds_email(org_id, ombuds_id):
    payload = request.get_json(silent=True) or {}
    email = normalize_email(payload.get('email'))
    if not email:
        return jsonify({'error': 'Input error', 'message': 'A valid email is required'}), 400

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT email, auth0_sub
                FROM ombuds
                WHERE id = %s AND organization_id = %s
                FOR UPDATE
                """,
                (ombuds_id, org_id),
            )
            seat = cur.fetchone()
            if seat is None:
                conn.rollback()
                return jsonify({'error': 'Not found', 'message': 'User seat not found'}), 404
            old_email = normalize_email(seat[0])
            if old_email != email:
                cur.execute('UPDATE ombuds SET email = %s WHERE id = %s', (email, ombuds_id))
                if seat[1] is None:
                    cur.execute(
                        """
                        UPDATE ombuds_invitations
                        SET revoked_at = now()
                        WHERE ombuds_id = %s
                          AND claimed_at IS NULL
                          AND revoked_at IS NULL
                        """,
                        (ombuds_id,),
                    )
                record_administrative_event(
                    cur,
                    actor_ombuds_id=g.ombuds_id,
                    organization_id=org_id,
                    target_ombuds_id=ombuds_id,
                    event_type='ombuds_email_changed',
                    details={
                        'oldEmail': old_email,
                        'newEmail': email,
                        'auth0IdentityUnchanged': seat[1] is not None,
                    },
                )
        conn.commit()
        return jsonify({
            'success': True,
            'email': email,
            'auth0IdentityUnchanged': seat[1] is not None,
        })
    except Exception as exc:
        if conn:
            conn.rollback()
        if getattr(exc, 'pgcode', None) == '23505':
            return jsonify({
                'error': 'Conflict',
                'message': 'That email already has a seat in this organization',
            }), 409
        logger.exception('Failed to update system-managed seat email')
        return jsonify({'error': 'Database error', 'message': 'Unable to update user email'}), 500
    finally:
        if conn:
            conn.close()


@system_admin_views.route('/api/v1/system/organizations/<org_id>/ombuds/<ombuds_id>/role', methods=['PUT'])
def update_org_ombuds_role(org_id, ombuds_id):
    payload = request.get_json(silent=True) or {}
    if not isinstance(payload.get('isAdmin'), bool):
        return jsonify({'error': 'Input error', 'message': 'isAdmin must be true or false'}), 400
    make_admin = payload['isAdmin']
    reason = str(payload.get('reason', '')).strip() or None
    if reason and len(reason) > 1000:
        return jsonify({'error': 'Input error', 'message': 'Reason must be 1000 characters or fewer'}), 400

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute('SELECT id FROM organizations WHERE id = %s FOR UPDATE', (org_id,))
            if cur.fetchone() is None:
                conn.rollback()
                return jsonify({'error': 'Not found', 'message': 'Organization not found'}), 404
            cur.execute(
                """
                SELECT is_admin, is_system_admin, is_active
                FROM ombuds
                WHERE id = %s AND organization_id = %s
                FOR UPDATE
                """,
                (ombuds_id, org_id),
            )
            seat = cur.fetchone()
            if seat is None:
                conn.rollback()
                return jsonify({'error': 'Not found', 'message': 'User seat not found'}), 404
            if seat[1]:
                conn.rollback()
                return jsonify({'error': 'Forbidden', 'message': 'System administrator roles are managed separately'}), 403
            if bool(seat[0]) == make_admin:
                conn.rollback()
                return jsonify({'success': True, 'isAdmin': make_admin})
            if not make_admin and seat[2]:
                cur.execute(
                    """
                    SELECT COUNT(*)
                    FROM ombuds
                    WHERE organization_id = %s AND is_admin = TRUE AND is_active = TRUE
                    """,
                    (org_id,),
                )
                if cur.fetchone()[0] <= 1:
                    conn.rollback()
                    return jsonify({
                        'error': 'Conflict',
                        'message': 'An organization must retain at least one active administrator',
                    }), 409
            cur.execute('UPDATE ombuds SET is_admin = %s WHERE id = %s', (make_admin, ombuds_id))
            record_administrative_event(
                cur,
                actor_ombuds_id=g.ombuds_id,
                organization_id=org_id,
                target_ombuds_id=ombuds_id,
                event_type='ombuds_admin_granted' if make_admin else 'ombuds_admin_revoked',
                reason=reason,
            )
        conn.commit()
        return jsonify({'success': True, 'isAdmin': make_admin})
    except Exception:
        if conn:
            conn.rollback()
        logger.exception('Failed to update organization administrator role')
        return jsonify({'error': 'Database error', 'message': 'Unable to update administrator role'}), 500
    finally:
        if conn:
            conn.close()


@system_admin_views.route('/api/v1/system/organizations/<org_id>/ombuds/<ombuds_id>/status', methods=['PUT'])
def update_org_ombuds_status(org_id, ombuds_id):
    payload = request.get_json(silent=True) or {}
    if not isinstance(payload.get('active'), bool):
        return jsonify({'error': 'Input error', 'message': 'active must be true or false'}), 400
    make_active = payload['active']
    reason = str(payload.get('reason', '')).strip() or None
    if reason and len(reason) > 1000:
        return jsonify({'error': 'Input error', 'message': 'Reason must be 1000 characters or fewer'}), 400
    if not make_active and str(ombuds_id) == str(g.ombuds_id):
        return jsonify({'error': 'Conflict', 'message': 'You cannot deactivate your own account'}), 409

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                'SELECT seat_limit, is_active FROM organizations WHERE id = %s FOR UPDATE',
                (org_id,),
            )
            organization = cur.fetchone()
            if organization is None:
                conn.rollback()
                return jsonify({'error': 'Not found', 'message': 'Organization not found'}), 404
            if make_active and not organization[1]:
                conn.rollback()
                return jsonify({'error': 'Conflict', 'message': 'Reactivate the organization first'}), 409
            cur.execute(
                """
                SELECT is_admin, is_system_admin, is_active
                FROM ombuds
                WHERE id = %s AND organization_id = %s
                FOR UPDATE
                """,
                (ombuds_id, org_id),
            )
            seat = cur.fetchone()
            if seat is None:
                conn.rollback()
                return jsonify({'error': 'Not found', 'message': 'User seat not found'}), 404
            if seat[1]:
                conn.rollback()
                return jsonify({'error': 'Forbidden', 'message': 'System administrator accounts cannot be changed here'}), 403
            if bool(seat[2]) == make_active:
                conn.rollback()
                return jsonify({'success': True, 'isActive': make_active})
            if make_active:
                cur.execute(
                    'SELECT COUNT(*) FROM ombuds WHERE organization_id = %s AND is_active = TRUE',
                    (org_id,),
                )
                if cur.fetchone()[0] >= organization[0]:
                    conn.rollback()
                    return jsonify({
                        'error': 'Seat limit reached',
                        'message': f'This organization has reached its {organization[0]}-seat limit',
                    }), 409
            elif seat[0]:
                cur.execute(
                    """
                    SELECT COUNT(*)
                    FROM ombuds
                    WHERE organization_id = %s AND is_admin = TRUE AND is_active = TRUE
                    """,
                    (org_id,),
                )
                if cur.fetchone()[0] <= 1:
                    conn.rollback()
                    return jsonify({
                        'error': 'Conflict',
                        'message': 'An organization must retain at least one active administrator',
                    }), 409
            cur.execute(
                """
                UPDATE ombuds
                SET is_active = %s,
                    deactivated_at = CASE WHEN %s THEN NULL ELSE now() END
                WHERE id = %s
                """,
                (make_active, make_active, ombuds_id),
            )
            if not make_active:
                cur.execute(
                    """
                    UPDATE ombuds_invitations
                    SET revoked_at = now()
                    WHERE ombuds_id = %s AND claimed_at IS NULL AND revoked_at IS NULL
                    """,
                    (ombuds_id,),
                )
            record_administrative_event(
                cur,
                actor_ombuds_id=g.ombuds_id,
                organization_id=org_id,
                target_ombuds_id=ombuds_id,
                event_type='ombuds_reactivated' if make_active else 'ombuds_deactivated',
                reason=reason,
            )
        conn.commit()
        return jsonify({'success': True, 'isActive': make_active})
    except Exception:
        if conn:
            conn.rollback()
        logger.exception('Failed to update system-managed seat status')
        return jsonify({'error': 'Database error', 'message': 'Unable to update user status'}), 500
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
            revoked_count = cur.rowcount
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
            record_administrative_event(
                cur,
                actor_ombuds_id=g.ombuds_id,
                organization_id=org_id,
                target_ombuds_id=ombuds_id,
                event_type='ombuds_invitation_created',
                details={
                    'invitationId': str(invitation_id),
                    'invitedEmail': invited_email,
                    'expiresAt': expires_at.isoformat(),
                    'replacedInvitationCount': revoked_count,
                },
            )
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
        logger.exception('Failed to create organization invitation')
        return jsonify({'error': 'Database error', 'message': 'Unable to create invitation'}), 500
    finally:
        if conn:
            conn.close()


@system_admin_views.route(
    '/api/v1/system/organizations/<org_id>/ombuds/<ombuds_id>/invitation/cancel',
    methods=['POST'],
)
def cancel_org_invitation(org_id, ombuds_id):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                'SELECT id FROM ombuds WHERE id = %s AND organization_id = %s FOR UPDATE',
                (ombuds_id, org_id),
            )
            if cur.fetchone() is None:
                conn.rollback()
                return jsonify({'error': 'Not found', 'message': 'User seat not found'}), 404
            cur.execute(
                """
                UPDATE ombuds_invitations
                SET revoked_at = now()
                WHERE ombuds_id = %s
                  AND claimed_at IS NULL
                  AND revoked_at IS NULL
                  AND expires_at > now()
                """,
                (ombuds_id,),
            )
            cancelled_count = cur.rowcount
            if cancelled_count:
                record_administrative_event(
                    cur,
                    actor_ombuds_id=g.ombuds_id,
                    organization_id=org_id,
                    target_ombuds_id=ombuds_id,
                    event_type='ombuds_invitation_cancelled',
                    details={'cancelledInvitationCount': cancelled_count},
                )
        conn.commit()
        return jsonify({'success': True, 'cancelledCount': cancelled_count})
    except Exception:
        if conn:
            conn.rollback()
        logger.exception('Failed to cancel system-managed invitation')
        return jsonify({'error': 'Database error', 'message': 'Unable to cancel invitation'}), 500
    finally:
        if conn:
            conn.close()


@system_admin_views.route(
    '/api/v1/system/organizations/<org_id>/ombuds/<ombuds_id>/invitations'
)
def list_org_invitations(org_id, ombuds_id):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                'SELECT id FROM ombuds WHERE id = %s AND organization_id = %s',
                (ombuds_id, org_id),
            )
            if cur.fetchone() is None:
                return jsonify({'error': 'Not found', 'message': 'User seat not found'}), 404
            cur.execute(
                """
                SELECT
                    invitation.id, invitation.invited_email,
                    invitation.created_at, invitation.expires_at,
                    invitation.claimed_at, invitation.claimed_by_email,
                    invitation.revoked_at,
                    creator.id, creator.name, creator.email
                FROM ombuds_invitations invitation
                JOIN ombuds creator ON creator.id = invitation.created_by_ombuds_id
                WHERE invitation.ombuds_id = %s
                ORDER BY invitation.created_at DESC, invitation.id DESC
                """,
                (ombuds_id,),
            )
            rows = cur.fetchall()
        now = datetime.now(timezone.utc)
        return jsonify([
            {
                'id': str(row[0]),
                'invitedEmail': row[1],
                'createdAt': row[2].isoformat(),
                'expiresAt': row[3].isoformat(),
                'claimedAt': row[4].isoformat() if row[4] else None,
                'claimedByEmail': row[5],
                'revokedAt': row[6].isoformat() if row[6] else None,
                'isActive': row[4] is None and row[6] is None and row[3] > now,
                'createdBy': {'id': str(row[7]), 'name': row[8], 'email': row[9]},
            }
            for row in rows
        ])
    except Exception:
        logger.exception('Failed to list invitation history')
        return jsonify({'error': 'Database error', 'message': 'Unable to load invitation history'}), 500
    finally:
        if conn:
            conn.close()


@system_admin_views.route('/api/v1/system/organizations/<org_id>/audit')
def list_org_audit_events(org_id):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute('SELECT id FROM organizations WHERE id = %s', (org_id,))
            if cur.fetchone() is None:
                return jsonify({'error': 'Not found', 'message': 'Organization not found'}), 404
            cur.execute(
                """
                SELECT
                    event.id, event.event_type, event.reason, event.details,
                    event.created_at,
                    actor.id, actor.name, actor.email,
                    target.id, target.name, target.email
                FROM administrative_events event
                JOIN ombuds actor ON actor.id = event.actor_ombuds_id
                LEFT JOIN ombuds target ON target.id = event.target_ombuds_id
                WHERE event.organization_id = %s
                ORDER BY event.created_at DESC, event.id DESC
                """,
                (org_id,),
            )
            rows = cur.fetchall()
        return jsonify([
            {
                'id': str(row[0]),
                'eventType': row[1],
                'reason': row[2],
                'details': row[3] or {},
                'createdAt': row[4].isoformat(),
                'actor': {'id': str(row[5]), 'name': row[6], 'email': row[7]},
                'target': None if row[8] is None else {
                    'id': str(row[8]), 'name': row[9], 'email': row[10],
                },
            }
            for row in rows
        ])
    except Exception:
        logger.exception('Failed to list system administrative audit events')
        return jsonify({'error': 'Database error', 'message': 'Unable to load audit log'}), 500
    finally:
        if conn:
            conn.close()


def _seat_json(row) -> dict:
    return {
        'id': str(row[0]),
        'name': row[1],
        'email': row[2],
        'isAdmin': bool(row[3]),
        'isSystemAdmin': bool(row[4]),
        'isLinked': row[5] is not None,
        'isActive': bool(row[6]),
        'deactivatedAt': row[7].isoformat() if row[7] else None,
        'invitation': None if row[8] is None else {
            'id': str(row[8]),
            'createdAt': row[9].isoformat(),
            'expiresAt': row[10].isoformat(),
            'claimedAt': row[11].isoformat() if row[11] else None,
            'revokedAt': row[12].isoformat() if row[12] else None,
            'isActive': (
                row[11] is None
                and row[12] is None
                and row[10] > datetime.now(timezone.utc)
            ),
        },
    }
