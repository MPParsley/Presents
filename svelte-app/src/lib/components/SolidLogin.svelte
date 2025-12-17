<script lang="ts">
	import { base } from '$app/paths';
	import { auth, isLoggedIn, isAuthLoading } from '$lib/stores/auth';
	import { t } from '$lib/i18n';

	interface Props {
		message?: string;
	}

	let { message }: Props = $props();

	async function handleLogin() {
		try {
			await auth.login('https://solidcommunity.net');
		} catch (error) {
			console.error('Login error:', error);
			alert('Fout bij inloggen: ' + (error as Error).message);
		}
	}
</script>

{#if $isAuthLoading}
	<section class="card">
		<p><em>{$t('loading')}</em></p>
	</section>
{:else if !$isLoggedIn}
	<section class="card login-prompt">
		<p>{message}</p>
		<div class="actions">
			<button class="primary" onclick={handleLogin}>{$t('login')}</button>
			<a href="{base}/help" class="help-link">{$t('howDoesThisWork')}</a>
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

	.login-prompt {
		text-align: center;
	}

	p {
		margin: 0 0 15px 0;
		color: #555;
	}

	.actions {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 20px;
		flex-wrap: wrap;
	}

	button.primary {
		padding: 10px 24px;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 1rem;
		cursor: pointer;
	}

	button.primary:hover {
		opacity: 0.9;
	}

	.help-link {
		color: #667eea;
		text-decoration: none;
	}

	.help-link:hover {
		text-decoration: underline;
	}
</style>
