import hashlib
import os

SALT = os.environ.get('NAME_SALT') or os.environ.get('SALT')
if not SALT:
    raise RuntimeError('NAME_SALT is required and must remain stable for the life of the data')

def hash_name(client_hash: str) -> str:
    to_hash = client_hash + SALT
    return hashlib.sha256(to_hash.encode('utf-8')).hexdigest()
