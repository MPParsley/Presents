<script lang="ts">
	import { base } from '$app/paths';
	import { isLoggedIn, isAuthLoading } from '$lib/stores/auth';
	import { t } from '$lib/i18n';
</script>

{#if $isAuthLoading}
	<section class="card">
		<p><em>{$t('loading')}</em></p>
	</section>
{:else if !$isLoggedIn}
	<section class="card">
		<p>
			{$t('notLoggedIn')} <strong>{$t('login')}</strong> {$t('inNavigation')}
			<a href="{base}/help" class="help-link">{$t('howDoesThisWork')}</a>
		</p>
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

	p {
		margin: 0;
		color: #555;
	}

	.help-link {
		color: #667eea;
		text-decoration: none;
		margin-left: 5px;
	}

	.help-link:hover {
		text-decoration: underline;
	}
</style>
