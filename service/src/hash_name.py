import hashlib
import os

SALT = os.environ.get('NAME_SALT', 'fallback-salt')

def hash_name(client_hash: str) -> str:
    to_hash = client_hash + SALT
    return hashlib.sha256(to_hash.encode('utf-8')).hexdigest()