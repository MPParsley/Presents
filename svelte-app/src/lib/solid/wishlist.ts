import { auth, getPodBaseUrl } from '$lib/stores/auth';
import { parseTurtleWishlist, generateTurtleWishlist, type WishlistItem } from './turtle';
import { WISHLIST_PATH, WISHLIST_CACHE_KEY } from './constants';

/**
 * Get wishlist from a Solid Pod
 */
export async function getWishlist(webId: string): Promise<WishlistItem[]> {
	if (!webId) return [];

	const wishlistUrl = getPodBaseUrl(webId) + WISHLIST_PATH;

	try {
		const session = auth.getSession();
		const fetchFn = session.info.isLoggedIn ? session.fetch.bind(session) : fetch;

		const response = await fetchFn(wishlistUrl, {
			headers: { Accept: 'text/turtle' }
		});

		if (!response.ok) {
			if (response.status === 404) {
				return [];
			}
			throw new Error(`HTTP ${response.status}`);
		}

		const turtle = await response.text();
		const items = parseTurtleWishlist(turtle);

		// Cache the result
		cacheWishlist(webId, items);

		return items;
	} catch (error) {
		console.warn('Could not fetch wishlist from Pod:', error);

		// Try cached version
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
 */
export async function saveWishlist(items: WishlistItem[]): Promise<void> {
	const session = auth.getSession();
	if (!session.info.isLoggedIn || !session.info.webId) {
		throw new Error('Not logged in');
	}

	const wishlistUrl = getPodBaseUrl(session.info.webId) + WISHLIST_PATH;
	const turtle = generateTurtleWishlist(items);

	const response = await session.fetch(wishlistUrl, {
		method: 'PUT',
		headers: { 'Content-Type': 'text/turtle' },
		body: turtle
	});

	if (!response.ok) {
		throw new Error(`Failed to save wishlist: HTTP ${response.status}`);
	}

	// Update cache
	cacheWishlist(session.info.webId, items);

	// Ensure ACL exists to override public folder default
	// Default: only owner can access (until added to an occasion with lottery)
	await ensureWishlistACL();
}

/**
 * Ensure wishlist has a restrictive ACL (creates one if it doesn't exist)
 */
async function ensureWishlistACL(): Promise<void> {
	const session = auth.getSession();
	if (!session.info.isLoggedIn || !session.info.webId) {
		return;
	}

	const wishlistUrl = getPodBaseUrl(session.info.webId) + WISHLIST_PATH;
	const aclUrl = wishlistUrl + '.acl';

	// Check if ACL already exists
	try {
		const checkResponse = await session.fetch(aclUrl, { method: 'HEAD' });
		if (checkResponse.ok) {
			// ACL exists, don't overwrite it
			return;
		}
	} catch {
		// Error checking, continue to create ACL
	}

	// Create default restrictive ACL (owner only)
	const aclTurtle = `@prefix acl: <http://www.w3.org/ns/auth/acl#> .

<#owner>
    a acl:Authorization ;
    acl:agent <${session.info.webId}> ;
    acl:accessTo <./wishlist.ttl> ;
    acl:mode acl:Read, acl:Write, acl:Control .
`;

	await session.fetch(aclUrl, {
		method: 'PUT',
		headers: { 'Content-Type': 'text/turtle' },
		body: aclTurtle
	});
}

/**
 * Set ACL on current user's wishlist to restrict access
 * @param allowedReaders - WebIDs of users who can read the wishlist (besides owner)
 * @param allowAuthenticated - If true, allow all authenticated Solid users to read (recommended for lottery)
 */
export async function setWishlistACL(
	allowedReaders: string[],
	allowAuthenticated: boolean = false
): Promise<void> {
	const session = auth.getSession();
	if (!session.info.isLoggedIn || !session.info.webId) {
		throw new Error('Not logged in');
	}

	const wishlistUrl = getPodBaseUrl(session.info.webId) + WISHLIST_PATH;
	const aclUrl = wishlistUrl + '.acl';

	// Build ACL entries for specific allowed readers
	let readerEntries = '';
	allowedReaders.forEach((webId, index) => {
		readerEntries += `
<#reader${index}>
    a acl:Authorization ;
    acl:agent <${webId}> ;
    acl:accessTo <./wishlist.ttl> ;
    acl:mode acl:Read .
`;
	});

	// If allowing all authenticated users, add that entry
	if (allowAuthenticated) {
		readerEntries += `
<#authenticated>
    a acl:Authorization ;
    acl:agentClass acl:AuthenticatedAgent ;
    acl:accessTo <./wishlist.ttl> ;
    acl:mode acl:Read .
`;
	}

	const aclTurtle = `@prefix acl: <http://www.w3.org/ns/auth/acl#> .

<#owner>
    a acl:Authorization ;
    acl:agent <${session.info.webId}> ;
    acl:accessTo <./wishlist.ttl> ;
    acl:mode acl:Read, acl:Write, acl:Control .
${readerEntries}`;

	const response = await session.fetch(aclUrl, {
		method: 'PUT',
		headers: { 'Content-Type': 'text/turtle' },
		body: aclTurtle
	});

	if (!response.ok) {
		console.warn('Could not set wishlist ACL:', response.status, await response.text().catch(() => ''));
	}
}

// Cache functions
function cacheWishlist(webId: string, items: WishlistItem[]): void {
	try {
		const cache = getWishlistCache();
		cache[webId] = {
			items,
			cachedAt: Date.now()
		};
		localStorage.setItem(WISHLIST_CACHE_KEY, JSON.stringify(cache));
	} catch {
		// Ignore localStorage errors
	}
}

function getCachedWishlist(webId: string): WishlistItem[] | null {
	const cache = getWishlistCache();
	if (cache[webId]) {
		return cache[webId].items;
	}
	return null;
}

function getWishlistCache(): Record<string, { items: WishlistItem[]; cachedAt: number }> {
	try {
		const data = localStorage.getItem(WISHLIST_CACHE_KEY);
		return data ? JSON.parse(data) : {};
	} catch {
		return {};
	}
}
