import hashlib
import logging
import os
import secrets
from datetime import datetime, timedelta, timezone

from flask import Blueprint, g, jsonify, request

from connection import get_db_connection
from email_identity import normalize_email
from admin_audit import record_administrative_event


admin_views = Blueprint('admin_views', __name__)
logger = logging.getLogger(__name__)


@admin_views.before_request
def require_admin():
    if not getattr(g, 'is_admin', False):
        return jsonify({
            'error': 'Forbidden',
            'message': 'Organization administrator access is required',
        }), 403


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


@admin_views.route('/api/v1/admin/metrics')
def get_metrics():
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                WITH entry_stats AS (
                    SELECT
                        COUNT(*) FILTER (WHERE date >= now() - INTERVAL '30 days') AS last_30,
                        COUNT(*) FILTER (WHERE date >= date_trunc('year', now()))   AS ytd,
                        COUNT(DISTINCT ombuds_id)
                            FILTER (WHERE date >= now() - INTERVAL '30 days')       AS active_seats
                    FROM entries
                    WHERE organization_id = %s
                ),
                case_stats AS (
                    SELECT
                        COUNT(*) FILTER (WHERE status = 'active') AS open_cases,
                        COUNT(*)                                   AS total_cases
                    FROM cases
                    WHERE organization_id = %s
                )
                SELECT e.last_30, e.ytd, e.active_seats, c.open_cases, c.total_cases
                FROM entry_stats e, case_stats c
                """,
                (g.organization_id, g.organization_id),
            )
            row = cur.fetchone()
        return jsonify({
            'entriesLast30Days': row[0],
            'entriesYtd':        row[1],
            'activeSeats':       row[2],
            'openCases':         row[3],
            'totalCases':        row[4],
        })
    except Exception:
        logger.exception('Failed to load organization metrics')
        return jsonify({'error': 'Database error', 'message': 'Unable to load metrics'}), 500
    finally:
        if conn:
            conn.close()


@admin_views.route('/api/v1/admin/organization')
def get_organization():
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
                    COUNT(ombuds.id) FILTER (WHERE ombuds.is_active) AS seat_count,
                    COUNT(ombuds.id) AS total_seat_count,
                    COUNT(ombuds.id) FILTER (
                        WHERE ombuds.is_active AND ombuds.auth0_sub IS NOT NULL
                    ) AS linked_count
                FROM organizations o
                LEFT JOIN ombuds ON ombuds.organization_id = o.id
                WHERE o.id = %s
                GROUP BY o.id
                """,
                (g.organization_id,),
            )
            row = cur.fetchone()
        if row is None:
            return jsonify({'error': 'Not found', 'message': 'Organization not found'}), 404
        return jsonify({
            'id': str(row[0]),
            'name': row[1],
            'subscriptionTier': row[2],
            'seatLimit': row[3],
            'seatCount': row[4],
            'totalSeatCount': row[5],
            'linkedCount': row[6],
        })
    except Exception:
        logger.exception('Failed to load organization settings')
        return jsonify({'error': 'Database error', 'message': 'Unable to load organization'}), 500
    finally:
        if conn:
            conn.close()


@admin_views.route('/api/v1/admin/ombuds')
def list_ombuds():
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    o.id,
                    o.name,
                    o.email,
                    o.is_admin,
                    o.auth0_sub,
                    o.is_active,
                    o.deactivated_at,
                    invitation.id,
                    invitation.created_at,
                    invitation.expires_at,
                    invitation.claimed_at,
                    invitation.revoked_at
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
                (g.organization_id,),
            )
            rows = cur.fetchall()
        return jsonify([_seat_json(row) for row in rows])
    except Exception:
        logger.exception('Failed to list organization users')
        return jsonify({
            'error': 'Database error',
            'message': 'Unable to load organization users',
        }), 500
    finally:
        if conn:
            conn.close()


@admin_views.route('/api/v1/admin/ombuds', methods=['POST'])
def create_ombuds():
    payload = request.get_json(silent=True) or {}
    name = str(payload.get('name', '')).strip()
    email = normalize_email(payload.get('email'))
    is_admin = payload.get('isAdmin') is True

    if not name:
        return jsonify({'error': 'Input error', 'message': 'Name is required'}), 400
    if not email:
        return jsonify({
            'error': 'Input error',
            'message': 'A valid email is required for invitation identity verification',
        }), 400

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT seat_limit
                FROM organizations
                WHERE id = %s AND is_active = TRUE
                FOR UPDATE
                """,
                (g.organization_id,),
            )
            organization = cur.fetchone()
            if organization is None:
                conn.rollback()
                return jsonify({
                    'error': 'Conflict',
                    'message': 'The organization is not active',
                }), 409
            cur.execute(
                """
                SELECT COUNT(*)
                FROM ombuds
                WHERE organization_id = %s AND is_active = TRUE
                """,
                (g.organization_id,),
            )
            seat_count = cur.fetchone()[0]
            if seat_count >= organization[0]:
                conn.rollback()
                return jsonify({
                    'error': 'Seat limit reached',
                    'message': f'Your organization has reached its {organization[0]}-seat limit',
                }), 409

            cur.execute(
                """
                INSERT INTO ombuds (name, email, is_admin, organization_id)
                VALUES (%s, %s, %s, %s)
                RETURNING id
                """,
                (name, email, is_admin, g.organization_id),
            )
            ombuds_id = cur.fetchone()[0]
            record_administrative_event(
                cur,
                actor_ombuds_id=g.ombuds_id,
                organization_id=g.organization_id,
                target_ombuds_id=ombuds_id,
                event_type='ombuds_created',
                details={'name': name, 'email': email, 'isAdmin': is_admin},
            )
        conn.commit()
        return jsonify({'success': True, 'id': str(ombuds_id)}), 201
    except Exception as exc:
        if conn:
            conn.rollback()
        if getattr(exc, 'pgcode', None) == '23505':
            return jsonify({
                'error': 'Conflict',
                'message': 'That email already has a seat in this organization',
            }), 409
        logger.exception('Failed to create organization user seat')
        return jsonify({'error': 'Database error', 'message': 'Unable to create user seat'}), 500
    finally:
        if conn:
            conn.close()


@admin_views.route('/api/v1/admin/ombuds/<ombuds_id>', methods=['PUT'])
def update_unlinked_ombuds_email(ombuds_id):
    payload = request.get_json(silent=True) or {}
    email = normalize_email(payload.get('email'))
    if not email:
        return jsonify({
            'error': 'Input error',
            'message': 'A valid email is required for invitation identity verification',
        }), 400

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT auth0_sub, email, is_active
                FROM ombuds
                WHERE id = %s AND organization_id = %s
                FOR UPDATE
                """,
                (ombuds_id, g.organization_id),
            )
            seat = cur.fetchone()
            if seat is None:
                conn.rollback()
                return jsonify({'error': 'Not found', 'message': 'User seat not found'}), 404
            if seat[0] is not None:
                conn.rollback()
                return jsonify({
                    'error': 'Conflict',
                    'message': 'The invitation email cannot be changed after the seat is linked',
                }), 409
            if not seat[2]:
                conn.rollback()
                return jsonify({
                    'error': 'Conflict',
                    'message': 'Reactivate this user seat before changing its invitation email',
                }), 409

            old_email = normalize_email(seat[1])
            if old_email != email:
                cur.execute(
                    'UPDATE ombuds SET email = %s WHERE id = %s',
                    (email, ombuds_id),
                )
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
                    organization_id=g.organization_id,
                    target_ombuds_id=ombuds_id,
                    event_type='ombuds_email_changed',
                    details={'oldEmail': old_email, 'newEmail': email},
                )
        conn.commit()
        return jsonify({'success': True, 'email': email})
    except Exception as exc:
        if conn:
            conn.rollback()
        if getattr(exc, 'pgcode', None) == '23505':
            return jsonify({
                'error': 'Conflict',
                'message': 'That email already has a seat in this organization',
            }), 409
        logger.exception('Failed to update unlinked user email')
        return jsonify({'error': 'Database error', 'message': 'Unable to update user email'}), 500
    finally:
        if conn:
            conn.close()


@admin_views.route('/api/v1/admin/ombuds/<ombuds_id>/invitation', methods=['POST'])
def create_invitation(ombuds_id):
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT o.id, o.auth0_sub, o.email, o.is_active
                FROM ombuds o
                JOIN organizations organization ON organization.id = o.organization_id
                WHERE o.id = %s
                  AND o.organization_id = %s
                  AND organization.is_active = TRUE
                FOR UPDATE OF o, organization
                """,
                (ombuds_id, g.organization_id),
            )
            seat = cur.fetchone()
            if seat is None:
                conn.rollback()
                return jsonify({'error': 'Not found', 'message': 'User seat not found'}), 404
            if seat[1] is not None:
                conn.rollback()
                return jsonify({
                    'error': 'Conflict',
                    'message': 'This user seat is already linked to an Auth0 account',
                }), 409
            if not seat[3]:
                conn.rollback()
                return jsonify({
                    'error': 'Conflict',
                    'message': 'Reactivate this user seat before creating an invitation',
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
                WHERE ombuds_id = %s
                  AND claimed_at IS NULL
                  AND revoked_at IS NULL
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
                organization_id=g.organization_id,
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
        logger.exception('Failed to create user invitation')
        return jsonify({'error': 'Database error', 'message': 'Unable to create invitation'}), 500
    finally:
        if conn:
            conn.close()


@admin_views.route('/api/v1/admin/ombuds/<ombuds_id>/status', methods=['PUT'])
def update_ombuds_status(ombuds_id):
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

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            # Lock the organization first so status changes and seat creation
            # cannot race past the seat limit.
            cur.execute(
                """
                SELECT seat_limit
                FROM organizations
                WHERE id = %s AND is_active = TRUE
                FOR UPDATE
                """,
                (g.organization_id,),
            )
            organization = cur.fetchone()
            if organization is None:
                conn.rollback()
                return jsonify({
                    'error': 'Conflict',
                    'message': 'The organization is not active',
                }), 409

            cur.execute(
                """
                SELECT is_admin, is_system_admin, is_active
                FROM ombuds
                WHERE id = %s AND organization_id = %s
                FOR UPDATE
                """,
                (ombuds_id, g.organization_id),
            )
            seat = cur.fetchone()
            if seat is None:
                conn.rollback()
                return jsonify({'error': 'Not found', 'message': 'User seat not found'}), 404
            if seat[1]:
                conn.rollback()
                return jsonify({
                    'error': 'Forbidden',
                    'message': 'System administrator accounts cannot be changed here',
                }), 403
            if not make_active and str(ombuds_id) == str(g.ombuds_id):
                conn.rollback()
                return jsonify({
                    'error': 'Conflict',
                    'message': 'You cannot deactivate your own account',
                }), 409
            if bool(seat[2]) == make_active:
                conn.rollback()
                return jsonify({'success': True, 'isActive': make_active})

            if make_active:
                cur.execute(
                    """
                    SELECT COUNT(*)
                    FROM ombuds
                    WHERE organization_id = %s AND is_active = TRUE
                    """,
                    (g.organization_id,),
                )
                if cur.fetchone()[0] >= organization[0]:
                    conn.rollback()
                    return jsonify({
                        'error': 'Seat limit reached',
                        'message': f'Your organization has reached its {organization[0]}-seat limit',
                    }), 409
            elif seat[0]:
                cur.execute(
                    """
                    SELECT COUNT(*)
                    FROM ombuds
                    WHERE organization_id = %s
                      AND is_admin = TRUE
                      AND is_active = TRUE
                    """,
                    (g.organization_id,),
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
                    WHERE ombuds_id = %s
                      AND claimed_at IS NULL
                      AND revoked_at IS NULL
                    """,
                    (ombuds_id,),
                )
            record_administrative_event(
                cur,
                actor_ombuds_id=g.ombuds_id,
                organization_id=g.organization_id,
                target_ombuds_id=ombuds_id,
                event_type='ombuds_reactivated' if make_active else 'ombuds_deactivated',
                reason=reason,
            )
        conn.commit()
        return jsonify({'success': True, 'isActive': make_active})
    except Exception:
        if conn:
            conn.rollback()
        logger.exception('Failed to update organization user status')
        return jsonify({'error': 'Database error', 'message': 'Unable to update user status'}), 500
    finally:
        if conn:
            conn.close()


@admin_views.route('/api/v1/admin/ombuds/<ombuds_id>/invitation/cancel', methods=['POST'])
def cancel_invitation(ombuds_id):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id
                FROM ombuds
                WHERE id = %s AND organization_id = %s
                FOR UPDATE
                """,
                (ombuds_id, g.organization_id),
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
                    organization_id=g.organization_id,
                    target_ombuds_id=ombuds_id,
                    event_type='ombuds_invitation_cancelled',
                    details={'cancelledInvitationCount': cancelled_count},
                )
        conn.commit()
        return jsonify({'success': True, 'cancelledCount': cancelled_count})
    except Exception:
        if conn:
            conn.rollback()
        logger.exception('Failed to cancel user invitation')
        return jsonify({'error': 'Database error', 'message': 'Unable to cancel invitation'}), 500
    finally:
        if conn:
            conn.close()


@admin_views.route('/api/v1/admin/audit')
def list_audit_events():
    return _list_audit_events(g.organization_id)


def _list_audit_events(organization_id):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
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
                (organization_id,),
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
        logger.exception('Failed to list administrative audit events')
        return jsonify({'error': 'Database error', 'message': 'Unable to load audit log'}), 500
    finally:
        if conn:
            conn.close()
