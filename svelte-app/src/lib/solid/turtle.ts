/**
 * Turtle parsing and generation utilities
 */

export interface WishlistItem {
	id: string;
	name: string;
	description: string;
	url: string;
	priority: number;
	position: number;
}

export interface Occasion {
	name: string;
	date: string | null;
	adminWebId: string | null;
	registrationsUrl: string;
}

export interface Participant {
	webId: string | null;
	name: string | null;
	registeredAt: string | null;
}

/**
 * Escape string for Turtle format
 */
export function escapeTurtleString(str: string): string {
	if (!str) return '';
	return str
		.replace(/\\/g, '\\\\')
		.replace(/"/g, '\\"')
		.replace(/\n/g, '\\n')
		.replace(/\r/g, '\\r')
		.replace(/\t/g, '\\t');
}

/**
 * Parse Turtle wishlist to items
 */
export function parseTurtleWishlist(turtle: string): WishlistItem[] {
	const items: WishlistItem[] = [];
	const itemRegex = /<#([^>]+)>\s+a\s+schema:ListItem\s*;([\s\S]+?)\s+\./g;
	let match;

	while ((match = itemRegex.exec(turtle)) !== null) {
		const itemId = match[1];
		const properties = match[2];

		const item: WishlistItem = {
			id: itemId,
			name: '',
			description: '',
			url: '',
			priority: 3,
			position: 0
		};

		const nameMatch = properties.match(/schema:name\s+"([^"]*)"(?:@[a-z]+)?/);
		if (nameMatch) item.name = nameMatch[1];

		const descMatch = properties.match(/schema:description\s+"([^"]*)"(?:@[a-z]+)?/);
		if (descMatch) item.description = descMatch[1];

		const urlMatch = properties.match(/schema:url\s+<([^>]+)>/);
		if (urlMatch) item.url = urlMatch[1];

		const prioMatch = properties.match(/seg:priority\s+(\d+)/);
		if (prioMatch) item.priority = parseInt(prioMatch[1]);

		const posMatch = properties.match(/schema:position\s+(\d+)/);
		if (posMatch) item.position = parseInt(posMatch[1]);

		items.push(item);
	}

	return items.sort((a, b) => b.priority - a.priority || a.position - b.position);
}

/**
 * Generate Turtle for wishlist items
 */
export function generateTurtleWishlist(items: WishlistItem[]): string {
	let turtle = `@prefix schema: <http://schema.org/> .
@prefix seg: <https://segersrosseel.be/ns/gift#> .

`;

	items.forEach((item, index) => {
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
 * Generate Turtle for occasion metadata
 */
export function generateOccasionTurtle(data: {
	name: string;
	date?: string | null;
	adminWebId: string;
}): string {
	return `@prefix schema: <http://schema.org/> .
@prefix seg: <https://segersrosseel.be/ns/gift#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

<> a schema:Event ;
    schema:name "${escapeTurtleString(data.name)}" ;
    seg:adminWebId <${data.adminWebId}>${data.date ? ` ;
    schema:startDate "${data.date}"^^xsd:date` : ''} .
`;
}

/**
 * Parse occasion Turtle data
 */
export function parseOccasionTurtle(turtle: string, baseUrl: string): Occasion {
	const occasion: Occasion = {
		name: '',
		date: null,
		adminWebId: null,
		registrationsUrl: baseUrl.replace('occasion.ttl', 'registrations/')
	};

	const nameMatch = turtle.match(/schema:name\s+"([^"]+)"/);
	if (nameMatch) occasion.name = nameMatch[1];

	const dateMatch = turtle.match(/schema:startDate\s+"([^"]+)"/);
	if (dateMatch) occasion.date = dateMatch[1];

	const adminMatch = turtle.match(/seg:adminWebId\s+<([^>]+)>/);
	if (adminMatch) occasion.adminWebId = adminMatch[1];

	return occasion;
}

/**
 * Parse registration Turtle data
 */
export function parseRegistrationTurtle(turtle: string): Participant {
	const registration: Participant = {
		webId: null,
		name: null,
		registeredAt: null
	};

	const webIdMatch = turtle.match(/seg:participantWebId\s+<([^>]+)>/);
	if (webIdMatch) registration.webId = webIdMatch[1];

	const nameMatch = turtle.match(/schema:name\s+"([^"]+)"/);
	if (nameMatch) registration.name = nameMatch[1];

	const timeMatch = turtle.match(/seg:registeredAt\s+"([^"]+)"/);
	if (timeMatch) registration.registeredAt = timeMatch[1];

	return registration;
}

/**
 * Generate unique ID
 */
export function generateId(): string {
	return Math.random().toString(36).substring(2, 15);
}
