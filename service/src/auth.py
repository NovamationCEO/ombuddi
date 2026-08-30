import os
import jwt
from jwt import PyJWKClient

AUTH0_DOMAIN = os.getenv('AUTH0_DOMAIN', 'ombuddi-alpha.us.auth0.com')
AUTH0_AUDIENCE = os.getenv('AUTH0_AUDIENCE', '')
JWKS_URL = f"https://{AUTH0_DOMAIN}/.well-known/jwks.json"

# Custom claim namespace — must match the Auth0 Action that injects organization_id.
CLAIM_ORG_ID = 'https://ombuddi.com/organization_id'
CLAIM_EMAIL = 'https://ombuddi.com/email'
CLAIM_EMAIL_VERIFIED = 'https://ombuddi.com/email_verified'

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

    # Prefer Ombuddi's namespaced access-token claims. Auth0 can also issue
    # signed standard OIDC email claims when the email scope is requested;
    # accepting those provides a safe fallback without trusting browser data.
    namespaced_email = claims.get(CLAIM_EMAIL)
    standard_email = claims.get('email')
    if isinstance(namespaced_email, str) and namespaced_email.strip():
        email = namespaced_email
        email_verified = claims.get(CLAIM_EMAIL_VERIFIED) is True
        email_claim_source = 'namespaced'
    elif isinstance(standard_email, str) and standard_email.strip():
        email = standard_email
        email_verified = claims.get('email_verified') is True
        email_claim_source = 'standard'
    else:
        email = None
        email_verified = False
        email_claim_source = 'missing'

    claims['organization_id'] = claims.get(CLAIM_ORG_ID)
    claims['ombuddi_email'] = email
    claims['ombuddi_email_verified'] = email_verified
    claims['ombuddi_email_claim_source'] = email_claim_source
    return claims
