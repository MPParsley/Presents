import { writable, derived, get } from 'svelte/store';
import {
	login,
	logout,
	handleIncomingRedirect,
	getDefaultSession,
	type Session
} from '@inrupt/solid-client-authn-browser';

// Auth state store
interface AuthState {
	isLoggedIn: boolean;
	webId: string | null;
	isLoading: boolean;
}

const createAuthStore = () => {
	const { subscribe, set, update } = writable<AuthState>({
		isLoggedIn: false,
		webId: null,
		isLoading: true
	});

	return {
		subscribe,

		async init() {
			update((s) => ({ ...s, isLoading: true }));

			try {
				const currentParams = new URLSearchParams(window.location.search);
				const isOidcCallback = currentParams.has('code') || currentParams.has('state');
				const originalUrl = window.location.href;

				await handleIncomingRedirect({ restorePreviousSession: true });

				if (isOidcCallback) {
					restoreQueryParams();
				} else if (window.location.href !== originalUrl) {
					window.history.replaceState({}, '', originalUrl);
				}

				const session = getDefaultSession();
				set({
					isLoggedIn: session.info.isLoggedIn,
					webId: session.info.webId ?? null,
					isLoading: false
				});
			} catch (error) {
				console.error('Error initializing Solid:', error);
				set({ isLoggedIn: false, webId: null, isLoading: false });
			}
		},

		async login(providerUrl: string) {
			storeQueryParams();

			const url = new URL(window.location.href);
			url.hash = '';
			url.searchParams.delete('code');
			url.searchParams.delete('state');

			await login({
				oidcIssuer: providerUrl,
				redirectUrl: url.toString(),
				clientName: 'Gift Name Shuffler'
			});
		},

		async logout() {
			await logout();
			set({ isLoggedIn: false, webId: null, isLoading: false });
		},

		getSession(): Session {
			return getDefaultSession();
		}
	};
};

// Helper functions for query param handling
function storeQueryParams() {
	const params = new URLSearchParams(window.location.search);
	params.delete('code');
	params.delete('state');

	if (params.toString()) {
		sessionStorage.setItem('solid_redirect_params', params.toString());
	}
}

function restoreQueryParams() {
	const savedParams = sessionStorage.getItem('solid_redirect_params');
	if (!savedParams) return;

	const currentParams = new URLSearchParams(window.location.search);
	const isOidcCallback = currentParams.has('code') || currentParams.has('state');

	if (!isOidcCallback) {
		sessionStorage.removeItem('solid_redirect_params');
		return;
	}

	const savedParamsObj = new URLSearchParams(savedParams);
	let needsRestore = false;

	for (const [key, value] of savedParamsObj) {
		if (!currentParams.has(key)) {
			needsRestore = true;
			currentParams.set(key, value);
		}
	}

	currentParams.delete('code');
	currentParams.delete('state');
	sessionStorage.removeItem('solid_redirect_params');

	if (needsRestore) {
		const newUrl = window.location.pathname + '?' + currentParams.toString();
		window.location.replace(newUrl);
	}
}

export const auth = createAuthStore();

// Derived stores for convenience
export const isLoggedIn = derived(auth, ($auth) => $auth.isLoggedIn);
export const webId = derived(auth, ($auth) => $auth.webId);
export const isAuthLoading = derived(auth, ($auth) => $auth.isLoading);

// Utility function to get Pod base URL from WebID
export function getPodBaseUrl(webId: string): string {
	try {
		const url = new URL(webId);
		return url.origin;
	} catch {
		return webId.split('/profile/')[0];
	}
}

// Shorthand for current WebID
export function getShortWebId(webId: string): string {
	return webId.replace('https://', '').replace('/profile/card#me', '');
}
