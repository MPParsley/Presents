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
