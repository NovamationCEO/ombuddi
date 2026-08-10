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

@app.before_request
def authenticate():
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

    if principal is None:
        if request.path == '/api/v1/auth/claim-invitation':
            return
        return jsonify({
            'error': 'Forbidden',
            'message': 'Authenticated account is not linked to an Ombuddi user',
        }), 403

    # Auth0's `sub` identifies the external account. Local UUIDs and ownership
    # always come from the linked ombuds row, never from request data.
    g.ombuds_id = principal['ombuds_id']
    g.organization_id = principal['organization_id']
    g.is_admin = principal['is_admin']
    g.is_system_admin = principal['is_system_admin']

    if not principal['is_active']:
        return jsonify({
            'error': 'Forbidden',
            'message': 'This Ombuddi user account is deactivated',
        }), 403
    if not principal['organization_is_active']:
        return jsonify({
            'error': 'Forbidden',
            'message': 'This Ombuddi organization is deactivated',
        }), 403

    # During the transition the Auth0 Action may still emit an organization
    # claim. If present, reject stale/misconfigured claims instead of silently
    # accepting an identity mapped to a different organization.
    token_organization_id = claims.get('organization_id')
    if token_organization_id and token_organization_id != g.organization_id:
        return jsonify({
            'error': 'Forbidden',
            'message': 'Token organization does not match the linked Ombuddi account',
        }), 403

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    return response

@app.route('/')
def hello_world():
    return "Service layer is running properly"

if __name__ == '__main__':
    print(app.url_map)
    app.run(host='0.0.0.0', port=5000)
