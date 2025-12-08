"""
Gift Name Shuffler Backend API

This Flask application provides a REST API for managing gift exchanges,
including persons, groups, occasions, and editions with their assignments.

All data is stored in an Apache Jena Fuseki triplestore using RDF.
"""

import os
import random
import time
from flask import Flask, jsonify, request
from flask_cors import CORS
from typing import List, Tuple, Set

import sparql_client as db

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend access


# =============================================================================
# Health Check
# =============================================================================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    fuseki_ready = db.check_fuseki_ready()
    return jsonify({
        "status": "healthy" if fuseki_ready else "degraded",
        "fuseki": "connected" if fuseki_ready else "disconnected"
    }), 200 if fuseki_ready else 503


# =============================================================================
# Person Endpoints
# =============================================================================

@app.route('/api/persons', methods=['GET'])
def get_persons():
    """Get all persons."""
    try:
        persons = db.get_all_persons()
        return jsonify(persons)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/persons', methods=['POST'])
def create_person():
    """
    Create a new person.

    Request body: { "name": "Person Name" }
    """
    data = request.get_json()

    if not data or not data.get('name'):
        return jsonify({"error": "Name is required"}), 400

    try:
        person = db.create_person(data['name'])
        return jsonify(person), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/persons/<path:uri>', methods=['DELETE'])
def delete_person(uri: str):
    """Delete a person by URI."""
    try:
        db.delete_person(uri)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =============================================================================
# Group Endpoints
# =============================================================================

@app.route('/api/groups', methods=['GET'])
def get_groups():
    """Get all groups with their members."""
    try:
        groups = db.get_all_groups()
        return jsonify(groups)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/groups', methods=['POST'])
def create_group():
    """
    Create a new group.

    Request body: { "name": "Group Name" }
    """
    data = request.get_json()

    if not data or not data.get('name'):
        return jsonify({"error": "Name is required"}), 400

    try:
        group = db.create_group(data['name'])
        return jsonify(group), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/groups/<path:uri>', methods=['DELETE'])
def delete_group(uri: str):
    """Delete a group by URI."""
    try:
        db.delete_group(uri)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/groups/<path:uri>/members', methods=['POST'])
def add_group_member(uri: str):
    """
    Add a member to a group.

    Request body: { "personUri": "person-uri" }
    """
    data = request.get_json()

    if not data or not data.get('personUri'):
        return jsonify({"error": "personUri is required"}), 400

    try:
        db.add_member_to_group(uri, data['personUri'])
        return jsonify({"success": True}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/groups/<path:group_uri>/members/<path:person_uri>', methods=['DELETE'])
def remove_group_member(group_uri: str, person_uri: str):
    """Remove a member from a group."""
    try:
        db.remove_member_from_group(group_uri, person_uri)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =============================================================================
# Occasion Endpoints
# =============================================================================

@app.route('/api/occasions', methods=['GET'])
def get_occasions():
    """Get all occasions."""
    try:
        occasions = db.get_all_occasions()
        return jsonify(occasions)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/occasions', methods=['POST'])
def create_occasion():
    """
    Create a new occasion.

    Request body: { "name": "Christmas 2025", "description": "optional" }
    """
    data = request.get_json()

    if not data or not data.get('name'):
        return jsonify({"error": "Name is required"}), 400

    try:
        occasion = db.create_occasion(
            data['name'],
            data.get('description', '')
        )
        return jsonify(occasion), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/occasions/<path:uri>', methods=['DELETE'])
def delete_occasion(uri: str):
    """Delete an occasion by URI."""
    try:
        db.delete_occasion(uri)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =============================================================================
# Edition Endpoints
# =============================================================================

@app.route('/api/editions', methods=['GET'])
def get_editions():
    """Get all editions."""
    try:
        # Check for optional filters
        group_uri = request.args.get('groupUri')
        occasion_uri = request.args.get('occasionUri')

        if group_uri and occasion_uri:
            editions = db.get_editions_for_group_and_occasion(group_uri, occasion_uri)
        else:
            editions = db.get_all_editions()

        return jsonify(editions)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/editions', methods=['POST'])
def create_edition():
    """
    Create a new edition for a group and occasion.

    Request body: {
        "groupUri": "group-uri",
        "occasionUri": "occasion-uri",
        "name": "optional custom name"
    }
    """
    data = request.get_json()

    if not data or not data.get('groupUri') or not data.get('occasionUri'):
        return jsonify({"error": "groupUri and occasionUri are required"}), 400

    try:
        edition = db.create_edition(
            data['groupUri'],
            data['occasionUri'],
            data.get('name', '')
        )
        return jsonify(edition), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/editions/<path:uri>', methods=['GET'])
def get_edition(uri: str):
    """Get a single edition by URI."""
    try:
        edition = db.get_edition(uri)
        if not edition:
            return jsonify({"error": "Edition not found"}), 404
        return jsonify(edition)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/editions/<path:uri>', methods=['DELETE'])
def delete_edition(uri: str):
    """Delete an edition by URI."""
    try:
        db.delete_edition(uri)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =============================================================================
# Shuffle (Assignment) Endpoints
# =============================================================================

@app.route('/api/editions/<path:uri>/shuffle', methods=['POST'])
def shuffle_edition(uri: str):
    """
    Run the name shuffler for an edition.

    This endpoint:
    1. Gets all members of the edition's group
    2. Retrieves previous assignments for the same group+occasion
    3. Generates valid random assignments respecting all rules:
       - No one picks themselves
       - No repeats from previous editions
    4. Creates SecretSantaAction instances for the assignments
    """
    try:
        # Get the edition details
        edition = db.get_edition(uri)
        if not edition:
            return jsonify({"error": "Edition not found"}), 404

        if edition['isShuffled']:
            return jsonify({"error": "This edition has already been shuffled"}), 400

        # Get group members
        members = db.get_group_members(edition['groupUri'])

        if len(members) < 2:
            return jsonify({"error": "Need at least 2 members in the group to shuffle"}), 400

        # Get previous assignments to avoid
        previous_pairs = db.get_previous_assignments(
            edition['groupUri'],
            edition['occasionUri']
        )
        forbidden_pairs: Set[Tuple[str, str]] = set(previous_pairs)

        # Run the shuffle algorithm
        member_uris = [m['uri'] for m in members]
        assignments = generate_valid_assignments(member_uris, forbidden_pairs)

        if assignments is None:
            return jsonify({
                "error": "Could not generate valid assignments. "
                         "Too many previous editions may have exhausted all possible combinations."
            }), 409

        # Save assignments to triplestore
        db.create_assignments(uri, assignments)

        # Return the assignments with names
        return jsonify({
            "success": True,
            "assignments": db.get_edition_assignments(uri)
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/editions/<path:uri>/assignments', methods=['GET'])
def get_assignments(uri: str):
    """Get all assignments for an edition."""
    try:
        assignments = db.get_edition_assignments(uri)
        return jsonify(assignments)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =============================================================================
# Shuffle Algorithm
# =============================================================================

def generate_valid_assignments(
    member_uris: List[str],
    forbidden_pairs: Set[Tuple[str, str]],
    max_attempts: int = 1000
) -> List[Tuple[str, str]] | None:
    """
    Generate valid Secret Santa assignments.

    Algorithm:
    1. Creates a random derangement (permutation where no element stays in place)
    2. Checks that no (giver, recipient) pair is in the forbidden set
    3. Retries up to max_attempts times if invalid

    A derangement ensures no one picks themselves (Rule 2).
    The forbidden_pairs check ensures no repeat assignments (Rule 3).

    Args:
        member_uris: List of member URIs to assign
        forbidden_pairs: Set of (giver, recipient) pairs to avoid
        max_attempts: Maximum number of shuffle attempts

    Returns:
        List of (giver, recipient) tuples, or None if no valid assignment found
    """
    n = len(member_uris)

    for attempt in range(max_attempts):
        # Generate a random derangement using rejection sampling
        # A derangement is a permutation where no element appears in its original position
        recipients = list(member_uris)
        random.shuffle(recipients)

        # Check if it's a valid derangement (no self-assignments)
        is_derangement = all(
            member_uris[i] != recipients[i]
            for i in range(n)
        )

        if not is_derangement:
            continue

        # Create assignment pairs
        assignments = [
            (member_uris[i], recipients[i])
            for i in range(n)
        ]

        # Check against forbidden pairs (previous assignments)
        has_forbidden = any(pair in forbidden_pairs for pair in assignments)

        if not has_forbidden:
            return assignments

    # Could not find valid assignment after max_attempts
    return None


# =============================================================================
# Initialization
# =============================================================================

def initialize_triplestore():
    """
    Initialize the triplestore with ontology files.

    This is called on startup to ensure the ontology is loaded.
    """
    max_retries = 30
    retry_delay = 2

    print("Waiting for Fuseki to be ready...")

    for i in range(max_retries):
        if db.check_fuseki_ready():
            print("Fuseki is ready!")
            break
        print(f"Fuseki not ready, retrying in {retry_delay}s... ({i+1}/{max_retries})")
        time.sleep(retry_delay)
    else:
        print("WARNING: Could not connect to Fuseki after maximum retries")
        return

    # Ensure dataset exists
    if db.ensure_dataset_exists():
        print(f"Dataset '{db.DATASET_NAME}' is ready")
    else:
        print(f"WARNING: Could not ensure dataset '{db.DATASET_NAME}' exists")
        return

    # Load ontology files
    ontology_dir = os.environ.get('ONTOLOGY_DIR', '/app/ontology')

    ontology_file = os.path.join(ontology_dir, 'gift.ttl')
    shapes_file = os.path.join(ontology_dir, 'gift-shapes.ttl')

    try:
        if os.path.exists(ontology_file):
            db.load_ontology_file(ontology_file)
            print(f"Loaded ontology from {ontology_file}")

        if os.path.exists(shapes_file):
            db.load_ontology_file(shapes_file)
            print(f"Loaded SHACL shapes from {shapes_file}")
    except Exception as e:
        print(f"Warning: Could not load ontology files: {e}")


# Initialize on startup
with app.app_context():
    initialize_triplestore()


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    app.run(host='0.0.0.0', port=port, debug=debug)
