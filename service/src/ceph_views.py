import os
from flask import Blueprint, jsonify, send_file

ceph_views = Blueprint('ceph_views', __name__)

# GETTING THESE TO WORK INVOLVES SETTING UP CEPH.  FOR NOW, THAT'S BEYOND WHAT I CAN SET UP, AUTOMATE, OR EVEN EXPLAIN HERE
# BUT THEY'RE INCREDIBLE WHEN THEY DO!
# TALK TO LUCAS

@ceph_views.route('/api/v1/load_geojson_by_chapter_and_name/<chapter>/<name>', methods=['GET'])
def load_geojson_by_chapter_and_name(chapter, name):
    try:
        file_path = f'swqmp/geo/{chapter}/{name}.geojson'

        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()

        return jsonify({"file_content": content, "success": True})

    except FileNotFoundError:
        return jsonify({"message": "No data available for specified chapter and name.",  "status": "file_not_found", "success": False}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

@ceph_views.route('/api/v1/load_tif_by_chapter_and_name/<chapter>/<name>', methods=['GET'])
def load_tif_by_chapter_and_name(chapter, name):
    try:
        # Construct the file path
        file_path = f'swqmp/geo/{chapter}/{name}.tif'
        full_path = os.path.abspath(file_path)

        if not os.path.exists(file_path):
            return jsonify({"error": "File not found"}), 404

        # Send the file as a binary stream
        return send_file(full_path, mimetype='image/tiff')

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
