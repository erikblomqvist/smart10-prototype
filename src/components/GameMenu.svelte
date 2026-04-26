<script>
	import { _ } from 'svelte-i18n';
	import { Menu, X, RotateCcw, Shield, Save } from 'lucide-svelte';
	import { getPlayerIconComponent } from '../lib/playerIcons.js';
	import OverallScoreList from './OverallScoreList.svelte';
	import ScoreList from './ScoreList.svelte';

	/**
	 * @type {{
	 *   currentPlayer: import('../lib/game.svelte.js').GamePlayer | null,
	 *   players: import('../lib/game.svelte.js').GamePlayer[],
	 *   onstartover: () => void,
	 *   onsave: () => void,
	 * }}
	 */
	let { currentPlayer, players, onstartover, onsave } = $props();

	let open = $state(false);

	const CurrentPlayerIcon = $derived(
		currentPlayer ? getPlayerIconComponent(currentPlayer.icon) : null,
	);
</script>

<details class="game-menu" bind:open>
	<summary class="game-menu__toggle">
		{#if open}
			<X class="game-menu__icon" />
		{:else}
			<Menu class="game-menu__icon" />
		{/if}
		{#if CurrentPlayerIcon && currentPlayer}
			<span class="game-menu__player-icon" aria-hidden="true">
				<CurrentPlayerIcon size={16} />
			</span>
		{/if}
		<span
			>{$_('menu.turn', {
				values: { name: currentPlayer?.name ?? '—' },
			})}</span
		>
	</summary>

	<div class="game-menu__panel">
		<section class="game-menu__section">
			<h2 class="game-menu__heading">{$_('menu.current_round')}</h2>
			<ScoreList {players} />
		</section>

		<section class="game-menu__section">
			<h2 class="game-menu__heading">{$_('menu.overall_score')}</h2>
			<OverallScoreList {players} />
		</section>

		<section class="game-menu__section game-menu__section--actions">
			<h2 class="game-menu__heading">{$_('menu.general_actions')}</h2>
			<button class="game-menu__action" type="button" onclick={onsave}>
				<Save />
				<span>{$_('menu.save_game')}</span>
			</button>
			<button
				class="game-menu__action"
				type="button"
				onclick={onstartover}
			>
				<RotateCcw />
				<span>{$_('menu.start_new_game')}</span>
			</button>
			<a class="game-menu__action" href="/admin" target="_blank">
				<Shield />
				<span>{$_('menu.admin')}</span>
			</a>
		</section>
	</div>
</details>

<style>
	.game-menu {
		position: fixed;
		top: 0;
		left: max(1rem, env(safe-area-inset-left));
		z-index: 10;
		font-size: var(--font-size-md);
	}

	.game-menu__toggle {
		display: flex;
		align-items: center;
		gap: 0.5em;
		border-radius: 0.5em;
		border-top-left-radius: 0;
		border-top-right-radius: 0;
		border: 3px solid var(--orange-700);
		border-top: 0;
		padding: 0.5em 1em;
		background-color: hsl(0 0% 100%);
		color: var(--grayscale-900);
		cursor: pointer;
		list-style: none;
		user-select: none;
	}

	.game-menu__toggle::-webkit-details-marker {
		display: none;
	}

	.game-menu__toggle :global(svg) {
		width: 1.1em;
		height: 1.1em;
		color: var(--orange-800);
	}

	.game-menu__player-icon {
		display: inline-flex;
		align-items: center;
		margin-inline: 0.1em;
		color: var(--orange-800);
	}

	.game-menu__panel {
		position: absolute;
		top: calc(100% + 0.75rem);
		left: 0;
		display: grid;
		gap: 1rem;
		box-sizing: border-box;
		border: 3px solid var(--orange-700);
		border-radius: 0.75rem;
		width: min(22rem, calc(100vw - 2rem));
		max-height: calc(100svh - 6rem);
		padding: 1rem;
		overflow: auto;
		overscroll-behavior: none;
		background-color: hsl(0 0% 100%);
		box-shadow: 0 1rem 2rem hsl(0 0% 0% / 0.25);
	}

	.game-menu__section {
		display: grid;
		gap: 0.625rem;
	}

	.game-menu__section--actions {
		border-top: 1px solid var(--grayscale-200);
		padding-block-start: 1rem;
	}

	.game-menu__heading {
		margin: 0;
		color: var(--grayscale-700);
		font-family: 'Oswald', sans-serif;
		font-size: var(--font-size-sm);
		font-weight: 400;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.game-menu__action {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		border: none;
		border-radius: 0.5rem;
		padding: 0.625rem 0.75rem;
		background: none;
		color: var(--grayscale-900);
		text-decoration: none;
		font-family: inherit;
		font-size: inherit;
		cursor: pointer;
		text-align: left;
		width: 100%;
	}

	.game-menu__action:hover {
		background-color: var(--orange-100);
	}

	.game-menu__action :global(svg) {
		width: 1em;
		height: 1em;
		color: var(--orange-800);
	}
</style>
