import os
import jwt
from jwt import PyJWKClient

KEYCLOAK_URL = os.getenv('KEYCLOAK_URL', 'http://localhost:5001')
KEYCLOAK_REALM = os.getenv('KEYCLOAK_REALM', 'ombuddi')
JWKS_URL = f"{KEYCLOAK_URL}/realms/{KEYCLOAK_REALM}/protocol/openid-connect/certs"

# Cached lazily — fetched on first token validation, not at import time.
# This avoids a startup race when Keycloak is still booting in docker-compose.
_jwks_client: PyJWKClient | None = None

def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = PyJWKClient(JWKS_URL, cache_keys=True)
    return _jwks_client

def validate_token(token: str) -> dict:
    """Validate a Keycloak-issued JWT and return its claims."""
    client = _get_jwks_client()
    signing_key = client.get_signing_key_from_jwt(token)
    return jwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256"],
        options={"verify_aud": False},
    )
