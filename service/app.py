import os
import logging
from flask import Flask, request, Response, jsonify, g
from flask_cors import CORS
from src.ombuddi_views import ombuddi_views
from src.person_views import person_views
from src.picklist_views import picklist_views
from src.report_views import report_views
from src.admin_views import admin_views
from src.auth_views import auth_views
from src.system_admin_views import system_admin_views
from src.auth import validate_token
from src.principal import PrincipalLookupError, get_principal

logger = logging.getLogger(__name__)
SESSION_DIAGNOSTICS_PATH = '/api/v1/auth/session-diagnostics'
app = Flask(__name__)
app.debug = True
app.register_blueprint(ombuddi_views)
app.register_blueprint(person_views)
app.register_blueprint(picklist_views)
app.register_blueprint(report_views)
app.register_blueprint(admin_views)
app.register_blueprint(auth_views)
app.register_blueprint(system_admin_views)

CORS(app)


def _session_diagnostics(claims, principal):
    token_organization_id = claims.get('organization_id')
    linked = principal is not None
    account_active = principal['is_active'] if linked else None
    organization_active = principal['organization_is_active'] if linked else None
    organization_claim_matches = (
        None
        if not token_organization_id or not linked
        else token_organization_id == principal['organization_id']
    )

    if not linked:
        code = 'ACCOUNT_NOT_LINKED'
        message = (
            'Your Auth0 sign-in is valid, but it is not linked to an Ombuddi user seat. '
            'Ask an organization administrator to send or reissue an invitation for this account.'
        )
    elif not account_active:
        code = 'ACCOUNT_DEACTIVATED'
        message = 'Your Ombuddi user seat is deactivated. Contact an organization administrator.'
    elif not organization_active:
        code = 'ORGANIZATION_DEACTIVATED'
        message = 'Your Ombuddi organization is deactivated. Contact Ombuddi support.'
    elif organization_claim_matches is False:
        code = 'ORGANIZATION_CLAIM_MISMATCH'
        message = (
            'Your Auth0 token names a different organization than your linked Ombuddi seat. '
            'Sign out and back in; if this remains, an administrator must correct the account mapping.'
        )
    else:
        code = 'SESSION_READY'
        message = 'This session is accepted for normal Ombuddi access.'

    return {
        'authenticated': True,
        'linked': linked,
        'accountActive': account_active,
        'organizationActive': organization_active,
        'organizationClaimPresent': bool(token_organization_id),
        'organizationClaimMatches': organization_claim_matches,
        'emailClaimPresent': bool(claims.get('ombuddi_email')),
        'emailVerified': claims.get('ombuddi_email_verified') is True,
        'isOrganizationAdmin': bool(principal and principal['is_admin']),
        'isSystemAdmin': bool(principal and principal['is_system_admin']),
        'canAccessApplication': code == 'SESSION_READY',
        'code': code,
        'message': message,
    }


def _forbidden(code, message):
    logger.warning(
        'Authorization denied code=%s method=%s path=%s',
        code,
        request.method,
        request.path,
    )
    return jsonify({'error': 'Forbidden', 'code': code, 'message': message}), 403

@app.before_request
def authenticate():
    is_session_diagnostics = (
        request.method == 'GET' and request.path == SESSION_DIAGNOSTICS_PATH
    )
    # CORS preflight — no auth needed.
    if request.method == 'OPTIONS':
        return Response()
    # Health check endpoint — no auth.
    if request.path == '/':
        return

    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Unauthorized', 'message': 'Missing Bearer token'}), 401

    token = auth_header[7:]
    try:
        claims = validate_token(token)
    except Exception:
        logger.warning('Rejected invalid access token', exc_info=True)
        return jsonify({'error': 'Unauthorized', 'message': 'Invalid access token'}), 401

    auth0_sub = claims.get('sub')
    if not auth0_sub:
        return jsonify({'error': 'Unauthorized', 'message': 'Token missing sub claim'}), 401

    # This is deliberately set before local-principal resolution. It is the
    # only identity available to the invitation-claim endpoint for a user who
    # has authenticated with Auth0 but has not linked an Ombuddi seat yet.
    g.auth0_sub = auth0_sub
    g.auth0_email = claims.get('ombuddi_email')
    g.auth0_email_verified = claims.get('ombuddi_email_verified') is True

    try:
        principal = get_principal(auth0_sub)
    except PrincipalLookupError:
        return jsonify({
            'error': 'Service unavailable',
            'message': 'Unable to resolve the authenticated Ombuddi account',
        }), 503

    g.session_diagnostics = _session_diagnostics(claims, principal)

    if principal is None:
        if is_session_diagnostics:
            return
        if request.path == '/api/v1/auth/claim-invitation':
            return
        return _forbidden(
            'ACCOUNT_NOT_LINKED',
            'Authenticated account is not linked to an Ombuddi user',
        )

    # Auth0's `sub` identifies the external account. Local UUIDs and ownership
    # always come from the linked ombuds row, never from request data.
    g.ombuds_id = principal['ombuds_id']
    g.organization_id = principal['organization_id']
    g.is_admin = principal['is_admin']
    g.is_system_admin = principal['is_system_admin']

    if is_session_diagnostics:
        return

    if not principal['is_active']:
        return _forbidden('ACCOUNT_DEACTIVATED', 'This Ombuddi user account is deactivated')
    if not principal['organization_is_active']:
        return _forbidden(
            'ORGANIZATION_DEACTIVATED',
            'This Ombuddi organization is deactivated',
        )

    # During the transition the Auth0 Action may still emit an organization
    # claim. If present, reject stale/misconfigured claims instead of silently
    # accepting an identity mapped to a different organization.
    token_organization_id = claims.get('organization_id')
    if token_organization_id and token_organization_id != g.organization_id:
        return _forbidden(
            'ORGANIZATION_CLAIM_MISMATCH',
            'Token organization does not match the linked Ombuddi account',
        )

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Referrer-Policy"] = "no-referrer"
    if (
        'invitation' in request.path
        or request.path == '/api/v1/auth/claim-invitation'
        or request.path == SESSION_DIAGNOSTICS_PATH
    ):
        response.headers["Cache-Control"] = "no-store"
    return response

@app.route('/')
def hello_world():
    return "Service layer is running properly"

if __name__ == '__main__':
    print(app.url_map)
    app.run(host='0.0.0.0', port=5000)
