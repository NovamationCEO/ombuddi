import json


def record_administrative_event(
    cur,
    *,
    actor_ombuds_id,
    organization_id,
    event_type,
    target_ombuds_id=None,
    reason=None,
    details=None,
):
    """Append a privileged-action event without ever storing invitation secrets."""
    cur.execute(
        """
        INSERT INTO administrative_events (
            actor_ombuds_id,
            organization_id,
            target_ombuds_id,
            event_type,
            reason,
            details
        )
        VALUES (%s, %s, %s, %s, %s, %s::jsonb)
        """,
        (
            actor_ombuds_id,
            organization_id,
            target_ombuds_id,
            event_type,
            reason,
            json.dumps(details or {}),
        ),
    )
