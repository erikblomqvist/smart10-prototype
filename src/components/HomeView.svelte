<script>
	import { _ , locale } from 'svelte-i18n';
	import { setLocale } from '../lib/i18n.js';

	/**
	 * @type {{
	 *   onnewgame: () => void,
	 *   onloadgame: (code: string) => void,
	 *   loaderror?: string|null,
	 * }}
	 */
	let { onnewgame, onloadgame, loaderror = null } = $props();

	const LANGUAGES = [
		{ code: 'en', label: 'EN' },
		{ code: 'sv', label: 'SV' },
		{ code: 'no', label: 'NO' },
	];

	let showLoad = $state(false);
	let code = $state('');

	function handleLoad(/** @type {SubmitEvent} */ e) {
		e.preventDefault();
		if (code.length === 5) onloadgame(code);
	}

	function handleCodeInput(/** @type {InputEvent} */ e) {
		code = /** @type {HTMLInputElement} */ (e.target).value
			.toUpperCase()
			.replace(/[^A-Z0-9]/g, '')
			.slice(0, 5);
	}
</script>

<div class="home">
	<h1 class="home__title" aria-label="Smart 10">Smart<span>10</span></h1>

	{#if !showLoad}
		<div class="home__actions">
			<button class="home__btn home__btn--primary" type="button" onclick={onnewgame}>
				{$_('home.new_game')}
			</button>
			<button
				class="home__btn home__btn--secondary"
				type="button"
				onclick={() => (showLoad = true)}
			>
				{$_('home.load_game')}
			</button>
		</div>
	{:else}
		<form class="home__load" onsubmit={handleLoad}>
			<input
				class="home__code-input"
				type="text"
				placeholder={$_('home.game_code_placeholder')}
				value={code}
				oninput={handleCodeInput}
				autocomplete="off"
				spellcheck="false"
				inputmode="text"
				aria-label={$_('home.game_code_aria')}
			/>
			{#if loaderror}
				<p class="home__load-error">{loaderror}</p>
			{/if}
			<div class="home__load-actions">
				<button class="home__btn home__btn--primary" type="submit" disabled={code.length !== 5}>
					{$_('home.load')}
				</button>
				<button
					class="home__btn home__btn--secondary"
					type="button"
					onclick={() => {
						showLoad = false;
						code = '';
					}}
				>
					{$_('home.cancel')}
				</button>
			</div>
		</form>
	{/if}
</div>

<nav class="home__language" aria-label="Language">
	{#each LANGUAGES as lang}
		<button
			class="home__lang-btn"
			class:home__lang-btn--active={$locale === lang.code}
			type="button"
			onclick={() => setLocale(lang.code)}
		>
			{lang.label}
		</button>
	{/each}
</nav>
