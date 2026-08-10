import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone

from flask import Blueprint, g, jsonify, request

from connection import get_db_connection


admin_views = Blueprint('admin_views', __name__)


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
                    COUNT(ombuds.id)                                    AS seat_count,
                    COUNT(ombuds.id) FILTER (WHERE ombuds.auth0_sub IS NOT NULL) AS linked_count
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
            'linkedCount': row[5],
        })
    except Exception:
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
    email = str(payload.get('email', '')).strip().lower() or None
    is_admin = payload.get('isAdmin') is True

    if not name:
        return jsonify({'error': 'Input error', 'message': 'Name is required'}), 400

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT seat_limit, COUNT(ombuds.id) AS seat_count
                FROM organizations
                LEFT JOIN ombuds ON ombuds.organization_id = organizations.id
                WHERE organizations.id = %s
                GROUP BY organizations.seat_limit
                """,
                (g.organization_id,),
            )
            row = cur.fetchone()
            if row and row[1] >= row[0]:
                conn.rollback()
                return jsonify({
                    'error': 'Seat limit reached',
                    'message': f'Your organization has reached its {row[0]}-seat limit',
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
        return jsonify({'error': 'Database error', 'message': 'Unable to create user seat'}), 500
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
                SELECT id, auth0_sub
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
            if seat[1] is not None:
                conn.rollback()
                return jsonify({
                    'error': 'Conflict',
                    'message': 'This user seat is already linked to an Auth0 account',
                }), 409

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
