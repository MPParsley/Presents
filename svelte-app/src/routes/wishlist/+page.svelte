<script lang="ts">
	import { isLoggedIn, webId, isAuthLoading } from '$lib/stores/auth';
	import SolidLogin from '$lib/components/SolidLogin.svelte';
	import { getWishlist, saveWishlist, type WishlistItem, generateId } from '$lib/solid';
	import { t } from '$lib/i18n';

	// State
	let wishlistItems = $state<WishlistItem[]>([]);
	let isLoading = $state(false);
	let error = $state<string | null>(null);

	// Form state
	let newItemName = $state('');
	let newItemDescription = $state('');
	let newItemUrl = $state('');
	let newItemPriority = $state(3);

	// Load wishlist when logged in
	$effect(() => {
		if ($isLoggedIn && $webId && !$isAuthLoading) {
			loadWishlist();
		}
	});

	async function loadWishlist() {
		if (!$webId) return;

		isLoading = true;
		error = null;

		try {
			wishlistItems = await getWishlist($webId);
		} catch (e) {
			error = $t('couldNotLoadWishlist') + ' ' + (e as Error).message;
		} finally {
			isLoading = false;
		}
	}

	async function addItem() {
		if (!newItemName.trim()) {
			alert($t('enterItemName'));
			return;
		}

		const newItem: WishlistItem = {
			id: generateId(),
			name: newItemName.trim(),
			description: newItemDescription.trim(),
			url: newItemUrl.trim(),
			priority: newItemPriority,
			position: wishlistItems.length + 1
		};

		wishlistItems = [...wishlistItems, newItem];

		try {
			await saveWishlist(wishlistItems);
			// Clear form
			newItemName = '';
			newItemDescription = '';
			newItemUrl = '';
			newItemPriority = 3;
		} catch (e) {
			// Revert
			wishlistItems = wishlistItems.slice(0, -1);
			error = $t('couldNotSave') + ' ' + (e as Error).message;
		}
	}

	async function removeItem(index: number) {
		if (!confirm($t('confirmRemoveItem'))) return;

		const removed = wishlistItems[index];
		wishlistItems = wishlistItems.filter((_, i) => i !== index);

		try {
			await saveWishlist(wishlistItems);
		} catch (e) {
			// Revert
			wishlistItems = [...wishlistItems.slice(0, index), removed, ...wishlistItems.slice(index)];
			error = $t('couldNotRemove') + ' ' + (e as Error).message;
		}
	}

	async function moveItem(index: number, direction: number) {
		const newIndex = index + direction;
		if (newIndex < 0 || newIndex >= wishlistItems.length) return;

		// Swap
		const items = [...wishlistItems];
		[items[index], items[newIndex]] = [items[newIndex], items[index]];
		wishlistItems = items;

		try {
			await saveWishlist(wishlistItems);
		} catch (e) {
			// Revert
			[items[index], items[newIndex]] = [items[newIndex], items[index]];
			wishlistItems = items;
		}
	}
</script>

{#if !$isLoggedIn}
	<SolidLogin message={$t('loginToManageWishlist')} />
{:else if isLoading}
	<div class="loading">{$t('wishlistLoading')}</div>
{:else}
	{#if error}
		<div class="error">{error}</div>
	{/if}

	<section class="card">
		<h2>{$t('myWishlistTitle')}</h2>

		{#if wishlistItems.length === 0}
			<p><em>{$t('wishlistEmpty')}</em></p>
		{:else}
			<ul class="wishlist">
				{#each wishlistItems as item, index}
					<li>
						<div class="item-content">
							<span class="priority">{'⭐'.repeat(item.priority)}</span>
							<strong>{item.name}</strong>
							{#if item.description}
								<p class="description">{item.description}</p>
							{/if}
							{#if item.url}
								<a href={item.url} target="_blank" rel="noopener">{$t('linkArrow')}</a>
							{/if}
						</div>
						<div class="item-actions">
							<button onclick={() => moveItem(index, -1)}>↑</button>
							<button onclick={() => moveItem(index, 1)}>↓</button>
							<button class="danger" onclick={() => removeItem(index)}>✕</button>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<section class="card">
		<h3>{$t('addNewItem')}</h3>
		<div class="form">
			<label>
				{$t('itemNameRequired')}
				<input type="text" bind:value={newItemName} placeholder={$t('itemPlaceholder')} />
			</label>
			<label>
				{$t('description')}
				<textarea bind:value={newItemDescription} placeholder={$t('descriptionPlaceholder')}></textarea>
			</label>
			<label>
				{$t('linkUrl')}
				<input type="url" bind:value={newItemUrl} placeholder="https://..." />
			</label>
			<label>
				{$t('priority')}
				<select bind:value={newItemPriority}>
					<option value={5}>⭐⭐⭐⭐⭐ {$t('priority5')}</option>
					<option value={4}>⭐⭐⭐⭐ {$t('priority4')}</option>
					<option value={3}>⭐⭐⭐ {$t('priority3')}</option>
					<option value={2}>⭐⭐ {$t('priority2')}</option>
					<option value={1}>⭐ {$t('priority1')}</option>
				</select>
			</label>
			<button class="primary" onclick={addItem}>{$t('add')}</button>
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

	h2,
	h3 {
		margin-top: 0;
		color: #333;
	}

	h2 {
		border-bottom: 2px solid #667eea;
		padding-bottom: 10px;
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

	.wishlist {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.wishlist li {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		padding: 15px;
		background: #f8f9fa;
		border-radius: 8px;
		margin-bottom: 10px;
	}

	.item-content {
		flex: 1;
	}

	.item-content .priority {
		font-size: 0.9rem;
	}

	.item-content .description {
		color: #666;
		font-size: 0.9rem;
		margin: 5px 0;
	}

	.item-content a {
		color: #667eea;
		font-size: 0.9rem;
	}

	.item-actions {
		display: flex;
		gap: 5px;
		margin-left: 10px;
	}

	.item-actions button {
		padding: 5px 10px;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		background: #e9ecef;
		font-size: 0.9rem;
	}

	.item-actions button.danger {
		background: #dc3545;
		color: white;
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

	.form input,
	.form textarea,
	.form select {
		padding: 10px;
		border: 1px solid #ddd;
		border-radius: 6px;
		font-size: 1rem;
		font-family: inherit;
	}

	.form textarea {
		min-height: 80px;
		resize: vertical;
	}

	button.primary {
		padding: 12px 20px;
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
</style>
