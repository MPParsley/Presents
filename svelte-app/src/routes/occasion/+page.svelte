<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { isLoggedIn, webId, isAuthLoading } from '$lib/stores/auth';
	import { t } from '$lib/i18n';
	import SolidLogin from '$lib/components/SolidLogin.svelte';
	import {
		createOccasion,
		fetchOccasion,
		fetchMyOccasions,
		registerParticipant,
		fetchParticipants,
		checkMyRegistration,
		getMyRegistrations,
		updateOccasion,
		deleteOccasion,
		type Occasion,
		type Participant
	} from '$lib/solid';

	// Derived from URL - no state needed
	let occasionUrl = $derived(
		$page.url.searchParams.get('occasion') ||
			($page.url.searchParams.has('code')
				? sessionStorage.getItem('current_occasion_url')
				: null)
	);

	// Async loaded data - needs state
	let currentOccasion = $state<Occasion | null>(null);
	let participants = $state<Participant[]>([]);
	let myOccasions = $state<Array<{ name: string; url: string }>>([]);
	let registeredOccasions = $state<Array<{ name: string; url: string }>>([]);
	let isRegistered = $state(false);

	// UI state
	let isLoading = $state(false);
	let error = $state<string | null>(null);

	// Derived from loaded data
	let isAdmin = $derived($webId !== null && currentOccasion?.adminWebId === $webId);

	// Form state
	let newOccasionName = $state('');
	let newOccasionDate = $state('');

	// Edit mode state
	let isEditing = $state(false);
	let editName = $state('');
	let editDate = $state('');

	// Store occasion URL for OIDC redirect recovery
	$effect(() => {
		const urlParam = $page.url.searchParams.get('occasion');
		if (urlParam) {
			sessionStorage.setItem('current_occasion_url', urlParam);
		} else if (!$page.url.searchParams.has('code')) {
			sessionStorage.removeItem('current_occasion_url');
		}
	});

	// Load occasion when URL changes
	$effect(() => {
		if (occasionUrl && !$isAuthLoading) {
			loadOccasion(occasionUrl);
		} else if (!occasionUrl) {
			// Clear data when no occasion selected
			currentOccasion = null;
			participants = [];
			isRegistered = false;
		}
	});

	// Load my occasions and registered occasions when logged in and no occasion selected
	$effect(() => {
		if ($isLoggedIn && $webId && !occasionUrl && !$isAuthLoading) {
			loadMyOccasions();
			loadRegisteredOccasions();
		}
	});

	async function loadOccasion(url: string) {
		isLoading = true;
		error = null;
		currentOccasion = null;
		participants = [];
		isRegistered = false;

		try {
			currentOccasion = await fetchOccasion(url);

			if ($webId) {
				// Always check if current user is registered
				isRegistered = await checkMyRegistration(url);

				// Admin also gets participants list
				if ($webId === currentOccasion.adminWebId) {
					participants = await fetchParticipants(currentOccasion.registrationsUrl);
				}
			}
		} catch (e) {
			const errorMessage = (e as Error).message;
			if (errorMessage.includes('404')) {
				sessionStorage.removeItem('current_occasion_url');
				goto(`${base}/occasion`, { replaceState: true });
			} else {
				error = $t('couldNotLoad') + ' ' + errorMessage;
			}
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

	async function loadRegisteredOccasions() {
		try {
			const occasionUrls = await getMyRegistrations();
			const occasions: Array<{ name: string; url: string }> = [];

			for (const url of occasionUrls) {
				try {
					const occasion = await fetchOccasion(url);
					occasions.push({ name: occasion.name, url });
				} catch {
					// Occasion might have been deleted, skip it
				}
			}

			registeredOccasions = occasions;
		} catch (e) {
			console.warn('Could not load registered occasions:', e);
		}
	}

	async function handleCreateOccasion() {
		if (!newOccasionName.trim()) {
			alert($t('enterOccasionName'));
			return;
		}
		if (!$webId) {
			alert($t('mustLogin'));
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

			newOccasionName = '';
			newOccasionDate = '';

			goto(`${base}/occasion?occasion=${encodeURIComponent(result.occasionUrl)}`);
		} catch (e) {
			error = $t('couldNotCreate') + ' ' + (e as Error).message;
		} finally {
			isLoading = false;
		}
	}

	async function handleRegister() {
		if (!$webId || !currentOccasion || !occasionUrl) return;

		// Derive registrationsUrl directly from occasionUrl to avoid stale data
		const registrationsUrl = occasionUrl.replace('occasion.ttl', 'registrations/');

		isLoading = true;
		error = null;

		try {
			await registerParticipant(registrationsUrl, $webId, occasionUrl);
			isRegistered = true;
		} catch (e) {
			error = $t('couldNotRegister') + ' ' + (e as Error).message;
		} finally {
			isLoading = false;
		}
	}

	function copyShareLink() {
		const link = `${window.location.origin}${base}/occasion?occasion=${encodeURIComponent(occasionUrl || '')}`;
		navigator.clipboard.writeText(link).then(() => {
			alert($t('linkCopied'));
		});
	}

	function startEditing() {
		if (currentOccasion) {
			editName = currentOccasion.name;
			editDate = currentOccasion.date || '';
			isEditing = true;
		}
	}

	function cancelEditing() {
		isEditing = false;
		editName = '';
		editDate = '';
	}

	async function handleSaveEdit() {
		if (!editName.trim() || !occasionUrl || !currentOccasion?.adminWebId) {
			alert($t('enterName'));
			return;
		}

		isLoading = true;
		error = null;

		try {
			await updateOccasion(occasionUrl, {
				name: editName.trim(),
				date: editDate || null,
				adminWebId: currentOccasion.adminWebId
			});
			await loadOccasion(occasionUrl);
			isEditing = false;
		} catch (e) {
			error = $t('couldNotUpdate') + ' ' + (e as Error).message;
		} finally {
			isLoading = false;
		}
	}

	async function handleDelete() {
		if (!occasionUrl) return;
		if (!confirm($t('confirmDelete'))) return;

		isLoading = true;
		error = null;

		try {
			await deleteOccasion(occasionUrl);
			sessionStorage.removeItem('current_occasion_url');
			goto(`${base}/occasion`);
		} catch (e) {
			error = $t('couldNotDelete') + ' ' + (e as Error).message;
		} finally {
			isLoading = false;
		}
	}

	function getShortWebId(id: string): string {
		return id.replace('https://', '').replace('/profile/card#me', '');
	}
</script>

{#if $isAuthLoading || isLoading}
	<div class="loading">{$t('loading')}</div>
{:else if error}
	<div class="error">{error}</div>
{:else if currentOccasion}
	<section class="card occasion-view">
		{#if isEditing}
			<div class="edit-form">
				<h3>{$t('editOccasion')}</h3>
				<div class="form">
					<label>
						{$t('name')}
						<input type="text" bind:value={editName} />
					</label>
					<label>
						{$t('dateOptional')}
						<input type="date" bind:value={editDate} />
					</label>
					<div class="button-row">
						<button class="primary" onclick={handleSaveEdit}>{$t('save')}</button>
						<button onclick={cancelEditing}>{$t('cancel')}</button>
					</div>
				</div>
			</div>
		{:else}
			<div class="occasion-header">
				<h2>{currentOccasion.name}</h2>
				{#if currentOccasion.date}
					<p class="date">{currentOccasion.date}</p>
				{/if}
				{#if currentOccasion.adminWebId}
					<p class="admin">{$t('organizedBy')} {getShortWebId(currentOccasion.adminWebId)}</p>
				{/if}
			</div>
		{/if}

		{#if !$isLoggedIn}
			<SolidLogin message={$t('loginToRegister')} />
		{:else if isAdmin && !isEditing}
			<div class="admin-actions">
				<button onclick={startEditing}>✏️ {$t('edit')}</button>
				<button class="danger" onclick={handleDelete}>🗑️ {$t('delete')}</button>
			</div>

			{#if isRegistered}
				<div class="success">
					<h3>{$t('youAreRegistered')}</h3>
					<p>{$t('participatingIn')} {currentOccasion.name}.</p>
					<p><a href="{base}/wishlist">{$t('manageWishlist')}</a></p>
				</div>
			{:else}
				<div class="register-section">
					<p>{$t('registerAsAdmin')}</p>
					<button class="primary" onclick={handleRegister}>{$t('register')}</button>
				</div>
			{/if}

			<div class="participants-section">
				<h3>{$t('registeredParticipants')} ({participants.length})</h3>
				{#if participants.length === 0}
					<p><em>{$t('noRegistrations')}</em></p>
				{:else}
					<ul class="participant-list">
						{#each participants as p}
							<li>
								<span class="name">{p.name || $t('unknown')}</span>
								<span class="webid">{p.webId}</span>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<div class="share-section">
				<h4>{$t('inviteLink')}</h4>
				<p>{$t('shareLink')}</p>
				<button onclick={copyShareLink}>{$t('copyLink')}</button>
			</div>
		{:else if !isEditing}
			{#if isRegistered}
				<div class="success">
					<h3>{$t('youAreRegistered')}</h3>
					<p>{$t('participatingIn')} {currentOccasion.name}.</p>
					<p><a href="{base}/wishlist">{$t('manageWishlist')}</a></p>
				</div>
			{:else}
				<div class="register-section">
					<p>{$t('registerForOccasion')}</p>
					<button class="primary" onclick={handleRegister}>{$t('register')}</button>
				</div>
			{/if}
		{/if}
	</section>
{:else if !$isLoggedIn}
	<SolidLogin message={$t('loginToCreate')} />
{:else}
	{#if myOccasions.length > 0}
		<section class="card">
			<h2>{$t('myOccasions')}</h2>
			<ul class="occasion-list">
				{#each myOccasions as occ}
					<li>
						<span>{occ.name}</span>
						<a href="{base}/occasion?occasion={encodeURIComponent(occ.url)}" class="btn">{$t('view')}</a>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if registeredOccasions.length > 0}
		<section class="card">
			<h2>{$t('registeredOccasions')}</h2>
			<ul class="occasion-list">
				{#each registeredOccasions as occ}
					<li>
						<span>{occ.name}</span>
						<a href="{base}/occasion?occasion={encodeURIComponent(occ.url)}" class="btn">{$t('view')}</a>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<section class="card">
		<h2>{$t('createNewOccasion')}</h2>
		<div class="form">
			<label>
				{$t('name')}
				<input type="text" bind:value={newOccasionName} placeholder={$t('occasionPlaceholder')} />
			</label>
			<label>
				{$t('dateOptional')}
				<input type="date" bind:value={newOccasionDate} />
			</label>
			<button class="primary" onclick={handleCreateOccasion}>{$t('create')}</button>
		</div>
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

	.admin-actions {
		display: flex;
		gap: 10px;
		margin-bottom: 20px;
	}

	.admin-actions button {
		padding: 8px 16px;
	}

	button.danger {
		background: #dc3545;
		color: white;
	}

	button.danger:hover {
		background: #c82333;
	}

	.edit-form {
		padding: 20px;
		background: #f8f9fa;
		border-radius: 12px;
		margin-bottom: 20px;
	}

	.edit-form h3 {
		margin-top: 0;
		color: #333;
	}

	.button-row {
		display: flex;
		gap: 10px;
		margin-top: 10px;
	}
</style>
