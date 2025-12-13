<script lang="ts">
	import { auth, isLoggedIn, webId, isAuthLoading, getShortWebId } from '$lib/stores/auth';
	import { SOLID_PROVIDERS } from '$lib/solid/constants';

	let selectedProvider = '';

	async function handleLogin() {
		if (!selectedProvider) {
			alert('Selecteer een Solid provider.');
			return;
		}

		let providerUrl = selectedProvider;
		if (providerUrl === 'custom') {
			const customUrl = prompt('Voer de URL van je Solid Identity Provider in:');
			if (!customUrl) return;
			providerUrl = customUrl;
		}

		try {
			await auth.login(providerUrl);
		} catch (error) {
			console.error('Login error:', error);
			alert('Fout bij inloggen: ' + (error as Error).message);
		}
	}

	async function handleLogout() {
		await auth.logout();
	}
</script>

<section class="card">
	<h2>Solid Account</h2>
	<p class="info-text">Log in met je Solid Pod om je gegevens op te slaan.</p>

	{#if $isAuthLoading}
		<p><em>Laden...</em></p>
	{:else if $isLoggedIn && $webId}
		<div class="profile">
			<p>
				Ingelogd als: <strong title={$webId}>{getShortWebId($webId)}</strong>
			</p>
			<button on:click={handleLogout}>Uitloggen</button>
		</div>
	{:else}
		<div class="login-form">
			<select bind:value={selectedProvider}>
				<option value="">-- Kies provider --</option>
				{#each SOLID_PROVIDERS as provider}
					<option value={provider.url}>{provider.name}</option>
				{/each}
				<option value="custom">Andere...</option>
			</select>
			<button on:click={handleLogin}>Inloggen met Solid</button>
		</div>
	{/if}
</section>

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
		border-bottom: 2px solid #667eea;
		padding-bottom: 10px;
	}

	.info-text {
		color: #666;
		margin-bottom: 15px;
	}

	.login-form {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}

	select {
		padding: 10px;
		border: 1px solid #ddd;
		border-radius: 6px;
		font-size: 1rem;
		flex: 1;
		min-width: 200px;
	}

	button {
		padding: 10px 20px;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 1rem;
		cursor: pointer;
		transition: opacity 0.2s;
	}

	button:hover {
		opacity: 0.9;
	}

	.profile {
		display: flex;
		align-items: center;
		gap: 15px;
		flex-wrap: wrap;
	}

	.profile p {
		margin: 0;
	}
</style>
