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
// IMPORTS FROM ESM.SH CDN
// ===========================================

// Using esm.sh CDN which handles modern packages better than Skypack
import {
    login,
    logout,
    handleIncomingRedirect,
    getDefaultSession
} from "https://esm.sh/@inrupt/solid-client-authn-browser@2";

import * as solidClient from "https://esm.sh/@inrupt/solid-client@2";

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
        await login({
            oidcIssuer: providerUrl,
            redirectUrl: window.location.href,
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
// WISHLIST CRUD OPERATIONS
// ===========================================

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
        const fetchFn = session && session.info.isLoggedIn ? session.fetch : fetch;

        // Fetch the dataset
        const dataset = await solidClient.getSolidDataset(wishlistUrl, {
            fetch: fetchFn
        });

        // Get all things from the dataset
        const things = solidClient.getThingAll(dataset);

        // Parse wishlist items
        const items = things
            .filter(thing => {
                const types = solidClient.getUrlAll(thing, RDF_NS + 'type');
                return types.includes(SCHEMA_NS + 'ListItem');
            })
            .map(thing => ({
                id: thing.url || generateId(),
                name: solidClient.getStringNoLocale(thing, SCHEMA_NS + 'name') || '',
                description: solidClient.getStringNoLocale(thing, SCHEMA_NS + 'description') || '',
                url: solidClient.getUrl(thing, SCHEMA_NS + 'url') || '',
                priority: solidClient.getInteger(thing, SEG_NS + 'priority') || 3,
                position: solidClient.getInteger(thing, SCHEMA_NS + 'position') || 0
            }))
            .sort((a, b) => b.priority - a.priority || a.position - b.position);

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

        // 404 means no wishlist yet - not an error
        if (error.statusCode === 404) {
            return [];
        }

        throw error;
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

    // Create a new dataset
    let dataset = solidClient.createSolidDataset();

    // Add each item as a Thing
    items.forEach((item, index) => {
        const itemUrl = wishlistUrl + '#item-' + (item.id || generateId());

        let thing = solidClient.buildThing(solidClient.createThing({ url: itemUrl }))
            .addUrl(RDF_NS + 'type', SCHEMA_NS + 'ListItem')
            .addStringNoLocale(SCHEMA_NS + 'name', item.name || '')
            .addInteger(SCHEMA_NS + 'position', index + 1)
            .addInteger(SEG_NS + 'priority', item.priority || 3);

        if (item.description) {
            thing = thing.addStringNoLocale(SCHEMA_NS + 'description', item.description);
        }

        if (item.url) {
            thing = thing.addUrl(SCHEMA_NS + 'url', item.url);
        }

        dataset = solidClient.setThing(dataset, thing.build());
    });

    // Save to Pod
    await solidClient.saveSolidDatasetAt(wishlistUrl, dataset, {
        fetch: session.fetch
    });

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
        contentEl.innerHTML = '<p><em>Deze persoon heeft geen Solid Pod gekoppeld.</em></p>';
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
