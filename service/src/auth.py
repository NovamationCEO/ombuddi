import os
import jwt
from jwt import PyJWKClient

AUTH0_DOMAIN = os.getenv('AUTH0_DOMAIN', 'ombuddi-alpha.us.auth0.com')
AUTH0_AUDIENCE = os.getenv('AUTH0_AUDIENCE', '')
JWKS_URL = f"https://{AUTH0_DOMAIN}/.well-known/jwks.json"

# Custom claim namespace — must match the Auth0 Action that injects organization_id.
CLAIM_ORG_ID = 'https://ombuddi.com/organization_id'

_jwks_client: PyJWKClient | None = None

def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = PyJWKClient(JWKS_URL, cache_keys=True)
    return _jwks_client

def validate_token(token: str) -> dict:
    """Validate an Auth0-issued JWT and return its claims."""
    client = _get_jwks_client()
    signing_key = client.get_signing_key_from_jwt(token)

    decode_kwargs: dict = {
        "algorithms": ["RS256"],
        "issuer": f"https://{AUTH0_DOMAIN}/",
    }
    if AUTH0_AUDIENCE:
        decode_kwargs["audience"] = AUTH0_AUDIENCE
    else:
        decode_kwargs["options"] = {"verify_aud": False}

    claims = jwt.decode(token, signing_key.key, **decode_kwargs)

    # Remap the namespaced custom claim to the simple key app.py expects.
    claims['organization_id'] = claims.get(CLAIM_ORG_ID)
    return claims
