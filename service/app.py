from flask import Flask, request, Response, jsonify, g
from flask_cors import CORS
from src.ombuddi_views import ombuddi_views
from src.person_views import person_views
from src.picklist_views import picklist_views
from src.report_views import report_views
from src.auth import validate_token

app = Flask(__name__)
app.debug = True
app.register_blueprint(ombuddi_views)
app.register_blueprint(person_views)
app.register_blueprint(picklist_views)
app.register_blueprint(report_views)

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
    except Exception as e:
        return jsonify({'error': 'Unauthorized', 'message': f'Invalid token: {e}'}), 401

    g.ombuds_id = claims.get('sub')
    g.organization_id = claims.get('organization_id')

    if not g.organization_id:
        return jsonify({'error': 'Unauthorized', 'message': 'Token missing organization_id claim'}), 401

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "http://localhost:5173"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    return response

@app.route('/')
def hello_world():
    return "Service layer is running properly"

if __name__ == '__main__':
    print(app.url_map)
    app.run(host='0.0.0.0', port=5000)
