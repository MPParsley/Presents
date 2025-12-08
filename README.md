# Gift Name Shuffler

A web application for randomly assigning gift givers in events like Secret Santa, Christmas gift exchanges, or company events. Built with semantic web technologies using RDF and SPARQL.

## Features

- **Manage Persons**: Create and manage participants
- **Manage Groups**: Organize people into groups (families, teams, etc.)
- **Manage Occasions**: Define events (Christmas 2025, Company Party, etc.)
- **Create Editions**: Start new gift exchange rounds for a group + occasion
- **Smart Shuffling**: Random assignment algorithm that:
  - Ensures no one picks themselves
  - Prevents repeat assignments from previous editions
- **History**: View all past editions and their assignments

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)

### Running the Application

1. Clone the repository and navigate to the project directory:

```bash
git clone <repository-url>
cd Presents
```

2. Start all services:

```bash
docker compose up
```

3. Access the application:

| Service | URL | Description |
|---------|-----|-------------|
| **Web UI** | http://localhost:8080 | Main application |
| **Fuseki Admin** | http://localhost:3030 | Triplestore admin panel |
| **API** | http://localhost:5000/api | Backend REST API |

4. To stop the application:

```bash
docker compose down
```

To stop and remove all data:

```bash
docker compose down -v
```

### Fuseki Admin Access

- URL: http://localhost:3030
- Username: `admin`
- Password: `admin123`

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│   Frontend  │────▶│   Backend   │────▶│  Fuseki         │
│  (nginx)    │     │  (Flask)    │     │  (Triplestore)  │
│  Port 8080  │     │  Port 5000  │     │  Port 3030      │
└─────────────┘     └─────────────┘     └─────────────────┘
      │                   │                     │
      └── Vue.js ──┘     └── SPARQL ──────────┘
```

## Technology Choices

### Backend: Python + Flask

**Why Flask?**
- **Simplicity**: Minimal boilerplate, easy to understand
- **Widely adopted**: Large ecosystem, excellent documentation
- **Flexible**: Perfect for RESTful APIs without unnecessary complexity
- **SPARQL support**: Excellent `SPARQLWrapper` library for triplestore integration

### Frontend: Vue.js 3 (CDN)

**Why Vue.js via CDN?**
- **No build step**: Single HTML file, immediately usable
- **Simple**: Easy to understand for anyone with JavaScript knowledge
- **GitHub Pages ready**: Can be hosted as static files
- **Reactive**: Clean data binding without complex setup
- **Future-proof**: Easy to migrate to a full Vue CLI/Vite setup if needed

### Database: Apache Jena Fuseki

**Why Fuseki?**
- **Semantic Web**: Native RDF/SPARQL support
- **Standards-based**: Uses W3C standards (RDF, SPARQL, SHACL)
- **Extensible**: Easy to integrate with other semantic web tools
- **Reusable ontologies**: Leverages FOAF and Schema.org

## Project Structure

```
Presents/
├── docker-compose.yml      # Docker orchestration
├── README.md               # This file
├── ontology/
│   ├── gift.ttl            # Custom ontology (Turtle format)
│   └── gift-shapes.ttl     # SHACL validation shapes
├── backend/
│   ├── Dockerfile          # Backend container definition
│   ├── requirements.txt    # Python dependencies
│   ├── app.py              # Flask application & API routes
│   └── sparql_client.py    # SPARQL query helpers
└── frontend/
    ├── Dockerfile          # Frontend container definition
    ├── nginx.conf          # Nginx configuration with API proxy
    └── index.html          # Vue.js single-page application
```

## Ontology Design

The application uses a combination of standard vocabularies and custom terms:

### Standard Vocabularies

| Prefix | Namespace | Used For |
|--------|-----------|----------|
| `foaf` | http://xmlns.com/foaf/0.1/ | Persons, Groups, membership |
| `schema` | http://schema.org/ | Events, GiveAction |

### Custom Terms (namespace: `https://segersrosseel.be/ns/gift#`)

| Term | Type | Description |
|------|------|-------------|
| `seg:Edition` | Class | A single run of the shuffler |
| `seg:SecretSantaAction` | Class | Individual gift assignment |
| `seg:GroupGiftAction` | Class | Group-to-group gift giving |
| `seg:set` | Property | Links Edition to Group |
| `seg:occasion` | Property | Links Edition to Event |
| `seg:hasAssignment` | Property | Links Edition to assignments |

### SHACL Validation Rules

The `gift-shapes.ttl` file enforces:

1. **Rule 1**: In `GroupGiftAction`, giver and recipient must be different groups
2. **Rule 2**: In `SecretSantaAction`, a person cannot be their own recipient
3. **Rule 3**: No duplicate assignments (enforced in application logic)

## API Reference

### Persons

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/persons` | List all persons |
| POST | `/api/persons` | Create person `{"name": "..."}` |
| DELETE | `/api/persons/<uri>` | Delete person |

### Groups

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/groups` | List all groups with members |
| POST | `/api/groups` | Create group `{"name": "..."}` |
| DELETE | `/api/groups/<uri>` | Delete group |
| POST | `/api/groups/<uri>/members` | Add member `{"personUri": "..."}` |
| DELETE | `/api/groups/<group>/members/<person>` | Remove member |

### Occasions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/occasions` | List all occasions |
| POST | `/api/occasions` | Create `{"name": "...", "description": "..."}` |
| DELETE | `/api/occasions/<uri>` | Delete occasion |

### Editions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/editions` | List all editions |
| GET | `/api/editions?groupUri=...&occasionUri=...` | Filter editions |
| POST | `/api/editions` | Create `{"groupUri": "...", "occasionUri": "..."}` |
| GET | `/api/editions/<uri>` | Get single edition |
| DELETE | `/api/editions/<uri>` | Delete edition |
| POST | `/api/editions/<uri>/shuffle` | Run the shuffler |
| GET | `/api/editions/<uri>/assignments` | Get assignments |

## Shuffle Algorithm

The shuffle algorithm generates valid Secret Santa assignments:

```python
def generate_valid_assignments(members, forbidden_pairs, max_attempts=1000):
    """
    1. Generate a random derangement (no self-picks)
    2. Check against forbidden pairs (previous editions)
    3. Retry if invalid, up to max_attempts
    4. Return None if no valid assignment possible
    """
```

### Constraints Enforced

1. **No self-assignment**: Using derangement (permutation where no element stays in place)
2. **No repeats**: Checking against all previous (giver, recipient) pairs for the same group + occasion
3. **Exhaustion handling**: Returns error if too many previous editions have used all combinations

## GitHub Pages Deployment

The frontend can be hosted on GitHub Pages:

1. The `frontend/index.html` file is self-contained
2. Set the `API_BASE_URL` variable to point to your backend:

```javascript
// In frontend/index.html, before the Vue app:
window.API_BASE_URL = 'https://your-backend-api.example.com/api';
```

3. Deploy the `frontend/` directory to GitHub Pages

**Note**: You'll need to host the backend separately (e.g., on a cloud provider) as GitHub Pages only serves static files.

## Development

### Running Backend Locally (without Docker)

```bash
cd backend
pip install -r requirements.txt

# Set environment variables
export FUSEKI_URL=http://localhost:3030
export FUSEKI_DATASET=gifts

# Run with Flask dev server
python app.py
```

### Running Frontend Locally

Simply open `frontend/index.html` in a browser, or use a local server:

```bash
cd frontend
python -m http.server 8080
```

### SPARQL Queries

You can query the triplestore directly via Fuseki:

```sparql
# Get all persons
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
SELECT ?person ?name WHERE {
    ?person a foaf:Person ;
            foaf:name ?name .
}

# Get all assignments for an edition
PREFIX seg: <https://segersrosseel.be/ns/gift#>
PREFIX schema: <http://schema.org/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

SELECT ?giver ?giverName ?recipient ?recipientName WHERE {
    <edition-uri> seg:hasAssignment ?assignment .
    ?assignment schema:agent ?giver ;
               schema:recipient ?recipient .
    ?giver foaf:name ?giverName .
    ?recipient foaf:name ?recipientName .
}
```

## Assumptions & Design Decisions

1. **Single dataset**: All data is stored in one Fuseki dataset (`gifts`)
2. **No authentication**: The app doesn't implement user authentication (add if needed)
3. **URI generation**: Uses UUID-based URIs under `https://segersrosseel.be/data/`
4. **Edition immutability**: Once shuffled, an edition's assignments cannot be changed
5. **Deletion cascade**: Deleting a person removes them from all groups; deleting an edition removes its assignments

## License

MIT License - Feel free to use and modify as needed.
