import { auth, getPodBaseUrl } from '$lib/stores/auth';
import {
	generateOccasionTurtle,
	parseOccasionTurtle,
	parseRegistrationTurtle,
	escapeTurtleString,
	type Occasion,
	type Participant
} from './turtle';
import { OCCASIONS_PATH, MY_REGISTRATIONS_PATH } from './constants';

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
	const occasionPath = `${OCCASIONS_PATH}/${data.id}`;
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

	// Set ACL for registrations (append-only for authenticated users)
	await setRegistrationsACL(registrationsUrl, session.info.webId);

	return { occasionUrl, registrationsUrl };
}

/**
 * Set ACL on registrations container:
 * - Owner: full control (Read, Write, Control)
 * - Authenticated users: Append only (no Read)
 */
async function setRegistrationsACL(containerUrl: string, ownerWebId: string): Promise<void> {
	const session = auth.getSession();
	const aclUrl = containerUrl + '.acl';

	const aclTurtle = `@prefix acl: <http://www.w3.org/ns/auth/acl#> .

<#owner>
    a acl:Authorization ;
    acl:agent <${ownerWebId}> ;
    acl:accessTo <./> ;
    acl:default <./> ;
    acl:mode acl:Read, acl:Write, acl:Control .

<#authenticated>
    a acl:Authorization ;
    acl:agentClass acl:AuthenticatedAgent ;
    acl:accessTo <./> ;
    acl:default <./> ;
    acl:mode acl:Append .
`;

	const response = await session.fetch(aclUrl, {
		method: 'PUT',
		headers: { 'Content-Type': 'text/turtle' },
		body: aclTurtle
	});

	if (!response.ok) {
		console.warn('Could not set ACL:', response.status, await response.text().catch(() => ''));
	}
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
	const occasionsContainerUrl = `${podBase}${OCCASIONS_PATH}/`;

	try {
		const response = await fetchFn(occasionsContainerUrl, {
			headers: { Accept: 'text/turtle' }
		});

		if (!response.ok) {
			// 404 means folder doesn't exist yet - return empty array
			if (response.status === 404 || response.status === 403) {
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
	} catch {
		// Network error or other issue - return empty array
		return [];
	}
}

/**
 * Register a participant for an occasion
 * - Writes registration to admin's pod (append-only)
 * - Also stores registration in participant's own pod (for checking)
 */
export async function registerParticipant(
	registrationsUrl: string,
	participantWebId: string,
	occasionUrl: string
): Promise<{ registrationUrl: string }> {
	const session = auth.getSession();
	if (!session.info.isLoggedIn) {
		throw new Error('Not logged in');
	}

	// Check if already registered (by checking own pod)
	const alreadyRegistered = await checkMyRegistration(occasionUrl);
	if (alreadyRegistered) {
		throw new Error('Je bent al ingeschreven voor deze gelegenheid');
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

	// Use POST to append to admin's container (works with acl:Append permission)
	const response = await session.fetch(registrationsUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'text/turtle',
			'Slug': regId + '.ttl'
		},
		body: registrationTurtle
	});

	if (!response.ok) {
		const errorText = await response.text().catch(() => '');
		throw new Error(`Registration failed: ${response.status} ${errorText}`);
	}

	// Get the actual URL from Location header, or construct it
	const registrationUrl = response.headers.get('Location') || (registrationsUrl + regId + '.ttl');

	// Also store in participant's own pod (so they can check their registration status)
	await storeMyRegistration(occasionUrl);

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
	const resourceSet = new Set<string>();

	// Find all registration .ttl files directly (simpler and more reliable)
	const resourceRegex = /<(reg-[^>]+\.ttl)>/g;
	let match;

	while ((match = resourceRegex.exec(turtle)) !== null) {
		const resourceUrl = match[1];
		const fullUrl = resourceUrl.startsWith('http') ? resourceUrl : registrationsUrl + resourceUrl;
		resourceSet.add(fullUrl);
	}

	const resources = Array.from(resourceSet);
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

	// Deduplicate by webId, keeping the most recent registration
	const uniqueByWebId = new Map<string, Participant>();
	for (const p of participants) {
		const existing = uniqueByWebId.get(p.webId);
		if (!existing || (p.registeredAt && existing.registeredAt && p.registeredAt > existing.registeredAt)) {
			uniqueByWebId.set(p.webId, p);
		}
	}

	return Array.from(uniqueByWebId.values());
}

/**
 * Store registration in participant's own pod
 * This allows the participant to know which occasions they registered for
 */
async function storeMyRegistration(occasionUrl: string): Promise<void> {
	const session = auth.getSession();
	if (!session.info.isLoggedIn || !session.info.webId) {
		throw new Error('Not logged in');
	}

	const podBase = getPodBaseUrl(session.info.webId);
	const myRegistrationsUrl = `${podBase}${MY_REGISTRATIONS_PATH}`;

	// Try to fetch existing registrations
	let existingTurtle = '';
	try {
		const response = await session.fetch(myRegistrationsUrl, {
			headers: { Accept: 'text/turtle' }
		});
		if (response.ok) {
			existingTurtle = await response.text();
		}
	} catch {
		// File doesn't exist yet, that's fine
	}

	// Check if already registered for this occasion
	if (existingTurtle.includes(`<${occasionUrl}>`)) {
		return; // Already registered
	}

	// Add new registration
	const newEntry = `
<#reg-${Date.now()}> a <https://segersrosseel.be/ns/gift#MyRegistration> ;
    <https://segersrosseel.be/ns/gift#occasionUrl> <${occasionUrl}> ;
    <https://segersrosseel.be/ns/gift#registeredAt> "${new Date().toISOString()}" .
`;

	const updatedTurtle = existingTurtle
		? existingTurtle + newEntry
		: `@prefix seg: <https://segersrosseel.be/ns/gift#> .\n${newEntry}`;

	const response = await session.fetch(myRegistrationsUrl, {
		method: 'PUT',
		headers: { 'Content-Type': 'text/turtle' },
		body: updatedTurtle
	});

	if (!response.ok) {
		console.warn('Could not store registration in own pod:', response.status);
	}
}

/**
 * Check if current user is registered for an occasion (by checking their own pod)
 */
export async function checkMyRegistration(occasionUrl: string): Promise<boolean> {
	const session = auth.getSession();
	if (!session.info.isLoggedIn || !session.info.webId) {
		return false;
	}

	const podBase = getPodBaseUrl(session.info.webId);
	const myRegistrationsUrl = `${podBase}${MY_REGISTRATIONS_PATH}`;

	try {
		const response = await session.fetch(myRegistrationsUrl, {
			headers: { Accept: 'text/turtle' }
		});

		if (!response.ok) {
			return false;
		}

		const turtle = await response.text();
		return turtle.includes(`<${occasionUrl}>`);
	} catch {
		return false;
	}
}

/**
 * Get all occasions the current user is registered for
 */
export async function getMyRegistrations(): Promise<string[]> {
	const session = auth.getSession();
	if (!session.info.isLoggedIn || !session.info.webId) {
		return [];
	}

	const podBase = getPodBaseUrl(session.info.webId);
	const myRegistrationsUrl = `${podBase}${MY_REGISTRATIONS_PATH}`;

	try {
		const response = await session.fetch(myRegistrationsUrl, {
			headers: { Accept: 'text/turtle' }
		});

		if (!response.ok) {
			return [];
		}

		const turtle = await response.text();
		const occasionUrls: string[] = [];

		// Parse occasion URLs from the turtle (matches both prefixed and full URI form)
		const regex = /<https:\/\/segersrosseel\.be\/ns\/gift#occasionUrl>\s+<([^>]+)>/g;
		let match;
		while ((match = regex.exec(turtle)) !== null) {
			occasionUrls.push(match[1]);
		}

		return occasionUrls;
	} catch {
		return [];
	}
}

export interface Assignment {
	giverWebId: string;
	receiverWebId: string;
	receiverName: string;
}

/**
 * Perform a lottery for an occasion
 * Each participant is assigned to give a gift to another participant (circular)
 */
export async function performLottery(
	occasionUrl: string,
	participants: Participant[]
): Promise<Assignment[]> {
	const session = auth.getSession();
	if (!session.info.isLoggedIn) {
		throw new Error('Not logged in');
	}

	if (participants.length < 2) {
		throw new Error('Need at least 2 participants for lottery');
	}

	// Shuffle participants using Fisher-Yates algorithm
	const shuffled = [...participants];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}

	// Create circular assignments: each person gives to the next in the shuffled list
	const assignments: Assignment[] = [];
	for (let i = 0; i < shuffled.length; i++) {
		const giver = shuffled[i];
		const receiver = shuffled[(i + 1) % shuffled.length];
		assignments.push({
			giverWebId: giver.webId!,
			receiverWebId: receiver.webId!,
			receiverName: receiver.name || 'Onbekend'
		});
	}

	// Store assignments in occasion folder
	const assignmentsUrl = occasionUrl.replace('occasion.ttl', 'assignments.ttl');
	const assignmentsTurtle = generateAssignmentsTurtle(assignments);

	const response = await session.fetch(assignmentsUrl, {
		method: 'PUT',
		headers: { 'Content-Type': 'text/turtle' },
		body: assignmentsTurtle
	});

	if (!response.ok) {
		throw new Error(`Could not save assignments: ${response.status}`);
	}

	// Store individual assignment files for each participant (they can only read their own)
	const baseUrl = occasionUrl.replace('occasion.ttl', '');
	for (const assignment of assignments) {
		await storeIndividualAssignment(baseUrl, assignment, session.info.webId!);
	}

	// Also store "drawer" files so each participant knows who drew them
	for (const assignment of assignments) {
		const drawer = assignments.find(a => a.receiverWebId === assignment.giverWebId);
		if (drawer) {
			await storeDrawerInfo(baseUrl, assignment.giverWebId, drawer.giverWebId, session.info.webId!);
		}
	}

	return assignments;
}

/**
 * Store an individual assignment file that only the giver can read
 */
async function storeIndividualAssignment(
	baseUrl: string,
	assignment: Assignment,
	ownerWebId: string
): Promise<void> {
	const session = auth.getSession();

	// Create a filename based on giver's webId (use hash to make it URL-safe)
	const giverHash = btoa(assignment.giverWebId).replace(/[/+=]/g, '_').substring(0, 20);
	const assignmentUrl = `${baseUrl}assignment-${giverHash}.ttl`;

	const turtle = `@prefix seg: <https://segersrosseel.be/ns/gift#> .
@prefix schema: <http://schema.org/> .

<#assignment> a seg:Assignment ;
    seg:giverWebId <${assignment.giverWebId}> ;
    seg:receiverWebId <${assignment.receiverWebId}> ;
    schema:name "${escapeTurtleString(assignment.receiverName)}" .
`;

	const response = await session.fetch(assignmentUrl, {
		method: 'PUT',
		headers: { 'Content-Type': 'text/turtle' },
		body: turtle
	});

	if (!response.ok) {
		console.warn('Could not save individual assignment:', response.status);
		return;
	}

	// Set ACL: only owner and the giver can read this file
	const aclUrl = assignmentUrl + '.acl';
	const aclTurtle = `@prefix acl: <http://www.w3.org/ns/auth/acl#> .

<#owner>
    a acl:Authorization ;
    acl:agent <${ownerWebId}> ;
    acl:accessTo <./assignment-${giverHash}.ttl> ;
    acl:mode acl:Read, acl:Write, acl:Control .

<#giver>
    a acl:Authorization ;
    acl:agent <${assignment.giverWebId}> ;
    acl:accessTo <./assignment-${giverHash}.ttl> ;
    acl:mode acl:Read .
`;

	await session.fetch(aclUrl, {
		method: 'PUT',
		headers: { 'Content-Type': 'text/turtle' },
		body: aclTurtle
	});
}

/**
 * Store info about who draws a specific participant (so they can set ACL on their wishlist)
 */
async function storeDrawerInfo(
	baseUrl: string,
	receiverWebId: string,
	drawerWebId: string,
	ownerWebId: string
): Promise<void> {
	const session = auth.getSession();

	// Create a filename based on receiver's webId
	const receiverHash = btoa(receiverWebId).replace(/[/+=]/g, '_').substring(0, 20);
	const drawerUrl = `${baseUrl}drawer-for-${receiverHash}.ttl`;

	const turtle = `@prefix seg: <https://segersrosseel.be/ns/gift#> .

<#drawerInfo> a seg:DrawerInfo ;
    seg:receiverWebId <${receiverWebId}> ;
    seg:drawerWebId <${drawerWebId}> .
`;

	const response = await session.fetch(drawerUrl, {
		method: 'PUT',
		headers: { 'Content-Type': 'text/turtle' },
		body: turtle
	});

	if (!response.ok) {
		console.warn('Could not save drawer info:', response.status);
		return;
	}

	// Set ACL: only owner (admin) and the receiver can read this file
	const aclUrl = drawerUrl + '.acl';
	const aclTurtle = `@prefix acl: <http://www.w3.org/ns/auth/acl#> .

<#owner>
    a acl:Authorization ;
    acl:agent <${ownerWebId}> ;
    acl:accessTo <./drawer-for-${receiverHash}.ttl> ;
    acl:mode acl:Read, acl:Write, acl:Control .

<#receiver>
    a acl:Authorization ;
    acl:agent <${receiverWebId}> ;
    acl:accessTo <./drawer-for-${receiverHash}.ttl> ;
    acl:mode acl:Read .
`;

	await session.fetch(aclUrl, {
		method: 'PUT',
		headers: { 'Content-Type': 'text/turtle' },
		body: aclTurtle
	});
}

/**
 * Get the webId of the person who drew the current user
 */
export async function getWhoDrawsMe(occasionUrl: string): Promise<string | null> {
	const session = auth.getSession();
	if (!session.info.isLoggedIn || !session.info.webId) {
		return null;
	}

	const baseUrl = occasionUrl.replace('occasion.ttl', '');
	const receiverHash = btoa(session.info.webId).replace(/[/+=]/g, '_').substring(0, 20);
	const drawerUrl = `${baseUrl}drawer-for-${receiverHash}.ttl`;

	try {
		const response = await session.fetch(drawerUrl, {
			headers: { Accept: 'text/turtle' }
		});

		if (!response.ok) {
			return null;
		}

		const turtle = await response.text();
		const drawerMatch = turtle.match(/seg:drawerWebId\s+<([^>]+)>/);

		return drawerMatch ? drawerMatch[1] : null;
	} catch {
		return null;
	}
}

function generateAssignmentsTurtle(assignments: Assignment[]): string {
	let turtle = `@prefix seg: <https://segersrosseel.be/ns/gift#> .
@prefix schema: <http://schema.org/> .

`;
	assignments.forEach((a, i) => {
		turtle += `<#assignment-${i}> a seg:Assignment ;
    seg:giverWebId <${a.giverWebId}> ;
    seg:receiverWebId <${a.receiverWebId}> ;
    schema:name "${escapeTurtleString(a.receiverName)}" .

`;
	});
	return turtle;
}

/**
 * Fetch assignments for an occasion
 */
export async function fetchAssignments(occasionUrl: string): Promise<Assignment[]> {
	const session = auth.getSession();
	const fetchFn = session.info.isLoggedIn ? session.fetch.bind(session) : fetch;

	const assignmentsUrl = occasionUrl.replace('occasion.ttl', 'assignments.ttl');

	try {
		const response = await fetchFn(assignmentsUrl, {
			headers: { Accept: 'text/turtle' }
		});

		if (!response.ok) {
			if (response.status === 404) {
				return []; // No lottery yet
			}
			throw new Error(`HTTP ${response.status}`);
		}

		const turtle = await response.text();
		return parseAssignmentsTurtle(turtle);
	} catch {
		return [];
	}
}

function parseAssignmentsTurtle(turtle: string): Assignment[] {
	const assignments: Assignment[] = [];

	// Match each assignment block - capture everything between <#assignment-N> and the closing " ."
	// Using a more robust approach: find all giverWebId/receiverWebId pairs
	const giverRegex = /seg:giverWebId\s+<([^>]+)>/g;
	const receiverRegex = /seg:receiverWebId\s+<([^>]+)>/g;
	const nameRegex = /schema:name\s+"([^"]+)"/g;

	const givers: string[] = [];
	const receivers: string[] = [];
	const names: string[] = [];

	let match;
	while ((match = giverRegex.exec(turtle)) !== null) {
		givers.push(match[1]);
	}
	while ((match = receiverRegex.exec(turtle)) !== null) {
		receivers.push(match[1]);
	}
	while ((match = nameRegex.exec(turtle)) !== null) {
		names.push(match[1]);
	}

	// Combine them (they should be in order)
	for (let i = 0; i < givers.length && i < receivers.length; i++) {
		assignments.push({
			giverWebId: givers[i],
			receiverWebId: receivers[i],
			receiverName: names[i] || 'Onbekend'
		});
	}

	return assignments;
}

/**
 * Get the assignment for the current user by reading their individual assignment file
 */
export async function getMyAssignment(occasionUrl: string): Promise<Assignment | null> {
	const session = auth.getSession();
	if (!session.info.isLoggedIn || !session.info.webId) {
		return null;
	}

	// Try to read the individual assignment file for this user
	const baseUrl = occasionUrl.replace('occasion.ttl', '');
	const giverHash = btoa(session.info.webId).replace(/[/+=]/g, '_').substring(0, 20);
	const assignmentUrl = `${baseUrl}assignment-${giverHash}.ttl`;

	try {
		const response = await session.fetch(assignmentUrl, {
			headers: { Accept: 'text/turtle' }
		});

		if (!response.ok) {
			if (response.status === 404 || response.status === 403) {
				return null; // No assignment for this user or no lottery yet
			}
			return null;
		}

		const turtle = await response.text();

		// Parse the single assignment
		const giverMatch = turtle.match(/seg:giverWebId\s+<([^>]+)>/);
		const receiverMatch = turtle.match(/seg:receiverWebId\s+<([^>]+)>/);
		const nameMatch = turtle.match(/schema:name\s+"([^"]+)"/);

		if (giverMatch && receiverMatch) {
			return {
				giverWebId: giverMatch[1],
				receiverWebId: receiverMatch[1],
				receiverName: nameMatch ? nameMatch[1] : 'Onbekend'
			};
		}

		return null;
	} catch {
		return null;
	}
}

/**
 * Check if lottery has been performed for an occasion
 * For participants: checks their individual assignment file
 * For admin: checks the main assignments.ttl file
 */
export async function hasLottery(occasionUrl: string): Promise<boolean> {
	// First check if current user has an assignment (works for participants)
	const myAssignment = await getMyAssignment(occasionUrl);
	if (myAssignment) {
		return true;
	}

	// Fall back to checking assignments.ttl (works for admin)
	const assignments = await fetchAssignments(occasionUrl);
	return assignments.length > 0;
}
