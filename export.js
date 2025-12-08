/**
 * Gift Name Shuffler - RDF/Turtle Export Logic
 *
 * This file handles exporting the app data as RDF in Turtle format.
 *
 * Vocabularies used:
 * - foaf: http://xmlns.com/foaf/0.1/ (Person, Group, member)
 * - schema: http://schema.org/ (Event, GiveAction, agent, recipient)
 * - seg: https://segersrosseel.be/ns/gift# (Edition, set, hasAssignment, edition)
 *
 * The export creates URIs based on entity IDs to ensure consistency.
 */

// ===========================================
// NAMESPACE DEFINITIONS
// ===========================================
const NAMESPACES = {
    foaf: 'http://xmlns.com/foaf/0.1/',
    schema: 'http://schema.org/',
    seg: 'https://segersrosseel.be/ns/gift#',
    rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
    xsd: 'http://www.w3.org/2001/XMLSchema#'
};

// Base URI for our entities
const BASE_URI = 'https://segersrosseel.be/data/gift/';

// ===========================================
// TURTLE EXPORT
// ===========================================

/**
 * Generate the complete Turtle export of all data
 */
function generateTurtle() {
    const persons = getPersons();
    const groups = getGroups();
    const occasions = getOccasions();
    const editions = getEditions();

    let turtle = '';

    // Add prefix declarations
    turtle += '@prefix foaf: <' + NAMESPACES.foaf + '> .\n';
    turtle += '@prefix schema: <' + NAMESPACES.schema + '> .\n';
    turtle += '@prefix seg: <' + NAMESPACES.seg + '> .\n';
    turtle += '@prefix rdf: <' + NAMESPACES.rdf + '> .\n';
    turtle += '@prefix rdfs: <' + NAMESPACES.rdfs + '> .\n';
    turtle += '@prefix xsd: <' + NAMESPACES.xsd + '> .\n';
    turtle += '@base <' + BASE_URI + '> .\n';
    turtle += '\n';

    // Add custom vocabulary definitions
    turtle += '# ===========================================\n';
    turtle += '# Custom Vocabulary Definitions\n';
    turtle += '# ===========================================\n';
    turtle += '\n';
    turtle += 'seg:Edition rdf:type rdfs:Class ;\n';
    turtle += '    rdfs:label "Edition" ;\n';
    turtle += '    rdfs:comment "Represents one run of the gift shuffler for a specific group and occasion." .\n';
    turtle += '\n';
    turtle += 'seg:set rdf:type rdf:Property ;\n';
    turtle += '    rdfs:label "set" ;\n';
    turtle += '    rdfs:comment "Links an Edition to the Group (set) it was created for." ;\n';
    turtle += '    rdfs:domain seg:Edition ;\n';
    turtle += '    rdfs:range foaf:Group .\n';
    turtle += '\n';
    turtle += 'seg:hasAssignment rdf:type rdf:Property ;\n';
    turtle += '    rdfs:label "hasAssignment" ;\n';
    turtle += '    rdfs:comment "Links an Edition to its GiveAction assignments." ;\n';
    turtle += '    rdfs:domain seg:Edition ;\n';
    turtle += '    rdfs:range schema:GiveAction .\n';
    turtle += '\n';
    turtle += 'seg:edition rdf:type rdf:Property ;\n';
    turtle += '    rdfs:label "edition" ;\n';
    turtle += '    rdfs:comment "Links a GiveAction back to its Edition." ;\n';
    turtle += '    rdfs:domain schema:GiveAction ;\n';
    turtle += '    rdfs:range seg:Edition .\n';
    turtle += '\n';

    // Export persons
    turtle += '# ===========================================\n';
    turtle += '# Persons\n';
    turtle += '# ===========================================\n';
    turtle += '\n';

    persons.forEach(person => {
        turtle += `<person/${person.id}> rdf:type foaf:Person ;\n`;
        turtle += `    foaf:name "${escapeTurtleString(person.name)}" .\n`;
        turtle += '\n';
    });

    // Export groups with members
    turtle += '# ===========================================\n';
    turtle += '# Groups\n';
    turtle += '# ===========================================\n';
    turtle += '\n';

    groups.forEach(group => {
        turtle += `<group/${group.id}> rdf:type foaf:Group ;\n`;
        turtle += `    foaf:name "${escapeTurtleString(group.name)}"`;

        // Add members
        if (group.memberIds && group.memberIds.length > 0) {
            group.memberIds.forEach(memberId => {
                turtle += ` ;\n    foaf:member <person/${memberId}>`;
            });
        }

        turtle += ' .\n\n';
    });

    // Export occasions
    turtle += '# ===========================================\n';
    turtle += '# Occasions (Events)\n';
    turtle += '# ===========================================\n';
    turtle += '\n';

    occasions.forEach(occasion => {
        turtle += `<occasion/${occasion.id}> rdf:type schema:Event ;\n`;
        turtle += `    schema:name "${escapeTurtleString(occasion.name)}"`;

        if (occasion.date) {
            turtle += ` ;\n    schema:startDate "${escapeTurtleString(occasion.date)}"`;
        }

        turtle += ' .\n\n';
    });

    // Export editions and assignments
    turtle += '# ===========================================\n';
    turtle += '# Editions and Assignments\n';
    turtle += '# ===========================================\n';
    turtle += '\n';

    editions.forEach(edition => {
        // Export the Edition
        turtle += `<edition/${edition.id}> rdf:type seg:Edition ;\n`;
        turtle += `    schema:event <occasion/${edition.occasionId}> ;\n`;
        turtle += `    seg:set <group/${edition.groupId}> ;\n`;
        turtle += `    schema:dateCreated "${new Date(edition.createdAt).toISOString()}"^^xsd:dateTime`;

        // Link to assignments
        if (edition.assignments && edition.assignments.length > 0) {
            edition.assignments.forEach((assignment, idx) => {
                turtle += ` ;\n    seg:hasAssignment <edition/${edition.id}/assignment/${idx}>`;
            });
        }

        turtle += ' .\n\n';

        // Export each assignment as a GiveAction
        if (edition.assignments) {
            edition.assignments.forEach((assignment, idx) => {
                turtle += `<edition/${edition.id}/assignment/${idx}> rdf:type schema:GiveAction ;\n`;
                turtle += `    schema:agent <person/${assignment.giverId}> ;\n`;
                turtle += `    schema:recipient <person/${assignment.recipientId}> ;\n`;
                turtle += `    seg:edition <edition/${edition.id}> .\n`;
                turtle += '\n';
            });
        }
    });

    return turtle;
}

/**
 * Export data as Turtle and display in textarea
 */
function exportAsTurtle() {
    const turtle = generateTurtle();
    document.getElementById('export-output').value = turtle;
}

/**
 * Download the Turtle export as a .ttl file
 */
function downloadTurtle() {
    const turtle = generateTurtle();

    if (!turtle.trim()) {
        alert('No data to export.');
        return;
    }

    // Create a Blob with the Turtle content
    const blob = new Blob([turtle], { type: 'text/turtle' });

    // Create a download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gift-shuffler-export.ttl';

    // Trigger download
    document.body.appendChild(a);
    a.click();

    // Cleanup
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Escape special characters in Turtle string literals
 * @param {string} str - The string to escape
 * @returns {string} - The escaped string
 */
function escapeTurtleString(str) {
    if (!str) return '';

    return str
        .replace(/\\/g, '\\\\')   // Backslash
        .replace(/"/g, '\\"')      // Double quote
        .replace(/\n/g, '\\n')     // Newline
        .replace(/\r/g, '\\r')     // Carriage return
        .replace(/\t/g, '\\t');    // Tab
}
