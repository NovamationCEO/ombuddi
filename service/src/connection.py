import os
import psycopg2

DATABASES = {
    "default": {
        "host": os.getenv("DB_HOST"),
        "port": os.getenv("DB_PORT"),
        "user": os.getenv("DB_USER"),
        "password": os.getenv("DB_PASS"),
        "database": os.getenv("DB_NAME"),
    },
    "user_management": {
        "host": os.getenv("DB_HOST"),
        "port": os.getenv("DB_PORT"),
        "user": os.getenv("DB_UM_USER"),
        "password": os.getenv("DB_UM_PASS"),
        "database": os.getenv("DB_UM_NAME"),
    },
}

def get_db_connection(db_key="default"):
    if db_key not in DATABASES:
        raise ValueError(f"Invalid database key: {db_key}")
    
    config = DATABASES[db_key]
    
    conn = psycopg2.connect(
        host=config["host"],
        port=config["port"],
        user=config["user"],
        password=config["password"],
        database=config["database"],
    )
    conn.autocommit = True
    return conn