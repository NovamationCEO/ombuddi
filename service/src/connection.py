import os
import psycopg2
from contextlib import contextmanager

def get_db_connection(db_key="default"):
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        # Pass the DSN through intact so SSL mode, connection options, and
        # percent-encoded credentials supplied by the provider are preserved.
        conn = psycopg2.connect(database_url, connect_timeout=10)
    else:
        conn = psycopg2.connect(
            host=os.getenv("DB_HOST"),
            port=os.getenv("DB_PORT"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASS"),
            database=os.getenv("DB_NAME"),
        )
    # Callers explicitly commit complete units of work.  Keeping autocommit off
    # is also required for SELECT ... FOR UPDATE locks to survive until the
    # corresponding write has completed.
    conn.autocommit = False
    return conn


@contextmanager
def managed_connection(connection_factory=get_db_connection, db_key="default"):
    """Commit successful work, roll back failures, and always close the DB.

    A factory can be supplied by callers so route-level unit tests can continue
    replacing their local `get_db_connection` reference with a fake.
    """
    conn = None
    try:
        conn = (
            connection_factory()
            if db_key == "default"
            else connection_factory(db_key)
        )
        yield conn
        conn.commit()
    except Exception:
        if conn is not None:
            conn.rollback()
        raise
    finally:
        if conn is not None:
            conn.close()
