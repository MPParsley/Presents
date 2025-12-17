<script lang="ts">
	import { onMount } from 'svelte';
	import { auth, isLoggedIn, webId, isAuthLoading, getShortWebId } from '$lib/stores/auth';
	import { base } from '$app/paths';

	let { children } = $props();

	onMount(() => {
		auth.init();
	});

	async function handleLogin() {
		try {
			await auth.login('https://solidcommunity.net');
		} catch (error) {
			console.error('Login error:', error);
			alert('Fout bij inloggen: ' + (error as Error).message);
		}
	}

	async function handleLogout() {
		await auth.logout();
	}
</script>

<svelte:head>
	<title>Gift Name Shuffler</title>
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
</svelte:head>

<div class="app">
	<header>
		<h1>Gift Name Shuffler</h1>
		<nav>
			<a href="{base}/">Home</a>
			<a href="{base}/occasion">Gelegenheden</a>
			<a href="{base}/wishlist">Mijn Wishlist</a>
			<a href="{base}/help">Help</a>
			<span class="spacer"></span>
			{#if $isAuthLoading}
				<span class="auth-status">Laden...</span>
			{:else if $isLoggedIn && $webId}
				<span class="auth-status" title={$webId}>{getShortWebId($webId)}</span>
				<button onclick={handleLogout}>Uitloggen</button>
			{:else}
				<button onclick={handleLogin}>Inloggen</button>
			{/if}
		</nav>
	</header>

	<main>
		{@render children()}
	</main>

	<footer>
		<p>Gift Name Shuffler &mdash; Een eenvoudige app voor cadeautjes uitwisseling.</p>
	</footer>
</div>

<style>
	:global(*) {
		box-sizing: border-box;
	}

	:global(body) {
		margin: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
		background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
		min-height: 100vh;
	}

	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	header {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		padding: 20px;
		text-align: center;
	}

	header h1 {
		margin: 0 0 10px 0;
		font-size: 2rem;
	}

	nav {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}

	nav a {
		color: rgba(255, 255, 255, 0.9);
		text-decoration: none;
		padding: 5px 10px;
		border-radius: 4px;
		transition: background 0.2s;
	}

	nav a:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	nav .spacer {
		display: none;
	}

	nav .auth-status {
		color: rgba(255, 255, 255, 0.9);
		font-size: 0.9rem;
	}

	nav button {
		background: rgba(255, 255, 255, 0.2);
		color: white;
		border: 1px solid rgba(255, 255, 255, 0.3);
		padding: 5px 12px;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.9rem;
		transition: background 0.2s;
	}

	nav button:hover {
		background: rgba(255, 255, 255, 0.3);
	}

	@media (min-width: 768px) {
		nav {
			gap: 20px;
		}

		nav .spacer {
			display: block;
			flex: 1;
		}
	}

	main {
		flex: 1;
		max-width: 800px;
		width: 100%;
		margin: 0 auto;
		padding: 20px;
	}

	footer {
		background: #333;
		color: #aaa;
		text-align: center;
		padding: 15px;
		font-size: 0.9rem;
	}

	footer p {
		margin: 0;
	}
</style>
