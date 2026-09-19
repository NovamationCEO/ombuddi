"""Sending history scoped to both the authenticated organization and target seat."""
from flask import jsonify


def email_history(conn, organization_id, ombuds_id):
    with conn.cursor() as cur:
        cur.execute('SELECT id FROM ombuds WHERE id = %s AND organization_id = %s',
                    (ombuds_id, organization_id))
        if cur.fetchone() is None:
            return jsonify({'error': 'Not found', 'message': 'User seat not found'}), 404
        cur.execute(
            """
            SELECT id, created_at, details
            FROM administrative_events
            WHERE organization_id = %s AND target_ombuds_id = %s
              AND event_type = 'ombuds_invitation_email'
            ORDER BY created_at DESC, id DESC
            """, (organization_id, ombuds_id),
        )
        fields = {'invitationId', 'sender', 'status', 'reason', 'stage', 'httpStatus', 'submissionAttempts'}
        return jsonify([{'id': str(row[0]), 'createdAt': row[1].isoformat(),
                         'delivery': {k: v for k, v in row[2].items() if k in fields}}
                        for row in cur.fetchall()])
