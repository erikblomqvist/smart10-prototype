<script>
	import { _, locale } from 'svelte-i18n';
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
			<button
				class="home__btn home__btn--primary"
				type="button"
				onclick={onnewgame}
			>
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
				<button
					class="home__btn home__btn--primary"
					type="submit"
					disabled={code.length !== 5}
				>
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

<style>
	.home {
		display: grid;
		place-items: center;
		gap: 1.5rem;
		text-align: center;
	}

	.home__title {
		margin: 0;
		font-family: 'Erica One', sans-serif;
		font-size: clamp(3rem, 10vw, 6rem);
		font-weight: 400;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		text-shadow: 0 2px 8px hsl(0 0% 0% / 0.2);
		color: var(--black);
	}

	.home__title span {
		margin-inline-start: 0.3ch;
		border-top-right-radius: 12px;
		border-top-left-radius: 12px;
		padding-inline: 0.3ch;
		background-color: var(--black);
		color: var(--white);
	}

	.home__actions {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		width: 16rem;
	}

	.home__btn {
		border: none;
		border-radius: 0.5rem;
		padding: 0.75rem 2rem;
		font-family: 'Oswald', sans-serif;
		font-size: 1.125rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		cursor: pointer;
		transition: background-color 0.15s;
	}

	.home__btn--primary {
		background-color: var(--orange-700);
		color: var(--white);
	}

	.home__btn--primary:hover {
		background-color: var(--orange-800);
	}

	.home__btn--primary:disabled {
		background-color: var(--orange-300);
		cursor: not-allowed;
	}

	.home__btn--secondary {
		background-color: hsl(0 0% 100% / 0.2);
		color: var(--white);
	}

	.home__btn--secondary:hover {
		background-color: hsl(0 0% 100% / 0.3);
	}

	.home__load {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		width: 16rem;
	}

	.home__code-input {
		border: 3px solid var(--orange-700);
		border-radius: 0.5rem;
		padding: 0.75rem 1rem;
		background-color: var(--white);
		color: var(--grayscale-900);
		font-family: 'Oswald', sans-serif;
		font-size: 2rem;
		font-weight: 600;
		letter-spacing: 0.3em;
		text-align: center;
		text-transform: uppercase;
		width: 100%;
		box-sizing: border-box;
	}

	.home__code-input::placeholder {
		font-size: 1rem;
		letter-spacing: 0.05em;
		color: var(--grayscale-400);
	}

	.home__code-input:focus {
		outline: 3px solid var(--orange-700);
		outline-offset: 2px;
	}

	.home__load-actions {
		display: flex;
		gap: 0.75rem;
	}

	.home__load-actions .home__btn {
		flex: 1;
	}

	.home__language {
		position: fixed;
		bottom: max(1rem, env(safe-area-inset-bottom));
		right: max(1rem, env(safe-area-inset-right));
		display: flex;
		gap: 0.25rem;
	}

	.home__lang-btn {
		border: 2px solid hsl(0 0% 100% / 0.4);
		border-radius: 0.375rem;
		padding: 0.25rem 0.5rem;
		background: transparent;
		color: hsl(0 0% 100% / 0.7);
		font-family: 'Oswald', sans-serif;
		font-size: 0.875rem;
		font-weight: 600;
		letter-spacing: 0.05em;
		cursor: pointer;
		transition:
			background-color 0.15s,
			color 0.15s,
			border-color 0.15s;
	}

	.home__lang-btn:hover {
		background-color: hsl(0 0% 100% / 0.15);
		color: var(--white);
	}

	.home__lang-btn--active {
		background-color: hsl(0 0% 100% / 0.2);
		border-color: var(--white);
		color: var(--white);
	}

	.home__load-error {
		margin: 0;
		padding: 0.5rem 0.75rem;
		border-radius: 0.375rem;
		background: hsl(0 86% 58% / 0.2);
		border: 1px solid hsl(0 86% 58% / 0.4);
		color: var(--white);
		font-size: var(--font-size-sm);
		text-align: center;
	}
</style>
