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
