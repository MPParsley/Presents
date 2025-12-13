/**
 * Gift Name Shuffler - SOLID Integration (ES Module)
 *
 * This file handles:
 * - SOLID Pod authentication via Inrupt libraries
 * - Wishlist CRUD operations on user's Pod
 * - Person to WebID linking
 * - Wishlist caching for offline support
 *
 * Vocabularies used:
 * - schema: http://schema.org/ (ItemList, ListItem, name, description, url, position)
 * - seg: https://segersrosseel.be/ns/gift# (priority - custom extension)
 */

// ===========================================
// IMPORTS FROM SKYPACK CDN
// ===========================================

// Only import authn-browser (works on Skypack)
// We'll handle Turtle files manually with fetch() instead of solid-client
import {
    login,
    logout,
    handleIncomingRedirect,
    getDefaultSession
} from "https://cdn.skypack.dev/@inrupt/solid-client-authn-browser";

// ===========================================
// CONSTANTS
// ===========================================

const SOLID_PROVIDERS = [
    { name: 'solidcommunity.net', url: 'https://solidcommunity.net' },
    { name: 'solidweb.org', url: 'https://solidweb.org' },
    { name: 'solidweb.me', url: 'https://solidweb.me' },
    { name: 'inrupt.net', url: 'https://inrupt.net' }
];

const WISHLIST_PATH = '/public/giftshuffler-wishlist.ttl';

// Storage key for Solid profiles (personId -> webId mapping)
const SOLID_STORAGE_KEY = 'giftApp.solidProfiles';
const WISHLIST_CACHE_KEY = 'giftApp.wishlistCache';

// RDF Namespaces
const SCHEMA_NS = 'http://schema.org/';
const SEG_NS = 'https://segersrosseel.be/ns/gift#';
const RDF_NS = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';

// ===========================================
// SOLID AUTHENTICATION
// ===========================================

/**
 * Initialize SOLID - check for existing session and handle redirects
 */
async function initSolid() {
    try {
        // Handle incoming redirect from Identity Provider
        await handleIncomingRedirect({
            restorePreviousSession: true
        });

        // Update UI based on session state
        updateSolidUI();
    } catch (error) {
        console.error('Error initializing SOLID:', error);
    }
}

/**
 * Get the current SOLID session
 */
function getSolidSession() {
    return getDefaultSession();
}

/**
 * Check if user is logged in to SOLID
 */
function isSolidLoggedIn() {
    const session = getSolidSession();
    return session && session.info && session.info.isLoggedIn;
}

/**
 * Get the current user's WebID
 */
function getCurrentWebId() {
    const session = getSolidSession();
    if (session && session.info && session.info.isLoggedIn) {
        return session.info.webId;
    }
    return null;
}

/**
 * Login to SOLID with selected provider
 */
async function loginToSolid() {
    const providerSelect = document.getElementById('solid-provider');
    let providerUrl = providerSelect.value;

    if (!providerUrl) {
        alert('Selecteer een Solid provider.');
        return;
    }

    // Handle custom provider
    if (providerUrl === 'custom') {
        providerUrl = prompt('Voer de URL van je Solid Identity Provider in:');
        if (!providerUrl) return;
    }

    try {
        // Build redirect URL without hash fragment (not allowed by Solid OIDC)
        // Also remove reserved query params 'code' and 'state'
        const url = new URL(window.location.href);
        url.hash = ''; // Remove hash fragment
        url.searchParams.delete('code');
        url.searchParams.delete('state');
        const redirectUrl = url.toString();

        await login({
            oidcIssuer: providerUrl,
            redirectUrl: redirectUrl,
            clientName: 'Gift Name Shuffler'
        });
    } catch (error) {
        console.error('Login error:', error);
        alert('Fout bij inloggen: ' + error.message);
    }
}

/**
 * Logout from SOLID
 */
async function logoutFromSolid() {
    try {
        await logout();
        updateSolidUI();
    } catch (error) {
        console.error('Logout error:', error);
    }
}

/**
 * Update the SOLID UI based on login state
 */
function updateSolidUI() {
    const loginDiv = document.getElementById('solid-login');
    const profileDiv = document.getElementById('solid-profile');
    const webIdSpan = document.getElementById('solid-webid');

    if (!loginDiv || !profileDiv) return;

    if (isSolidLoggedIn()) {
        const webId = getCurrentWebId();
        loginDiv.style.display = 'none';
        profileDiv.style.display = 'block';
        if (webIdSpan) {
            // Show shortened WebID
            const shortWebId = webId.replace('https://', '').replace('/profile/card#me', '');
            webIdSpan.textContent = shortWebId;
            webIdSpan.title = webId;
        }
    } else {
        loginDiv.style.display = 'block';
        profileDiv.style.display = 'none';
    }
}

/**
 * Populate the provider dropdown
 */
function populateSolidProviders() {
    const select = document.getElementById('solid-provider');
    if (!select) return;

    select.innerHTML = '<option value="">-- Kies provider --</option>' +
        SOLID_PROVIDERS.map(p => `<option value="${p.url}">${p.name}</option>`).join('') +
        '<option value="custom">Andere...</option>';
}

// ===========================================
// SOLID PROFILE LINKING
// ===========================================

/**
 * Get all Solid profiles (personId -> webId mappings)
 */
function getSolidProfiles() {
    const data = localStorage.getItem(SOLID_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
}

/**
 * Save Solid profiles
 */
function saveSolidProfiles(profiles) {
    localStorage.setItem(SOLID_STORAGE_KEY, JSON.stringify(profiles));
}

/**
 * Link a person to the current logged-in WebID
 */
function linkCurrentUserToPerson(personId) {
    if (!isSolidLoggedIn()) {
        alert('Je moet eerst inloggen met je Solid Pod.');
        return;
    }

    const webId = getCurrentWebId();
    const profiles = getSolidProfiles();

    // Check if this WebID is already linked to another person
    const existingPersonId = Object.keys(profiles).find(pid => profiles[pid].webId === webId);
    if (existingPersonId && existingPersonId !== personId) {
        const persons = typeof getPersons === 'function' ? getPersons() : [];
        const existingPerson = persons.find(p => p.id === existingPersonId);
        alert(`Dit Solid account is al gekoppeld aan ${existingPerson ? existingPerson.name : 'iemand anders'}.`);
        return;
    }

    profiles[personId] = {
        webId: webId,
        wishlistUrl: getPodBaseUrl(webId) + WISHLIST_PATH,
        linkedAt: Date.now()
    };

    saveSolidProfiles(profiles);
    if (typeof renderPersons === 'function') {
        renderPersons();
    }
    alert('Solid account succesvol gekoppeld!');
}

/**
 * Unlink a person from their WebID
 */
function unlinkPersonFromSolid(personId) {
    if (!confirm('Weet je zeker dat je de Solid koppeling wilt verwijderen?')) {
        return;
    }

    const profiles = getSolidProfiles();
    delete profiles[personId];
    saveSolidProfiles(profiles);
    if (typeof renderPersons === 'function') {
        renderPersons();
    }
}

/**
 * Get the WebID for a person
 */
function getWebIdForPerson(personId) {
    const profiles = getSolidProfiles();
    return profiles[personId] ? profiles[personId].webId : null;
}

/**
 * Get the wishlist URL for a person
 */
function getWishlistUrlForPerson(personId) {
    const profiles = getSolidProfiles();
    return profiles[personId] ? profiles[personId].wishlistUrl : null;
}

/**
 * Extract Pod base URL from WebID
 */
function getPodBaseUrl(webId) {
    // WebID is typically: https://username.provider.com/profile/card#me
    // Pod base is: https://username.provider.com
    try {
        const url = new URL(webId);
        return url.origin;
    } catch {
        return webId.split('/profile/')[0];
    }
}

// ===========================================
// WISHLIST CRUD OPERATIONS (using fetch + manual Turtle)
// ===========================================

/**
 * Parse simple Turtle format to extract wishlist items
 * This is a simple parser for our specific Turtle format
 */
function parseTurtleWishlist(turtle, baseUrl) {
    const items = [];

    // Match each item block: <#xxx> a schema:ListItem ; ... .
    // Use [\s\S]+? to match properties including URLs with periods
    // End pattern is whitespace + period (Turtle statement terminator)
    const itemRegex = /<#([^>]+)>\s+a\s+schema:ListItem\s*;([\s\S]+?)\s+\./g;
    let match;

    while ((match = itemRegex.exec(turtle)) !== null) {
        const itemId = match[1];
        const properties = match[2];

        const item = {
            id: itemId,
            name: '',
            description: '',
            url: '',
            priority: 3,
            position: 0
        };

        // Extract schema:name
        const nameMatch = properties.match(/schema:name\s+"([^"]*)"(?:@[a-z]+)?/);
        if (nameMatch) item.name = nameMatch[1];

        // Extract schema:description
        const descMatch = properties.match(/schema:description\s+"([^"]*)"(?:@[a-z]+)?/);
        if (descMatch) item.description = descMatch[1];

        // Extract schema:url
        const urlMatch = properties.match(/schema:url\s+<([^>]+)>/);
        if (urlMatch) item.url = urlMatch[1];

        // Extract seg:priority
        const prioMatch = properties.match(/seg:priority\s+(\d+)/);
        if (prioMatch) item.priority = parseInt(prioMatch[1]);

        // Extract schema:position
        const posMatch = properties.match(/schema:position\s+(\d+)/);
        if (posMatch) item.position = parseInt(posMatch[1]);

        items.push(item);
    }

    return items.sort((a, b) => b.priority - a.priority || a.position - b.position);
}

/**
 * Generate Turtle format for wishlist items
 */
function generateTurtleWishlist(items, baseUrl) {
    let turtle = `@prefix schema: <http://schema.org/> .
@prefix seg: <https://segersrosseel.be/ns/gift#> .

`;

    items.forEach((item, index) => {
        // Ensure ID has item- prefix for consistency
        let itemId = item.id || generateId();
        if (!itemId.startsWith('item-')) {
            itemId = 'item-' + itemId;
        }
        turtle += `<#${itemId}> a schema:ListItem ;\n`;
        turtle += `    schema:name "${escapeTurtleString(item.name || '')}" ;\n`;
        turtle += `    schema:position ${index + 1} ;\n`;
        turtle += `    seg:priority ${item.priority || 3}`;

        if (item.description) {
            turtle += ` ;\n    schema:description "${escapeTurtleString(item.description)}"`;
        }

        if (item.url) {
            turtle += ` ;\n    schema:url <${item.url}>`;
        }

        turtle += ' .\n\n';
    });

    return turtle;
}

/**
 * Escape string for Turtle format
 */
function escapeTurtleString(str) {
    if (!str) return '';
    return str
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
}

/**
 * Get wishlist from a Solid Pod
 * @param {string} webId - The WebID of the person whose wishlist to fetch
 * @returns {Promise<Array>} Array of wishlist items
 */
async function getWishlistFromPod(webId) {
    if (!webId) return [];

    const wishlistUrl = getPodBaseUrl(webId) + WISHLIST_PATH;

    try {
        const session = getSolidSession();
        const fetchFn = session && session.info.isLoggedIn ? session.fetch.bind(session) : fetch;

        const response = await fetchFn(wishlistUrl, {
            headers: { 'Accept': 'text/turtle' }
        });

        if (!response.ok) {
            if (response.status === 404) {
                return []; // No wishlist yet
            }
            throw new Error(`HTTP ${response.status}`);
        }

        const turtle = await response.text();
        const items = parseTurtleWishlist(turtle, wishlistUrl);

        // Cache the result
        cacheWishlist(webId, items);

        return items;
    } catch (error) {
        console.warn('Could not fetch wishlist from Pod:', error);

        // Try to return cached version
        const cached = getCachedWishlist(webId);
        if (cached) {
            console.log('Returning cached wishlist');
            return cached;
        }

        return [];
    }
}

/**
 * Save wishlist to the current user's Pod
 * @param {Array} items - Array of wishlist items
 */
async function saveWishlistToPod(items) {
    if (!isSolidLoggedIn()) {
        throw new Error('Niet ingelogd bij Solid');
    }

    const webId = getCurrentWebId();
    const wishlistUrl = getPodBaseUrl(webId) + WISHLIST_PATH;
    const session = getSolidSession();

    const turtle = generateTurtleWishlist(items, wishlistUrl);

    const response = await session.fetch(wishlistUrl, {
        method: 'PUT',
        headers: {
            'Content-Type': 'text/turtle'
        },
        body: turtle
    });

    if (!response.ok) {
        throw new Error(`Failed to save wishlist: HTTP ${response.status}`);
    }

    // Update cache
    cacheWishlist(webId, items);
}

// ===========================================
// WISHLIST CACHE
// ===========================================

/**
 * Cache a wishlist locally
 */
function cacheWishlist(webId, items) {
    const cache = getWishlistCache();
    cache[webId] = {
        items: items,
        cachedAt: Date.now()
    };
    localStorage.setItem(WISHLIST_CACHE_KEY, JSON.stringify(cache));
}

/**
 * Get cached wishlist
 */
function getCachedWishlist(webId) {
    const cache = getWishlistCache();
    if (cache[webId]) {
        return cache[webId].items;
    }
    return null;
}

/**
 * Get the full wishlist cache
 */
function getWishlistCache() {
    const data = localStorage.getItem(WISHLIST_CACHE_KEY);
    return data ? JSON.parse(data) : {};
}

// ===========================================
// WISHLIST EDITOR UI
// ===========================================

// Current wishlist items being edited
let currentWishlistItems = [];

/**
 * Open the wishlist editor modal
 */
async function showWishlistEditor() {
    if (!isSolidLoggedIn()) {
        alert('Je moet eerst inloggen met je Solid Pod.');
        return;
    }

    const modal = document.getElementById('wishlist-modal');
    if (!modal) return;

    // Show modal
    modal.style.display = 'flex';

    // Load current wishlist
    try {
        document.getElementById('wishlist-items').innerHTML = '<p><em>Wishlist laden...</em></p>';
        currentWishlistItems = await getWishlistFromPod(getCurrentWebId());
        renderWishlistEditor();
    } catch (error) {
        console.error('Error loading wishlist:', error);
        document.getElementById('wishlist-items').innerHTML = '<p><em>Kon wishlist niet laden.</em></p>';
        currentWishlistItems = [];
    }
}

/**
 * Close the wishlist editor modal
 */
function closeWishlistModal() {
    const modal = document.getElementById('wishlist-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    // Clear form
    const wishName = document.getElementById('wish-name');
    const wishDesc = document.getElementById('wish-description');
    const wishUrl = document.getElementById('wish-url');
    const wishPriority = document.getElementById('wish-priority');
    if (wishName) wishName.value = '';
    if (wishDesc) wishDesc.value = '';
    if (wishUrl) wishUrl.value = '';
    if (wishPriority) wishPriority.value = '3';
}

/**
 * Escape HTML to prevent XSS (local helper)
 */
function escapeHtmlLocal(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Render the wishlist items in the editor
 */
function renderWishlistEditor() {
    const container = document.getElementById('wishlist-items');
    if (!container) return;

    if (currentWishlistItems.length === 0) {
        container.innerHTML = '<p><em>Je wishlist is nog leeg. Voeg items toe!</em></p>';
        return;
    }

    container.innerHTML = currentWishlistItems.map((item, index) => `
        <div class="wishlist-item" data-index="${index}">
            <div class="wishlist-item-content">
                <span class="wishlist-priority">${'⭐'.repeat(item.priority)}</span>
                <strong>${escapeHtmlLocal(item.name)}</strong>
                ${item.description ? `<p class="wishlist-description">${escapeHtmlLocal(item.description)}</p>` : ''}
                ${item.url ? `<a href="${escapeHtmlLocal(item.url)}" target="_blank" rel="noopener">Link</a>` : ''}
            </div>
            <div class="wishlist-item-actions">
                <button class="small-btn" onclick="moveWishlistItem(${index}, -1)">↑</button>
                <button class="small-btn" onclick="moveWishlistItem(${index}, 1)">↓</button>
                <button class="small-btn danger-btn" onclick="removeWishlistItem(${index})">Verwijder</button>
            </div>
        </div>
    `).join('');
}

/**
 * Generate a unique ID
 */
function generateId() {
    return Math.random().toString(36).substring(2, 15);
}

/**
 * Add a new item to the wishlist
 */
async function addWishlistItem() {
    const nameInput = document.getElementById('wish-name');
    const descInput = document.getElementById('wish-description');
    const urlInput = document.getElementById('wish-url');
    const prioritySelect = document.getElementById('wish-priority');

    const name = nameInput.value.trim();
    if (!name) {
        alert('Voer een naam in voor het item.');
        return;
    }

    const newItem = {
        id: generateId(),
        name: name,
        description: descInput.value.trim(),
        url: urlInput.value.trim(),
        priority: parseInt(prioritySelect.value) || 3,
        position: currentWishlistItems.length + 1
    };

    currentWishlistItems.push(newItem);

    // Save to Pod
    try {
        await saveWishlistToPod(currentWishlistItems);
        renderWishlistEditor();

        // Clear form
        nameInput.value = '';
        descInput.value = '';
        urlInput.value = '';
        prioritySelect.value = '3';
    } catch (error) {
        console.error('Error saving wishlist:', error);
        alert('Kon wishlist niet opslaan: ' + error.message);
        currentWishlistItems.pop(); // Revert
    }
}

/**
 * Remove an item from the wishlist
 */
async function removeWishlistItem(index) {
    if (!confirm('Weet je zeker dat je dit item wilt verwijderen?')) {
        return;
    }

    const removed = currentWishlistItems.splice(index, 1);

    try {
        await saveWishlistToPod(currentWishlistItems);
        renderWishlistEditor();
    } catch (error) {
        console.error('Error saving wishlist:', error);
        alert('Kon wishlist niet opslaan: ' + error.message);
        currentWishlistItems.splice(index, 0, removed[0]); // Revert
    }
}

/**
 * Move a wishlist item up or down
 */
async function moveWishlistItem(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= currentWishlistItems.length) {
        return;
    }

    // Swap items
    [currentWishlistItems[index], currentWishlistItems[newIndex]] =
        [currentWishlistItems[newIndex], currentWishlistItems[index]];

    try {
        await saveWishlistToPod(currentWishlistItems);
        renderWishlistEditor();
    } catch (error) {
        console.error('Error saving wishlist:', error);
        // Revert swap
        [currentWishlistItems[index], currentWishlistItems[newIndex]] =
            [currentWishlistItems[newIndex], currentWishlistItems[index]];
    }
}

// ===========================================
// WISHLIST VIEWER (for viewing others' wishlists)
// ===========================================

/**
 * Show a person's wishlist in a viewer modal
 */
async function showPersonWishlist(personId) {
    const persons = typeof getPersons === 'function' ? getPersons() : [];
    const person = persons.find(p => p.id === personId);
    const webId = getWebIdForPerson(personId);

    const modal = document.getElementById('wishlist-viewer-modal');
    const titleEl = document.getElementById('wishlist-viewer-title');
    const contentEl = document.getElementById('wishlist-viewer-content');

    if (!modal || !contentEl) return;

    titleEl.textContent = person ? `Wishlist van ${person.name}` : 'Wishlist';
    modal.style.display = 'flex';

    if (!webId) {
        contentEl.innerHTML = '<p><em>Geen wishlist beschikbaar.</em></p>';
        return;
    }

    contentEl.innerHTML = '<p><em>Wishlist laden...</em></p>';

    try {
        const items = await getWishlistFromPod(webId);

        if (items.length === 0) {
            contentEl.innerHTML = '<p><em>Deze persoon heeft nog geen wishlist.</em></p>';
            return;
        }

        contentEl.innerHTML = items.map(item => `
            <div class="wishlist-view-item">
                <div class="wishlist-item-header">
                    <span class="wishlist-priority">${'⭐'.repeat(item.priority)}</span>
                    <strong>${escapeHtmlLocal(item.name)}</strong>
                </div>
                ${item.description ? `<p class="wishlist-description">${escapeHtmlLocal(item.description)}</p>` : ''}
                ${item.url ? `<a href="${escapeHtmlLocal(item.url)}" target="_blank" rel="noopener" class="wishlist-link">Bekijk link →</a>` : ''}
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading wishlist:', error);
        contentEl.innerHTML = '<p><em>Kon wishlist niet laden. Mogelijk is deze privé of niet beschikbaar.</em></p>';
    }
}

/**
 * Close the wishlist viewer modal
 */
function closeWishlistViewer() {
    const modal = document.getElementById('wishlist-viewer-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// ===========================================
// OCCASION MANAGEMENT
// ===========================================

const GIFTSHUFFLER_PATH = '/public/giftshuffler';

/**
 * Create an occasion in the user's Pod
 * Creates: /public/giftshuffler/occasions/{id}/
 *          - occasion.ttl (occasion metadata)
 *          - registrations/ (container for participant registrations)
 *          - registrations/.acl (public write access)
 */
async function createOccasionInPod(occasionData) {
    if (!isSolidLoggedIn()) {
        throw new Error('Niet ingelogd bij Solid');
    }

    const session = getSolidSession();
    const webId = getCurrentWebId();
    const podBase = getPodBaseUrl(webId);
    const occasionPath = `${GIFTSHUFFLER_PATH}/occasions/${occasionData.id}`;
    const occasionUrl = `${podBase}${occasionPath}/occasion.ttl`;
    const registrationsUrl = `${podBase}${occasionPath}/registrations/`;

    // Step 1: Create occasion.ttl with metadata
    const occasionTurtle = generateOccasionTurtle(occasionData);

    const occasionResponse = await session.fetch(occasionUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'text/turtle' },
        body: occasionTurtle
    });

    if (!occasionResponse.ok) {
        throw new Error(`Failed to create occasion: ${occasionResponse.status}`);
    }

    // Step 2: Create registrations container
    // Creating a resource inside will auto-create the container
    const placeholderUrl = `${registrationsUrl}.placeholder`;
    const placeholderResponse = await session.fetch(placeholderUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'text/plain' },
        body: 'placeholder'
    });

    if (!placeholderResponse.ok) {
        console.warn('Could not create registrations container placeholder');
    }

    // Step 3: Set ACL for public write on registrations container
    await setPublicWriteACL(registrationsUrl);

    return {
        occasionUrl: occasionUrl,
        registrationsUrl: registrationsUrl
    };
}

/**
 * Generate Turtle for occasion metadata
 */
function generateOccasionTurtle(data) {
    return `@prefix schema: <http://schema.org/> .
@prefix seg: <https://segersrosseel.be/ns/gift#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

<#occasion> a schema:Event ;
    schema:name "${escapeTurtleString(data.name)}" ;
    seg:adminWebId <${data.adminWebId}>${data.date ? ` ;
    schema:startDate "${data.date}"^^xsd:date` : ''} .
`;
}

/**
 * Set public write ACL on a container
 */
async function setPublicWriteACL(containerUrl) {
    if (!isSolidLoggedIn()) {
        throw new Error('Niet ingelogd bij Solid');
    }

    const session = getSolidSession();
    const aclUrl = containerUrl + '.acl';

    // ACL content that allows:
    // - Owner: full control
    // - Public: read and append (create new files)
    const webId = getCurrentWebId();
    const aclTurtle = `@prefix acl: <http://www.w3.org/ns/auth/acl#> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .

# Owner has full control
<#owner>
    a acl:Authorization ;
    acl:agent <${webId}> ;
    acl:accessTo <./> ;
    acl:default <./> ;
    acl:mode acl:Read, acl:Write, acl:Control .

# Public can read and append (create new files)
<#public>
    a acl:Authorization ;
    acl:agentClass foaf:Agent ;
    acl:accessTo <./> ;
    acl:default <./> ;
    acl:mode acl:Read, acl:Append .
`;

    const response = await session.fetch(aclUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'text/turtle' },
        body: aclTurtle
    });

    if (!response.ok) {
        console.warn(`Could not set ACL: ${response.status}`);
        // Don't throw - ACL might already exist or server might not support it
    }
}

/**
 * Fetch occasion data from URL
 */
async function fetchOccasion(occasionUrl) {
    const session = getSolidSession();
    const fetchFn = session && session.info.isLoggedIn ? session.fetch.bind(session) : fetch;

    const response = await fetchFn(occasionUrl, {
        headers: { 'Accept': 'text/turtle' }
    });

    if (!response.ok) {
        throw new Error(`Could not fetch occasion: ${response.status}`);
    }

    const turtle = await response.text();
    return parseOccasionTurtle(turtle, occasionUrl);
}

/**
 * Parse occasion Turtle data
 */
function parseOccasionTurtle(turtle, baseUrl) {
    const occasion = {
        name: '',
        date: null,
        adminWebId: null,
        registrationsUrl: baseUrl.replace('occasion.ttl', 'registrations/')
    };

    // Extract name
    const nameMatch = turtle.match(/schema:name\s+"([^"]+)"/);
    if (nameMatch) occasion.name = nameMatch[1];

    // Extract date
    const dateMatch = turtle.match(/schema:startDate\s+"([^"]+)"/);
    if (dateMatch) occasion.date = dateMatch[1];

    // Extract admin WebID
    const adminMatch = turtle.match(/seg:adminWebId\s+<([^>]+)>/);
    if (adminMatch) occasion.adminWebId = adminMatch[1];

    return occasion;
}

/**
 * Register a participant for an occasion
 * POSTs a new file to the registrations container
 */
async function registerParticipant(registrationsUrl, participantWebId) {
    const session = getSolidSession();
    if (!session || !session.info.isLoggedIn) {
        throw new Error('Niet ingelogd bij Solid');
    }

    // Generate unique registration ID
    const regId = 'reg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

    // Extract name from WebID (username part)
    const name = participantWebId
        .replace('https://', '')
        .split('.')[0];

    const registrationTurtle = `@prefix schema: <http://schema.org/> .
@prefix seg: <https://segersrosseel.be/ns/gift#> .

<#registration> a seg:OccasionRegistration ;
    seg:participantWebId <${participantWebId}> ;
    schema:name "${escapeTurtleString(name)}" ;
    seg:registeredAt "${new Date().toISOString()}" .
`;

    const registrationUrl = registrationsUrl + regId + '.ttl';

    const response = await session.fetch(registrationUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'text/turtle' },
        body: registrationTurtle
    });

    if (!response.ok) {
        throw new Error(`Registration failed: ${response.status}`);
    }

    return { registrationUrl };
}

/**
 * Fetch all participants from a registrations container
 */
async function fetchParticipants(registrationsUrl) {
    const session = getSolidSession();
    const fetchFn = session && session.info.isLoggedIn ? session.fetch.bind(session) : fetch;

    // First, get the container listing
    const response = await fetchFn(registrationsUrl, {
        headers: { 'Accept': 'text/turtle' }
    });

    if (!response.ok) {
        if (response.status === 404) {
            return []; // No registrations yet
        }
        throw new Error(`Could not fetch registrations: ${response.status}`);
    }

    const turtle = await response.text();

    // Parse container listing to find registration files
    // LDP containers list contained resources with ldp:contains
    const containsRegex = /<([^>]+)>\s+a\s+<http:\/\/www\.w3\.org\/ns\/ldp#Resource>/g;
    const resourceRegex = /ldp:contains\s+<([^>]+)>/g;

    const resources = [];
    let match;

    // Try ldp:contains pattern
    while ((match = resourceRegex.exec(turtle)) !== null) {
        const resourceUrl = match[1];
        if (resourceUrl.endsWith('.ttl') && !resourceUrl.includes('.placeholder')) {
            resources.push(resourceUrl.startsWith('http') ? resourceUrl : registrationsUrl + resourceUrl);
        }
    }

    // If no ldp:contains found, try to find resources another way
    if (resources.length === 0) {
        // Look for any .ttl files mentioned
        const ttlRegex = /<([^>]*\.ttl)>/g;
        while ((match = ttlRegex.exec(turtle)) !== null) {
            const resourceUrl = match[1];
            if (!resourceUrl.includes('.placeholder') && !resourceUrl.includes('occasion.ttl')) {
                resources.push(resourceUrl.startsWith('http') ? resourceUrl : registrationsUrl + resourceUrl);
            }
        }
    }

    // Fetch each registration file and extract participant data
    const participants = [];
    for (const resourceUrl of resources) {
        try {
            const regResponse = await fetchFn(resourceUrl, {
                headers: { 'Accept': 'text/turtle' }
            });

            if (regResponse.ok) {
                const regTurtle = await regResponse.text();
                const participant = parseRegistrationTurtle(regTurtle);
                if (participant.webId) {
                    participants.push(participant);
                }
            }
        } catch (e) {
            console.warn('Could not fetch registration:', resourceUrl, e);
        }
    }

    return participants;
}

/**
 * Parse registration Turtle data
 */
function parseRegistrationTurtle(turtle) {
    const registration = {
        webId: null,
        name: null,
        registeredAt: null
    };

    // Extract WebID
    const webIdMatch = turtle.match(/seg:participantWebId\s+<([^>]+)>/);
    if (webIdMatch) registration.webId = webIdMatch[1];

    // Extract name
    const nameMatch = turtle.match(/schema:name\s+"([^"]+)"/);
    if (nameMatch) registration.name = nameMatch[1];

    // Extract registration time
    const timeMatch = turtle.match(/seg:registeredAt\s+"([^"]+)"/);
    if (timeMatch) registration.registeredAt = timeMatch[1];

    return registration;
}

// ===========================================
// EXPOSE FUNCTIONS TO WINDOW (for onclick handlers)
// ===========================================

window.loginToSolid = loginToSolid;
window.logoutFromSolid = logoutFromSolid;
window.showWishlistEditor = showWishlistEditor;
window.closeWishlistModal = closeWishlistModal;
window.addWishlistItem = addWishlistItem;
window.removeWishlistItem = removeWishlistItem;
window.moveWishlistItem = moveWishlistItem;
window.showPersonWishlist = showPersonWishlist;
window.closeWishlistViewer = closeWishlistViewer;
window.linkCurrentUserToPerson = linkCurrentUserToPerson;
window.unlinkPersonFromSolid = unlinkPersonFromSolid;
window.getSolidProfiles = getSolidProfiles;
window.saveSolidProfiles = saveSolidProfiles;
window.getWishlistFromPod = getWishlistFromPod;
window.isSolidLoggedIn = isSolidLoggedIn;
window.getCurrentWebId = getCurrentWebId;

// Occasion management
window.createOccasionInPod = createOccasionInPod;
window.fetchOccasion = fetchOccasion;
window.registerParticipant = registerParticipant;
window.fetchParticipants = fetchParticipants;

// ===========================================
// INITIALIZATION
// ===========================================

/**
 * Initialize SOLID features when DOM is ready
 */
function initSolidFeatures() {
    populateSolidProviders();
    initSolid();
}

// Run initialization
initSolidFeatures();
