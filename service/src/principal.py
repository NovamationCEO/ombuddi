import logging

from connection import get_db_connection


logger = logging.getLogger(__name__)


class PrincipalLookupError(Exception):
    """The authenticated subject could not be resolved because the DB failed."""


def get_principal(auth0_sub: str) -> dict | None:
    """Resolve an Auth0 subject to Ombuddi's local user and organization IDs."""
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    ombuds.id,
                    ombuds.organization_id,
                    ombuds.is_admin,
                    ombuds.is_system_admin,
                    ombuds.is_active,
                    organizations.is_active
                FROM ombuds
                JOIN organizations ON organizations.id = ombuds.organization_id
                WHERE ombuds.auth0_sub = %s
                """,
                (auth0_sub,),
            )
            row = cur.fetchone()
    except Exception as exc:
        logger.exception("Failed to resolve authenticated Ombuddi principal")
        raise PrincipalLookupError from exc
    finally:
        if conn:
            conn.close()

    if row is None:
        return None

    return {
        "ombuds_id": str(row[0]),
        "organization_id": str(row[1]),
        "is_admin": bool(row[2]),
        "is_system_admin": bool(row[3]),
        "is_active": bool(row[4]),
        "organization_is_active": bool(row[5]),
    }
