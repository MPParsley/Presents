<script lang="ts">
	import { base } from '$app/paths';
	import { t } from '$lib/i18n';
</script>

<section class="card">
	<h1>{$t('howDoesItWork')}</h1>

	<p class="intro">
		{$t('helpIntro')}
	</p>

	<h2>{$t('whatIsSolidPod')}</h2>
	<p>
		{$t('solidPodExplanation')}
	</p>

	<h2>{$t('createAccount')}</h2>
	<ol>
		<li><a href="https://solidcommunity.net/.account/login/password/register/" target="_blank" rel="noopener">{$t('goToRegistration')}</a></li>
		<li>{$t('fillEmailPassword')}</li>
		<li>{$t('clickRegister')}</li>
	</ol>
	<img src="{base}/help/register.png" alt="{$t('createAccount')}" class="screenshot" />

	<h2>{$t('createPod')}</h2>
	<ol>
		<li>{$t('clickCreatePod')}</li>
		<li>{$t('fillName')}</li>
		<li>{$t('clickCreatePodButton')}</li>
		<li>{$t('youHavePod')}</li>
	</ol>
	<img src="{base}/help/account.png" alt="{$t('createPod')}" class="screenshot" />

	<h2>{$t('loginToApp')}</h2>
	<ol>
		<li>{$t('selectProvider')}</li>
		<li>{$t('clickLogin')}</li>
		<li>{$t('redirected')}</li>
		<li>{$t('loginThere')}</li>
		<li>{$t('selectWebId')}</li>
		<li>{$t('youAreLoggedIn')}</li>
	</ol>
	<img src="{base}/help/login.png" alt="{$t('loginToApp')}" class="screenshot" />

	<h2>{$t('participateInOccasion')}</h2>
	<ol>
		<li>{$t('openInviteLink')}</li>
		<li>{$t('loginWithSolid')}</li>
		<li>{$t('clickRegisterButton')}</li>
		<li><a href="{base}/wishlist">{$t('myWishlist')}</a> {$t('goToWishlistManage')}</li>
	</ol>

	<h2>{$t('moreInfo')}</h2>
	<p>
		{$t('readMoreSolid')} <a href="https://solidproject.org" target="_blank" rel="noopener">solidproject.org</a>
	</p>

	<a href="{base}/" class="back-link">{$t('backToHome')}</a>
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
