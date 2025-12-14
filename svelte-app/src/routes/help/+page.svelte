<script lang="ts">
	import { base } from '$app/paths';
</script>

<section class="card">
	<h1>Hoe werkt het?</h1>

	<p class="intro">
		Deze app gebruikt <strong>Solid Pods</strong> om je gegevens veilig op te slaan.
		Jij bepaalt wie toegang heeft tot jouw data.
	</p>

	<h2>Wat is een Solid Pod?</h2>
	<p>
		Een Solid Pod is jouw persoonlijke online opslag. Het is als een kluis voor je gegevens
		waar alleen jij de sleutel van hebt. Je kiest zelf welke apps toegang krijgen.
	</p>

	<h2>Account aanmaken</h2>
	<ol>
		<li>Ga naar <a href="https://solidcommunity.net/.account/login/password/register/" target="_blank" rel="noopener">solidcommunity.net registratie</a></li>
		<li>Vul je e-mailadres en wachtwoord in</li>
		<li>Klik op "Register"</li>
	</ol>
	<img src="{base}/help/register.png" alt="Account aanmaken scherm" class="screenshot" />

	<h2>Maak een Pod</h2>
	<ol>
		<li>Klik op "Create pod"</li>
		<li>Vul je naam in (dit wordt onderdeel van je WebID)</li>
		<li>Klik op "Create pod"</li>
		<li>Je hebt nu een Solid Pod!</li>
	</ol>
	<img src="{base}/help/account.png" alt="Pod aanmaken scherm" class="screenshot" />

	<h2>Inloggen in deze app</h2>
	<ol>
		<li>Selecteer <strong>"solidcommunity.net"</strong> als provider</li>
		<li>Klik op <strong>"Inloggen met Solid"</strong></li>
		<li>Je wordt doorgestuurd naar solidcommunity.net</li>
		<li>Log daar in met je e-mailadres en wachtwoord</li>
		<li>Selecteer je WebID en klik op "Authorize"</li>
		<li>Je bent ingelogd!</li>
	</ol>
	<img src="{base}/help/login.png" alt="Autorisatie scherm" class="screenshot" />

	<h2>Deelnemen aan een gelegenheid</h2>
	<ol>
		<li>Open de uitnodigingslink die je hebt ontvangen</li>
		<li>Log in met je Solid account</li>
		<li>Klik op <strong>"Schrijf me in"</strong></li>
		<li>Ga naar <a href="{base}/reveal">Wishlist</a> om je verlanglijstje te beheren</li>
	</ol>

	<h2>Meer informatie</h2>
	<p>
		Lees meer over Solid op <a href="https://solidproject.org" target="_blank" rel="noopener">solidproject.org</a>
	</p>

	<a href="{base}/" class="back-link">← Terug naar home</a>
</section>

<style>
	.card {
		background: white;
		border-radius: 12px;
		padding: 30px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		max-width: 700px;
		margin: 0 auto;
	}

	h1 {
		margin-top: 0;
		color: #333;
		border-bottom: 2px solid #667eea;
		padding-bottom: 10px;
	}

	h2 {
		color: #444;
		margin-top: 25px;
	}

	.intro {
		font-size: 1.1rem;
		color: #555;
		line-height: 1.6;
	}

	p {
		line-height: 1.6;
		color: #555;
	}

	ol {
		line-height: 1.8;
		color: #555;
	}

	li {
		margin-bottom: 5px;
	}

	a {
		color: #667eea;
	}

	a:hover {
		text-decoration: underline;
	}

	.back-link {
		display: inline-block;
		margin-top: 25px;
		padding: 10px 20px;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		text-decoration: none;
		border-radius: 6px;
	}

	.back-link:hover {
		opacity: 0.9;
		text-decoration: none;
	}

	.screenshot {
		display: block;
		max-width: 100%;
		margin: 15px 0 25px;
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
		border: 1px solid #e0e0e0;
	}
</style>
