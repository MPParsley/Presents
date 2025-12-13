import { auth, getPodBaseUrl } from '$lib/stores/auth';
import {
	generateOccasionTurtle,
	parseOccasionTurtle,
	parseRegistrationTurtle,
	escapeTurtleString,
	type Occasion,
	type Participant
} from './turtle';
import { GIFTSHUFFLER_PATH } from './constants';

export interface OccasionData {
	id: string;
	name: string;
	date?: string | null;
	adminWebId: string;
}

/**
 * Create an occasion in the user's Pod
 */
export async function createOccasion(
	data: OccasionData
): Promise<{ occasionUrl: string; registrationsUrl: string }> {
	const session = auth.getSession();
	if (!session.info.isLoggedIn || !session.info.webId) {
		throw new Error('Not logged in');
	}

	const podBase = getPodBaseUrl(session.info.webId);
	const occasionPath = `${GIFTSHUFFLER_PATH}/occasions/${data.id}`;
	const occasionUrl = `${podBase}${occasionPath}/occasion.ttl`;
	const registrationsUrl = `${podBase}${occasionPath}/registrations/`;

	// Create occasion.ttl
	const occasionTurtle = generateOccasionTurtle(data);
	const occasionResponse = await session.fetch(occasionUrl, {
		method: 'PUT',
		headers: { 'Content-Type': 'text/turtle' },
		body: occasionTurtle
	});

	if (!occasionResponse.ok) {
		throw new Error(`Failed to create occasion: ${occasionResponse.status}`);
	}

	// Create registrations container placeholder
	const placeholderUrl = `${registrationsUrl}.placeholder`;
	await session.fetch(placeholderUrl, {
		method: 'PUT',
		headers: { 'Content-Type': 'text/plain' },
		body: 'placeholder'
	});

	// Set ACL for public write
	await setPublicWriteACL(registrationsUrl, session.info.webId);

	return { occasionUrl, registrationsUrl };
}

/**
 * Set public write ACL on a container
 */
async function setPublicWriteACL(containerUrl: string, ownerWebId: string): Promise<void> {
	const session = auth.getSession();
	const aclUrl = containerUrl + '.acl';

	const aclTurtle = `@prefix acl: <http://www.w3.org/ns/auth/acl#> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .

<#owner>
    a acl:Authorization ;
    acl:agent <${ownerWebId}> ;
    acl:accessTo <./> ;
    acl:default <./> ;
    acl:mode acl:Read, acl:Write, acl:Control .

<#public>
    a acl:Authorization ;
    acl:agentClass foaf:Agent ;
    acl:accessTo <./> ;
    acl:default <./> ;
    acl:mode acl:Read, acl:Append .
`;

	await session.fetch(aclUrl, {
		method: 'PUT',
		headers: { 'Content-Type': 'text/turtle' },
		body: aclTurtle
	});
}

/**
 * Update an occasion in the user's Pod
 */
export async function updateOccasion(
	occasionUrl: string,
	data: { name: string; date?: string | null; adminWebId: string }
): Promise<void> {
	const session = auth.getSession();
	if (!session.info.isLoggedIn) {
		throw new Error('Not logged in');
	}

	const occasionTurtle = generateOccasionTurtle(data);
	const response = await session.fetch(occasionUrl, {
		method: 'PUT',
		headers: { 'Content-Type': 'text/turtle' },
		body: occasionTurtle
	});

	if (!response.ok) {
		throw new Error(`Failed to update occasion: ${response.status}`);
	}
}

/**
 * Delete an occasion and all its registrations
 */
export async function deleteOccasion(occasionUrl: string): Promise<void> {
	const session = auth.getSession();
	if (!session.info.isLoggedIn) {
		throw new Error('Not logged in');
	}

	// Get the folder URL from occasion.ttl URL
	const folderUrl = occasionUrl.replace('occasion.ttl', '');
	const registrationsUrl = folderUrl + 'registrations/';

	// First, delete all registrations
	try {
		const regResponse = await session.fetch(registrationsUrl, {
			headers: { Accept: 'text/turtle' }
		});

		if (regResponse.ok) {
			const turtle = await regResponse.text();
			const resourceRegex = /ldp:contains\s+<([^>]+)>/g;
			let match;

			while ((match = resourceRegex.exec(turtle)) !== null) {
				const resourceUrl = match[1];
				const fullUrl = resourceUrl.startsWith('http') ? resourceUrl : registrationsUrl + resourceUrl;
				await session.fetch(fullUrl, { method: 'DELETE' });
			}
		}

		// Delete registrations container ACL
		await session.fetch(registrationsUrl + '.acl', { method: 'DELETE' });

		// Delete registrations container
		await session.fetch(registrationsUrl, { method: 'DELETE' });
	} catch (e) {
		console.warn('Could not delete registrations:', e);
	}

	// Delete occasion.ttl
	const occasionResponse = await session.fetch(occasionUrl, { method: 'DELETE' });
	if (!occasionResponse.ok && occasionResponse.status !== 404) {
		throw new Error(`Failed to delete occasion: ${occasionResponse.status}`);
	}

	// Delete the folder
	await session.fetch(folderUrl, { method: 'DELETE' });
}

/**
 * Fetch occasion data from URL
 */
export async function fetchOccasion(occasionUrl: string): Promise<Occasion> {
	const session = auth.getSession();
	const fetchFn = session.info.isLoggedIn ? session.fetch.bind(session) : fetch;

	const response = await fetchFn(occasionUrl, {
		headers: { Accept: 'text/turtle' }
	});

	if (!response.ok) {
		throw new Error(`Could not fetch occasion: ${response.status}`);
	}

	const turtle = await response.text();
	return parseOccasionTurtle(turtle, occasionUrl);
}

/**
 * Fetch user's occasions from their Pod
 */
export async function fetchMyOccasions(
	webId: string
): Promise<Array<{ name: string; url: string }>> {
	const session = auth.getSession();
	const fetchFn = session.info.isLoggedIn ? session.fetch.bind(session) : fetch;

	const podBase = getPodBaseUrl(webId);
	const occasionsContainerUrl = `${podBase}${GIFTSHUFFLER_PATH}/occasions/`;

	const response = await fetchFn(occasionsContainerUrl, {
		headers: { Accept: 'text/turtle' }
	});

	if (!response.ok) {
		if (response.status === 404) {
			return [];
		}
		throw new Error(`HTTP ${response.status}`);
	}

	const turtle = await response.text();
	const occasions: Array<{ name: string; url: string }> = [];

	// Parse ldp:contains with comma-separated values
	const containsRegex = /ldp:contains\s+([^;.]+)/g;
	let containsMatch;

	while ((containsMatch = containsRegex.exec(turtle)) !== null) {
		const containsSection = containsMatch[1];
		const urlRegex = /<([^>]+)>/g;
		let urlMatch;

		while ((urlMatch = urlRegex.exec(containsSection)) !== null) {
			const itemUrl = urlMatch[1];
			if (itemUrl.endsWith('/')) {
				const fullUrl = itemUrl.startsWith('http') ? itemUrl : occasionsContainerUrl + itemUrl;
				const name = itemUrl.replace(/\/$/, '').split('/').pop() || '';
				occasions.push({
					name,
					url: fullUrl + 'occasion.ttl'
				});
			}
		}
	}

	return occasions;
}

/**
 * Register a participant for an occasion
 */
export async function registerParticipant(
	registrationsUrl: string,
	participantWebId: string
): Promise<{ registrationUrl: string }> {
	const session = auth.getSession();
	if (!session.info.isLoggedIn) {
		throw new Error('Not logged in');
	}

	const regId = 'reg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
	const name = participantWebId.replace('https://', '').split('.')[0];

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
export async function fetchParticipants(registrationsUrl: string): Promise<Participant[]> {
	const session = auth.getSession();
	const fetchFn = session.info.isLoggedIn ? session.fetch.bind(session) : fetch;

	const response = await fetchFn(registrationsUrl, {
		headers: { Accept: 'text/turtle' }
	});

	if (!response.ok) {
		if (response.status === 404) {
			return [];
		}
		throw new Error(`Could not fetch registrations: ${response.status}`);
	}

	const turtle = await response.text();
	const resources: string[] = [];
	const resourceRegex = /ldp:contains\s+<([^>]+)>/g;
	let match;

	while ((match = resourceRegex.exec(turtle)) !== null) {
		const resourceUrl = match[1];
		if (resourceUrl.endsWith('.ttl') && !resourceUrl.includes('.placeholder')) {
			resources.push(resourceUrl.startsWith('http') ? resourceUrl : registrationsUrl + resourceUrl);
		}
	}

	const participants: Participant[] = [];
	for (const resourceUrl of resources) {
		try {
			const regResponse = await fetchFn(resourceUrl, {
				headers: { Accept: 'text/turtle' }
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
