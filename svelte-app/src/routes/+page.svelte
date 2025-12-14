<script lang="ts">
	import { base } from '$app/paths';
	import SolidLogin from '$lib/components/SolidLogin.svelte';
</script>

<SolidLogin />

<section class="card">
	<h2>Welkom bij Gift Name Shuffler</h2>
	<p>Organiseer je cadeautjes uitwisseling met Solid Pods - jouw data blijft van jou!</p>

	<div class="features">
		<div class="feature">
			<h3>Gelegenheden</h3>
			<p>Maak een gelegenheid aan (Kerst, verjaardag, etc.) en nodig deelnemers uit.</p>
			<a href="{base}/occasion" class="btn">Naar Gelegenheden</a>
		</div>

		<div class="feature">
			<h3>Wishlist</h3>
			<p>Beheer je persoonlijke wishlist. Je data wordt opgeslagen in je eigen Solid Pod.</p>
			<a href="{base}/wishlist" class="btn">Naar Wishlist</a>
		</div>
	</div>
</section>

<section class="card info">
	<h2>Wat is Solid?</h2>
	<p>
		<a href="https://solidproject.org" target="_blank" rel="noopener">Solid</a> is een protocol
		waarmee je zelf de controle houdt over je data. Je gegevens worden opgeslagen in je persoonlijke
		"Pod" - niet op onze servers.
	</p>
	<p>
		Nog geen Solid Pod? Maak er gratis een aan bij
		<a href="https://solidcommunity.net" target="_blank" rel="noopener">solidcommunity.net</a>.
	</p>
</section>

<style>
	.card {
		background: white;
		border-radius: 12px;
		padding: 25px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		margin-bottom: 20px;
	}

	h2 {
		margin-top: 0;
		color: #333;
		border-bottom: 2px solid #667eea;
		padding-bottom: 10px;
	}

	.features {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 20px;
		margin-top: 20px;
	}

	.feature {
		background: #f8f9fa;
		padding: 20px;
		border-radius: 10px;
	}

	.feature h3 {
		margin-top: 0;
		color: #667eea;
	}

	.btn {
		display: inline-block;
		padding: 10px 20px;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		text-decoration: none;
		border-radius: 6px;
		margin-top: 10px;
	}

	.btn:hover {
		opacity: 0.9;
	}

	.info {
		background: #f0f4ff;
	}

	.info a {
		color: #667eea;
	}
</style>
