// Solid providers
export const SOLID_PROVIDERS = [
	{ name: 'solidcommunity.net', url: 'https://solidcommunity.net' },
	{ name: 'solidweb.org', url: 'https://solidweb.org' },
	{ name: 'solidweb.me', url: 'https://solidweb.me' },
	{ name: 'inrupt.net', url: 'https://inrupt.net' }
];

// Paths
export const PRESENTS_PATH = '/public/presents';
export const WISHLIST_PATH = `${PRESENTS_PATH}/wishlist.ttl`;
export const OCCASIONS_PATH = `${PRESENTS_PATH}/occasions`;
export const MY_REGISTRATIONS_PATH = `${PRESENTS_PATH}/my-registrations.ttl`;

// Storage keys
export const SOLID_STORAGE_KEY = 'giftApp.solidProfiles';
export const WISHLIST_CACHE_KEY = 'giftApp.wishlistCache';

// RDF Namespaces
export const SCHEMA_NS = 'http://schema.org/';
export const SEG_NS = 'https://segersrosseel.be/ns/gift#';
export const RDF_NS = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
