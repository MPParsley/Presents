"""
SPARQL Client for interacting with Apache Jena Fuseki.

This module provides helper functions for executing SPARQL queries and updates
against the Fuseki triplestore. All RDF data operations go through this module.
"""

import os
from SPARQLWrapper import SPARQLWrapper, JSON, POST, POSTDIRECTLY
import requests
from typing import List, Dict, Any, Optional, Tuple
import uuid

# Configuration from environment variables
FUSEKI_URL = os.environ.get('FUSEKI_URL', 'http://fuseki:3030')
DATASET_NAME = os.environ.get('FUSEKI_DATASET', 'gifts')

# SPARQL endpoints
QUERY_ENDPOINT = f"{FUSEKI_URL}/{DATASET_NAME}/query"
UPDATE_ENDPOINT = f"{FUSEKI_URL}/{DATASET_NAME}/update"
DATA_ENDPOINT = f"{FUSEKI_URL}/{DATASET_NAME}/data"

# Namespace prefixes used in queries
PREFIXES = """
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX schema: <http://schema.org/>
PREFIX seg: <https://segersrosseel.be/ns/gift#>
"""

# Base URI for generating resource URIs
BASE_URI = "https://segersrosseel.be/data/"


def generate_uri(resource_type: str) -> str:
    """Generate a unique URI for a new resource."""
    return f"{BASE_URI}{resource_type}/{uuid.uuid4()}"


def execute_query(query: str) -> Dict[str, Any]:
    """
    Execute a SPARQL SELECT query and return results as JSON.

    Args:
        query: SPARQL SELECT query string

    Returns:
        Query results as a dictionary with 'head' and 'results' keys
    """
    sparql = SPARQLWrapper(QUERY_ENDPOINT)
    sparql.setQuery(PREFIXES + query)
    sparql.setReturnFormat(JSON)

    try:
        results = sparql.query().convert()
        return results
    except Exception as e:
        raise Exception(f"SPARQL query failed: {str(e)}")


def execute_update(update: str) -> bool:
    """
    Execute a SPARQL UPDATE query.

    Args:
        update: SPARQL UPDATE query string

    Returns:
        True if successful
    """
    sparql = SPARQLWrapper(UPDATE_ENDPOINT)
    sparql.setMethod(POST)
    sparql.setRequestMethod(POSTDIRECTLY)
    sparql.setQuery(PREFIXES + update)

    try:
        sparql.query()
        return True
    except Exception as e:
        raise Exception(f"SPARQL update failed: {str(e)}")


def load_ontology_file(file_path: str, graph_uri: Optional[str] = None) -> bool:
    """
    Load a Turtle file into the triplestore.

    Args:
        file_path: Path to the .ttl file
        graph_uri: Optional named graph URI

    Returns:
        True if successful
    """
    with open(file_path, 'r') as f:
        turtle_data = f.read()

    headers = {'Content-Type': 'text/turtle'}
    url = DATA_ENDPOINT
    if graph_uri:
        url += f"?graph={graph_uri}"

    try:
        response = requests.post(url, data=turtle_data.encode('utf-8'), headers=headers)
        response.raise_for_status()
        return True
    except Exception as e:
        raise Exception(f"Failed to load ontology: {str(e)}")


# =============================================================================
# Person Operations
# =============================================================================

def create_person(name: str) -> Dict[str, str]:
    """
    Create a new foaf:Person in the triplestore.

    Args:
        name: The person's name

    Returns:
        Dictionary with 'uri' and 'name' of created person
    """
    uri = generate_uri("person")

    update = f"""
    INSERT DATA {{
        <{uri}> a foaf:Person ;
                foaf:name "{name}"^^xsd:string .
    }}
    """

    execute_update(update)
    return {"uri": uri, "name": name}


def get_all_persons() -> List[Dict[str, str]]:
    """
    Get all persons from the triplestore.

    Returns:
        List of dictionaries with 'uri' and 'name' for each person
    """
    query = """
    SELECT ?uri ?name WHERE {
        ?uri a foaf:Person ;
             foaf:name ?name .
    }
    ORDER BY ?name
    """

    results = execute_query(query)
    return [
        {"uri": binding["uri"]["value"], "name": binding["name"]["value"]}
        for binding in results["results"]["bindings"]
    ]


def delete_person(uri: str) -> bool:
    """Delete a person and remove them from all groups."""
    update = f"""
    DELETE WHERE {{
        <{uri}> ?p ?o .
    }};
    DELETE WHERE {{
        ?group foaf:member <{uri}> .
    }}
    """
    return execute_update(update)


# =============================================================================
# Group Operations
# =============================================================================

def create_group(name: str) -> Dict[str, str]:
    """
    Create a new foaf:Group in the triplestore.

    Args:
        name: The group's name

    Returns:
        Dictionary with 'uri' and 'name' of created group
    """
    uri = generate_uri("group")

    update = f"""
    INSERT DATA {{
        <{uri}> a foaf:Group ;
                foaf:name "{name}"^^xsd:string .
    }}
    """

    execute_update(update)
    return {"uri": uri, "name": name}


def get_all_groups() -> List[Dict[str, Any]]:
    """
    Get all groups with their members.

    Returns:
        List of group dictionaries with 'uri', 'name', and 'members' list
    """
    # First get all groups
    group_query = """
    SELECT ?uri ?name WHERE {
        ?uri a foaf:Group ;
             foaf:name ?name .
    }
    ORDER BY ?name
    """

    group_results = execute_query(group_query)
    groups = []

    for binding in group_results["results"]["bindings"]:
        group_uri = binding["uri"]["value"]
        group_name = binding["name"]["value"]

        # Get members for this group
        member_query = f"""
        SELECT ?memberUri ?memberName WHERE {{
            <{group_uri}> foaf:member ?memberUri .
            ?memberUri foaf:name ?memberName .
        }}
        ORDER BY ?memberName
        """

        member_results = execute_query(member_query)
        members = [
            {"uri": m["memberUri"]["value"], "name": m["memberName"]["value"]}
            for m in member_results["results"]["bindings"]
        ]

        groups.append({
            "uri": group_uri,
            "name": group_name,
            "members": members
        })

    return groups


def add_member_to_group(group_uri: str, person_uri: str) -> bool:
    """
    Add a person as a member of a group.

    Args:
        group_uri: URI of the group
        person_uri: URI of the person to add

    Returns:
        True if successful
    """
    update = f"""
    INSERT DATA {{
        <{group_uri}> foaf:member <{person_uri}> .
    }}
    """
    return execute_update(update)


def remove_member_from_group(group_uri: str, person_uri: str) -> bool:
    """Remove a person from a group."""
    update = f"""
    DELETE DATA {{
        <{group_uri}> foaf:member <{person_uri}> .
    }}
    """
    return execute_update(update)


def delete_group(uri: str) -> bool:
    """Delete a group."""
    update = f"""
    DELETE WHERE {{
        <{uri}> ?p ?o .
    }}
    """
    return execute_update(update)


def get_group_members(group_uri: str) -> List[Dict[str, str]]:
    """
    Get all members of a specific group.

    Args:
        group_uri: URI of the group

    Returns:
        List of member dictionaries with 'uri' and 'name'
    """
    query = f"""
    SELECT ?uri ?name WHERE {{
        <{group_uri}> foaf:member ?uri .
        ?uri foaf:name ?name .
    }}
    ORDER BY ?name
    """

    results = execute_query(query)
    return [
        {"uri": binding["uri"]["value"], "name": binding["name"]["value"]}
        for binding in results["results"]["bindings"]
    ]


# =============================================================================
# Occasion Operations
# =============================================================================

def create_occasion(name: str, description: str = "") -> Dict[str, str]:
    """
    Create a new schema:Event (occasion) in the triplestore.

    Args:
        name: The occasion's name (e.g., "Christmas 2025")
        description: Optional description

    Returns:
        Dictionary with occasion details
    """
    uri = generate_uri("occasion")

    desc_triple = f'schema:description "{description}"^^xsd:string ;' if description else ""

    update = f"""
    INSERT DATA {{
        <{uri}> a schema:Event ;
                schema:name "{name}"^^xsd:string ;
                {desc_triple}
                seg:createdAt "{get_current_datetime()}"^^xsd:dateTime .
    }}
    """

    execute_update(update)
    return {"uri": uri, "name": name, "description": description}


def get_all_occasions() -> List[Dict[str, str]]:
    """Get all occasions from the triplestore."""
    query = """
    SELECT ?uri ?name ?description WHERE {
        ?uri a schema:Event ;
             schema:name ?name .
        OPTIONAL { ?uri schema:description ?description }
    }
    ORDER BY ?name
    """

    results = execute_query(query)
    return [
        {
            "uri": binding["uri"]["value"],
            "name": binding["name"]["value"],
            "description": binding.get("description", {}).get("value", "")
        }
        for binding in results["results"]["bindings"]
    ]


def delete_occasion(uri: str) -> bool:
    """Delete an occasion."""
    update = f"""
    DELETE WHERE {{
        <{uri}> ?p ?o .
    }}
    """
    return execute_update(update)


# =============================================================================
# Edition Operations
# =============================================================================

def get_current_datetime() -> str:
    """Get current datetime in ISO format."""
    from datetime import datetime
    return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")


def get_next_edition_number(group_uri: str, occasion_uri: str) -> int:
    """
    Get the next edition number for a group+occasion combination.

    Args:
        group_uri: URI of the group
        occasion_uri: URI of the occasion

    Returns:
        Next edition number (1 if no previous editions)
    """
    query = f"""
    SELECT (MAX(?num) AS ?maxNum) WHERE {{
        ?edition a seg:Edition ;
                 seg:set <{group_uri}> ;
                 seg:occasion <{occasion_uri}> ;
                 seg:editionNumber ?num .
    }}
    """

    results = execute_query(query)
    bindings = results["results"]["bindings"]

    if bindings and bindings[0].get("maxNum"):
        return int(bindings[0]["maxNum"]["value"]) + 1
    return 1


def create_edition(group_uri: str, occasion_uri: str, name: str = "") -> Dict[str, Any]:
    """
    Create a new Edition for a group and occasion.

    Args:
        group_uri: URI of the group participating
        occasion_uri: URI of the occasion
        name: Optional custom name for the edition

    Returns:
        Dictionary with edition details
    """
    uri = generate_uri("edition")
    edition_number = get_next_edition_number(group_uri, occasion_uri)
    created_at = get_current_datetime()

    # Get group and occasion names for the default label
    if not name:
        group_query = f'SELECT ?name WHERE {{ <{group_uri}> foaf:name ?name }}'
        occasion_query = f'SELECT ?name WHERE {{ <{occasion_uri}> schema:name ?name }}'

        group_result = execute_query(group_query)
        occasion_result = execute_query(occasion_query)

        group_name = group_result["results"]["bindings"][0]["name"]["value"]
        occasion_name = occasion_result["results"]["bindings"][0]["name"]["value"]
        name = f"{group_name} – {occasion_name} – Edition {edition_number}"

    update = f"""
    INSERT DATA {{
        <{uri}> a seg:Edition ;
                rdfs:label "{name}"^^xsd:string ;
                seg:set <{group_uri}> ;
                seg:occasion <{occasion_uri}> ;
                seg:editionNumber {edition_number} ;
                seg:isShuffled false ;
                seg:createdAt "{created_at}"^^xsd:dateTime .
    }}
    """

    execute_update(update)

    return {
        "uri": uri,
        "name": name,
        "groupUri": group_uri,
        "occasionUri": occasion_uri,
        "editionNumber": edition_number,
        "isShuffled": False,
        "createdAt": created_at
    }


def get_all_editions() -> List[Dict[str, Any]]:
    """Get all editions with their details."""
    query = """
    SELECT ?uri ?name ?groupUri ?groupName ?occasionUri ?occasionName
           ?editionNumber ?isShuffled ?createdAt WHERE {
        ?uri a seg:Edition ;
             rdfs:label ?name ;
             seg:set ?groupUri ;
             seg:occasion ?occasionUri ;
             seg:editionNumber ?editionNumber ;
             seg:createdAt ?createdAt .
        ?groupUri foaf:name ?groupName .
        ?occasionUri schema:name ?occasionName .
        OPTIONAL { ?uri seg:isShuffled ?isShuffled }
    }
    ORDER BY DESC(?createdAt)
    """

    results = execute_query(query)
    editions = []

    for binding in results["results"]["bindings"]:
        is_shuffled = binding.get("isShuffled", {}).get("value", "false")
        editions.append({
            "uri": binding["uri"]["value"],
            "name": binding["name"]["value"],
            "groupUri": binding["groupUri"]["value"],
            "groupName": binding["groupName"]["value"],
            "occasionUri": binding["occasionUri"]["value"],
            "occasionName": binding["occasionName"]["value"],
            "editionNumber": int(binding["editionNumber"]["value"]),
            "isShuffled": is_shuffled == "true",
            "createdAt": binding["createdAt"]["value"]
        })

    return editions


def get_edition(uri: str) -> Optional[Dict[str, Any]]:
    """Get a single edition by URI."""
    query = f"""
    SELECT ?name ?groupUri ?groupName ?occasionUri ?occasionName
           ?editionNumber ?isShuffled ?createdAt WHERE {{
        <{uri}> a seg:Edition ;
                rdfs:label ?name ;
                seg:set ?groupUri ;
                seg:occasion ?occasionUri ;
                seg:editionNumber ?editionNumber ;
                seg:createdAt ?createdAt .
        ?groupUri foaf:name ?groupName .
        ?occasionUri schema:name ?occasionName .
        OPTIONAL {{ <{uri}> seg:isShuffled ?isShuffled }}
    }}
    """

    results = execute_query(query)
    bindings = results["results"]["bindings"]

    if not bindings:
        return None

    binding = bindings[0]
    is_shuffled = binding.get("isShuffled", {}).get("value", "false")

    return {
        "uri": uri,
        "name": binding["name"]["value"],
        "groupUri": binding["groupUri"]["value"],
        "groupName": binding["groupName"]["value"],
        "occasionUri": binding["occasionUri"]["value"],
        "occasionName": binding["occasionName"]["value"],
        "editionNumber": int(binding["editionNumber"]["value"]),
        "isShuffled": is_shuffled == "true",
        "createdAt": binding["createdAt"]["value"]
    }


def delete_edition(uri: str) -> bool:
    """Delete an edition and all its assignments."""
    # First delete all assignments for this edition
    update = f"""
    DELETE {{
        ?assignment ?p ?o .
    }}
    WHERE {{
        <{uri}> seg:hasAssignment ?assignment .
        ?assignment ?p ?o .
    }};
    DELETE WHERE {{
        <{uri}> ?p ?o .
    }}
    """
    return execute_update(update)


# =============================================================================
# Assignment (Shuffle) Operations
# =============================================================================

def get_previous_assignments(group_uri: str, occasion_uri: str) -> List[Tuple[str, str]]:
    """
    Get all (agent, recipient) pairs from previous editions.

    This is used to enforce Rule 3: Don't pick the same name again
    if there was a previous edition.

    Args:
        group_uri: URI of the group
        occasion_uri: URI of the occasion

    Returns:
        List of (agent_uri, recipient_uri) tuples
    """
    query = f"""
    SELECT ?agent ?recipient WHERE {{
        ?edition a seg:Edition ;
                 seg:set <{group_uri}> ;
                 seg:occasion <{occasion_uri}> ;
                 seg:hasAssignment ?assignment .
        ?assignment schema:agent ?agent ;
                   schema:recipient ?recipient .
    }}
    """

    results = execute_query(query)
    return [
        (binding["agent"]["value"], binding["recipient"]["value"])
        for binding in results["results"]["bindings"]
    ]


def create_assignments(edition_uri: str, assignments: List[Tuple[str, str]]) -> bool:
    """
    Create SecretSantaAction instances for the given assignments.

    Args:
        edition_uri: URI of the edition
        assignments: List of (giver_uri, recipient_uri) tuples

    Returns:
        True if successful
    """
    created_at = get_current_datetime()

    # Build the INSERT query with all assignments
    triples = []
    for giver_uri, recipient_uri in assignments:
        assignment_uri = generate_uri("assignment")
        triples.append(f"""
        <{assignment_uri}> a seg:SecretSantaAction ;
                          schema:agent <{giver_uri}> ;
                          schema:recipient <{recipient_uri}> ;
                          seg:inEdition <{edition_uri}> ;
                          seg:createdAt "{created_at}"^^xsd:dateTime .
        <{edition_uri}> seg:hasAssignment <{assignment_uri}> .
        """)

    # Also mark the edition as shuffled
    triples.append(f"""
        <{edition_uri}> seg:isShuffled true .
    """)

    update = f"""
    DELETE {{ <{edition_uri}> seg:isShuffled ?old }}
    WHERE {{ <{edition_uri}> seg:isShuffled ?old }};
    INSERT DATA {{
        {"".join(triples)}
    }}
    """

    return execute_update(update)


def get_edition_assignments(edition_uri: str) -> List[Dict[str, str]]:
    """
    Get all assignments for a specific edition.

    Args:
        edition_uri: URI of the edition

    Returns:
        List of assignment dictionaries with giver and recipient details
    """
    query = f"""
    SELECT ?assignmentUri ?giverUri ?giverName ?recipientUri ?recipientName WHERE {{
        <{edition_uri}> seg:hasAssignment ?assignmentUri .
        ?assignmentUri schema:agent ?giverUri ;
                      schema:recipient ?recipientUri .
        ?giverUri foaf:name ?giverName .
        ?recipientUri foaf:name ?recipientName .
    }}
    ORDER BY ?giverName
    """

    results = execute_query(query)
    return [
        {
            "uri": binding["assignmentUri"]["value"],
            "giverUri": binding["giverUri"]["value"],
            "giverName": binding["giverName"]["value"],
            "recipientUri": binding["recipientUri"]["value"],
            "recipientName": binding["recipientName"]["value"]
        }
        for binding in results["results"]["bindings"]
    ]


def get_editions_for_group_and_occasion(group_uri: str, occasion_uri: str) -> List[Dict[str, Any]]:
    """
    Get all editions for a specific group and occasion combination.

    Args:
        group_uri: URI of the group
        occasion_uri: URI of the occasion

    Returns:
        List of edition dictionaries
    """
    query = f"""
    SELECT ?uri ?name ?editionNumber ?isShuffled ?createdAt WHERE {{
        ?uri a seg:Edition ;
             rdfs:label ?name ;
             seg:set <{group_uri}> ;
             seg:occasion <{occasion_uri}> ;
             seg:editionNumber ?editionNumber ;
             seg:createdAt ?createdAt .
        OPTIONAL {{ ?uri seg:isShuffled ?isShuffled }}
    }}
    ORDER BY DESC(?editionNumber)
    """

    results = execute_query(query)
    return [
        {
            "uri": binding["uri"]["value"],
            "name": binding["name"]["value"],
            "editionNumber": int(binding["editionNumber"]["value"]),
            "isShuffled": binding.get("isShuffled", {}).get("value", "false") == "true",
            "createdAt": binding["createdAt"]["value"]
        }
        for binding in results["results"]["bindings"]
    ]


def check_fuseki_ready() -> bool:
    """Check if Fuseki is ready to accept connections."""
    try:
        response = requests.get(f"{FUSEKI_URL}/$/ping", timeout=5)
        return response.status_code == 200
    except:
        return False


def ensure_dataset_exists() -> bool:
    """Ensure the dataset exists in Fuseki."""
    try:
        # Check if dataset exists
        response = requests.get(f"{FUSEKI_URL}/$/datasets/{DATASET_NAME}", timeout=5)
        if response.status_code == 200:
            return True

        # Create dataset if it doesn't exist
        response = requests.post(
            f"{FUSEKI_URL}/$/datasets",
            data={"dbName": DATASET_NAME, "dbType": "tdb2"},
            timeout=10
        )
        return response.status_code in [200, 201]
    except Exception as e:
        print(f"Error ensuring dataset: {e}")
        return False
