# Gift Name Shuffler - Specificaties

## Overzicht

Een gedecentraliseerde webapp voor het organiseren van cadeautjes-uitwisselingen (Secret Santa, Sinterklaas, etc.) waarbij gebruikers volledige controle behouden over hun eigen data.

## Technologie Stack

### Frontend
- **Framework**: SvelteKit 2.x met Svelte 5
- **Taal**: TypeScript
- **Styling**: Scoped CSS (geen externe framework)
- **Build**: Vite
- **Deployment**: GitHub Pages (static adapter)

### Backend / Data Storage
- **Protocol**: Solid (Social Linked Data)
- **Data formaat**: RDF/Turtle
- **Authenticatie**: Solid OIDC
- **Storage**: Gebruikers' persoonlijke Solid Pods

### Vocabularies
- `schema:` - http://schema.org/ (Event, ItemList, ListItem)
- `seg:` - https://segersrosseel.be/ns/gift# (custom namespace)
- `acl:` - http://www.w3.org/ns/auth/acl# (access control)
- `ldp:` - http://www.w3.org/ns/ldp# (containers)

---

## Architectuur

```
┌─────────────────────────────────────────────────────────┐
│                    SvelteKit Frontend                    │
│                  (GitHub Pages - Static)                 │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTPS
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  Solid OIDC Provider                     │
│         (solidcommunity.net, inrupt.net, etc.)          │
└─────────────────────────┬───────────────────────────────┘
                          │ WebID Authentication
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    Solid Pods                            │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Admin Pod    │  │ User A Pod   │  │ User B Pod   │  │
│  │              │  │              │  │              │  │
│  │ /occasions/  │  │ /wishlist    │  │ /wishlist    │  │
│  │ /registr./   │  │              │  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Functionaliteiten

### 1. Authenticatie

#### 1.1 Solid Login
- Gebruiker kiest Solid provider uit lijst
- Optie voor custom provider URL
- OIDC redirect flow met session restore
- Query parameters behouden door OIDC flow (sessionStorage)

#### 1.2 Session Management
- Automatisch session restore bij page load
- Logout functionaliteit
- WebID weergave in UI

---

### 2. Gelegenheden (Occasions)

#### 2.1 Beheerder: Gelegenheid Aanmaken

**Flow:**
1. Beheerder logt in met Solid account
2. Vult naam en optionele datum in
3. Systeem maakt aan in beheerder's Pod:
   - `/public/giftshuffler/occasions/{id}/occasion.ttl`
   - `/public/giftshuffler/occasions/{id}/registrations/`
   - ACL voor public append op registrations

**Data Model (occasion.ttl):**
```turtle
@prefix schema: <http://schema.org/> .
@prefix seg: <https://segersrosseel.be/ns/gift#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

<> a schema:Event ;
    schema:name "Kerstfeest 2025" ;
    schema:startDate "2025-12-25"^^xsd:date ;
    seg:adminWebId <https://admin.solidcommunity.net/profile/card#me> .
```

**ACL (registrations/.acl):**
```turtle
@prefix acl: <http://www.w3.org/ns/auth/acl#> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .

<#owner>
    a acl:Authorization ;
    acl:agent <{adminWebId}> ;
    acl:accessTo <./> ;
    acl:default <./> ;
    acl:mode acl:Read, acl:Write, acl:Control .

<#public>
    a acl:Authorization ;
    acl:agentClass foaf:Agent ;
    acl:accessTo <./> ;
    acl:default <./> ;
    acl:mode acl:Read, acl:Append .
```

#### 2.2 Beheerder: Gelegenheden Bekijken

**Flow:**
1. Beheerder ziet lijst van eigen gelegenheden
2. Kan gelegenheid openen om details te zien
3. Ziet lijst van ingeschreven deelnemers
4. Kan uitnodigingslink kopiëren

**UI Elementen:**
- Lijst "Mijn Gelegenheden" met naam en "Bekijk" knop
- Header met naam, datum, admin info
- Deelnemers tabel met naam en WebID
- Kopieer link functie

#### 2.3 Deelnemer: Inschrijven

**Flow:**
1. Deelnemer opent uitnodigingslink
2. Logt in met Solid account
3. Klikt "Schrijf me in"
4. Systeem POST registratie naar beheerder's Pod

**Data Model (registration):**
```turtle
@prefix schema: <http://schema.org/> .
@prefix seg: <https://segersrosseel.be/ns/gift#> .

<#registration> a seg:OccasionRegistration ;
    seg:participantWebId <https://user.solidcommunity.net/profile/card#me> ;
    schema:name "username" ;
    seg:registeredAt "2025-01-15T10:30:00Z" .
```

---

### 3. Wishlist

#### 3.1 Wishlist Beheren

**Flow:**
1. Gebruiker logt in
2. Ziet eigen wishlist items
3. Kan items toevoegen, verwijderen, herschikken
4. Wijzigingen worden direct opgeslagen in Pod

**Data Model (wishlist.ttl):**
```turtle
@prefix schema: <http://schema.org/> .
@prefix seg: <https://segersrosseel.be/ns/gift#> .

<#item-abc123> a schema:ListItem ;
    schema:name "Boek over tuinieren" ;
    schema:description "Liefst over moestuinen" ;
    schema:url <https://bol.com/...> ;
    schema:position 1 ;
    seg:priority 5 .

<#item-def456> a schema:ListItem ;
    schema:name "Warme sokken" ;
    schema:position 2 ;
    seg:priority 3 .
```

**Locatie:** `/public/giftshuffler-wishlist.ttl`

#### 3.2 Wishlist Item Eigenschappen

| Veld | Type | Verplicht | Beschrijving |
|------|------|-----------|--------------|
| name | string | Ja | Naam van het item |
| description | string | Nee | Beschrijving |
| url | URL | Nee | Link naar product |
| priority | integer (1-5) | Ja | Prioriteit (⭐ tot ⭐⭐⭐⭐⭐) |
| position | integer | Ja | Volgorde in lijst |

#### 3.3 Wishlist Bekijken (anderen)

**Flow:**
1. Gebruiker A is ingeschreven voor gelegenheid
2. Kan wishlists van andere deelnemers bekijken
3. Wishlist wordt opgehaald uit deelnemer's Pod

---

## URL Structuur

### Frontend Routes

| Route | Beschrijving |
|-------|--------------|
| `/` | Home pagina |
| `/occasion` | Gelegenheden overzicht + aanmaken |
| `/occasion?occasion={url}` | Specifieke gelegenheid bekijken |
| `/reveal` | Eigen wishlist beheren |

### Solid Pod Structuur

```
{pod}/
├── profile/
│   └── card#me              # WebID
└── public/
    ├── giftshuffler-wishlist.ttl    # Gebruiker's wishlist
    └── giftshuffler/
        └── occasions/
            └── {occasion-id}/
                ├── occasion.ttl      # Metadata
                ├── registrations/    # Container
                │   ├── .acl          # Public append
                │   └── reg-{id}.ttl  # Registraties
                └── .acl              # Optioneel
```

---

## Componenten

### Svelte Components

```
src/lib/components/
├── SolidLogin.svelte       # Login/logout UI
├── OccasionHeader.svelte   # Gelegenheid header
├── ParticipantList.svelte  # Deelnemers lijst
├── WishlistEditor.svelte   # Wishlist bewerken
└── WishlistViewer.svelte   # Wishlist bekijken (readonly)
```

### Stores

```
src/lib/stores/
└── auth.ts                 # Reactive auth state
    - isLoggedIn
    - webId
    - isAuthLoading
    - login()
    - logout()
    - init()
```

### Solid Utilities

```
src/lib/solid/
├── constants.ts            # Providers, paths, namespaces
├── turtle.ts               # Turtle parse/generate
├── wishlist.ts             # Wishlist CRUD
└── occasion.ts             # Occasion management
```

---

## Security

### Authenticatie
- Solid OIDC via @inrupt/solid-client-authn-browser
- Geen credentials opgeslagen in frontend
- Session tokens beheerd door Solid library

### Autorisatie
- ACL-gebaseerde toegangscontrole
- Beheerder heeft volledige controle over gelegenheid
- Deelnemers kunnen alleen registreren (append)
- Wishlists zijn publiek leesbaar (in /public/)

### Data Privacy
- Alle data in gebruikers' eigen Pods
- Geen centrale database
- Gebruiker kan data verwijderen door Pod te beheren

---

## Toekomstige Uitbreidingen

### Fase 2: Trekking
- [ ] Beheerder kan deelnemers aan elkaar koppelen
- [ ] Secret Santa algoritme
- [ ] Notificatie naar deelnemers

### Fase 3: Communicatie
- [ ] Anonieme hints/vragen tussen gekoppelde deelnemers
- [ ] Budget instelling per gelegenheid

### Fase 4: Uitgebreide Permissies
- [ ] Private wishlists met specifieke toegang
- [ ] Meerdere beheerders per gelegenheid

---

## Development

### Lokaal draaien
```bash
cd svelte-app
npm install
npm run dev
```

### Build voor productie
```bash
npm run build
```

### Preview productie build
```bash
npm run preview
```

### Deployment
Automatisch via GitHub Actions bij push naar `main`.
