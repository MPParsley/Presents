<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { auth, isLoggedIn, webId, isAuthLoading } from '$lib/stores/auth';
	import SolidLogin from '$lib/components/SolidLogin.svelte';
	import {
		createOccasion,
		fetchOccasion,
		fetchMyOccasions,
		registerParticipant,
		fetchParticipants,
		type Occasion,
		type Participant
	} from '$lib/solid';

	// State
	let occasionUrl = $state<string | null>(null);
	let currentOccasion = $state<Occasion | null>(null);
	let participants = $state<Participant[]>([]);
	let myOccasions = $state<Array<{ name: string; url: string }>>([]);
	let isLoading = $state(false);
	let isAdmin = $state(false);
	let isRegistered = $state(false);
	let error = $state<string | null>(null);

	// Form state
	let newOccasionName = $state('');
	let newOccasionDate = $state('');

	// Capture occasion URL from query params (stored in sessionStorage for OIDC redirects)
	onMount(() => {
		const urlParam = $page.url.searchParams.get('occasion');
		if (urlParam) {
			sessionStorage.setItem('current_occasion_url', urlParam);
			occasionUrl = urlParam;
		} else {
			const stored = sessionStorage.getItem('current_occasion_url');
			if (stored && !$page.url.searchParams.has('code')) {
				occasionUrl = stored;
			} else if (!$page.url.searchParams.has('code')) {
				sessionStorage.removeItem('current_occasion_url');
			}
		}
	});

	// Load occasion when URL changes
	$effect(() => {
		if (occasionUrl && !$isAuthLoading) {
			loadOccasion(occasionUrl);
		}
	});

	// Load my occasions when logged in and no occasion selected
	$effect(() => {
		if ($isLoggedIn && $webId && !occasionUrl && !$isAuthLoading) {
			loadMyOccasions();
		}
	});

	async function loadOccasion(url: string) {
		isLoading = true;
		error = null;

		try {
			currentOccasion = await fetchOccasion(url);
			isAdmin = $webId === currentOccasion.adminWebId;

			if (isAdmin) {
				participants = await fetchParticipants(currentOccasion.registrationsUrl);
			} else if ($webId) {
				const allParticipants = await fetchParticipants(currentOccasion.registrationsUrl);
				isRegistered = allParticipants.some((p) => p.webId === $webId);
			}
		} catch (e) {
			error = 'Kon gelegenheid niet laden: ' + (e as Error).message;
		} finally {
			isLoading = false;
		}
	}

	async function loadMyOccasions() {
		if (!$webId) return;

		try {
			myOccasions = await fetchMyOccasions($webId);
		} catch (e) {
			console.warn('Could not load occasions:', e);
		}
	}

	async function handleCreateOccasion() {
		if (!newOccasionName.trim()) {
			alert('Vul een naam in voor de gelegenheid.');
			return;
		}

		if (!$webId) {
			alert('Je moet eerst inloggen.');
			return;
		}

		isLoading = true;
		error = null;

		try {
			const occasionId = newOccasionName
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/^-|-$/g, '');

			const result = await createOccasion({
				id: occasionId,
				name: newOccasionName.trim(),
				date: newOccasionDate || null,
				adminWebId: $webId
			});

			// Navigate to new occasion
			goto(`${base}/occasion?occasion=${encodeURIComponent(result.occasionUrl)}`);
		} catch (e) {
			error = 'Kon gelegenheid niet aanmaken: ' + (e as Error).message;
		} finally {
			isLoading = false;
		}
	}

	async function handleRegister() {
		if (!$webId || !currentOccasion) return;

		isLoading = true;
		error = null;

		try {
			await registerParticipant(currentOccasion.registrationsUrl, $webId);
			isRegistered = true;
		} catch (e) {
			error = 'Kon niet inschrijven: ' + (e as Error).message;
		} finally {
			isLoading = false;
		}
	}

	function copyShareLink() {
		const link = `${window.location.origin}${base}/occasion?occasion=${encodeURIComponent(occasionUrl || '')}`;
		navigator.clipboard.writeText(link).then(() => {
			alert('Link gekopieerd!');
		});
	}

	function getShortWebId(webId: string): string {
		return webId.replace('https://', '').replace('/profile/card#me', '');
	}
</script>

<SolidLogin />

{#if isLoading}
	<div class="loading">Laden...</div>
{:else if error}
	<div class="error">{error}</div>
{:else if currentOccasion}
	<!-- Viewing an occasion -->
	<section class="card occasion-view">
		<div class="occasion-header">
			<h2>{currentOccasion.name}</h2>
			{#if currentOccasion.date}
				<p class="date">{currentOccasion.date}</p>
			{/if}
			{#if currentOccasion.adminWebId}
				<p class="admin">Georganiseerd door: {getShortWebId(currentOccasion.adminWebId)}</p>
			{/if}
		</div>

		{#if isAdmin}
			<!-- Admin view -->
			<div class="participants-section">
				<h3>Ingeschreven Deelnemers ({participants.length})</h3>
				{#if participants.length === 0}
					<p><em>Nog geen inschrijvingen.</em></p>
				{:else}
					<ul class="participant-list">
						{#each participants as p}
							<li>
								<span class="name">{p.name || 'Onbekend'}</span>
								<span class="webid">{p.webId}</span>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<div class="share-section">
				<h4>Uitnodigingslink</h4>
				<p>Deel deze link met deelnemers:</p>
				<button onclick={copyShareLink}>Kopieer link</button>
			</div>
		{:else if $isLoggedIn}
			<!-- Participant view -->
			{#if isRegistered}
				<div class="success">
					<h3>Je bent ingeschreven!</h3>
					<p>Je neemt deel aan {currentOccasion.name}.</p>
					<p><a href="{base}/reveal">Beheer je wishlist →</a></p>
				</div>
			{:else}
				<div class="register-section">
					<p>Schrijf je in voor deze gelegenheid zodat anderen je wishlist kunnen zien.</p>
					<button class="primary" onclick={handleRegister}>Schrijf me in</button>
				</div>
			{/if}
		{:else}
			<p>Log in om je in te schrijven voor deze gelegenheid.</p>
		{/if}
	</section>
{:else if $isLoggedIn}
	<!-- No occasion selected - show create form and list -->
	{#if myOccasions.length > 0}
		<section class="card">
			<h2>Mijn Gelegenheden</h2>
			<ul class="occasion-list">
				{#each myOccasions as occ}
					<li>
						<span>{occ.name}</span>
						<a href="{base}/occasion?occasion={encodeURIComponent(occ.url)}" class="btn">Bekijk</a>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<section class="card">
		<h2>Nieuwe Gelegenheid Aanmaken</h2>
		<div class="form">
			<label>
				Naam
				<input type="text" bind:value={newOccasionName} placeholder="bijv. Kerstfeest 2025" />
			</label>
			<label>
				Datum (optioneel)
				<input type="date" bind:value={newOccasionDate} />
			</label>
			<button class="primary" onclick={handleCreateOccasion}>Aanmaken</button>
		</div>
	</section>
{:else}
	<section class="card">
		<p>Log in om een nieuwe gelegenheid aan te maken, of open een uitnodigingslink.</p>
	</section>
{/if}

<style>
	.card {
		background: white;
		border-radius: 12px;
		padding: 20px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		margin-bottom: 20px;
	}

	h2 {
		margin-top: 0;
		color: #333;
	}

	.loading {
		text-align: center;
		padding: 40px;
		color: #666;
	}

	.error {
		background: #f8d7da;
		border: 1px solid #f5c6cb;
		color: #721c24;
		padding: 15px;
		border-radius: 8px;
		margin-bottom: 20px;
	}

	.occasion-header {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		padding: 25px;
		border-radius: 12px;
		text-align: center;
		margin-bottom: 20px;
	}

	.occasion-header h2 {
		color: white;
		margin: 0;
	}

	.occasion-header .date {
		opacity: 0.9;
		margin: 10px 0 0;
	}

	.occasion-header .admin {
		opacity: 0.8;
		font-size: 0.9rem;
		margin: 5px 0 0;
	}

	.participant-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.participant-list li {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px;
		background: #f8f9fa;
		border-radius: 8px;
		margin-bottom: 8px;
	}

	.participant-list .name {
		font-weight: 500;
	}

	.participant-list .webid {
		font-size: 0.85rem;
		color: #666;
	}

	.share-section {
		background: #fff3cd;
		border: 1px solid #ffc107;
		border-radius: 8px;
		padding: 15px;
		margin-top: 20px;
	}

	.share-section h4 {
		margin-top: 0;
		color: #856404;
	}

	.success {
		background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
		border: 2px solid #28a745;
		border-radius: 12px;
		padding: 20px;
		text-align: center;
	}

	.success h3 {
		color: #155724;
		margin-top: 0;
	}

	.register-section {
		text-align: center;
		padding: 20px;
	}

	.form {
		display: flex;
		flex-direction: column;
		gap: 15px;
	}

	.form label {
		display: flex;
		flex-direction: column;
		gap: 5px;
		font-weight: 500;
		color: #555;
	}

	.form input {
		padding: 10px;
		border: 1px solid #ddd;
		border-radius: 6px;
		font-size: 1rem;
	}

	button {
		padding: 10px 20px;
		border: none;
		border-radius: 6px;
		font-size: 1rem;
		cursor: pointer;
		background: #e9ecef;
	}

	button.primary {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
	}

	button:hover {
		opacity: 0.9;
	}

	.occasion-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.occasion-list li {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px;
		background: #f8f9fa;
		border-radius: 8px;
		margin-bottom: 8px;
	}

	.btn {
		padding: 8px 15px;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		text-decoration: none;
		border-radius: 6px;
		font-size: 0.9rem;
	}
</style>
