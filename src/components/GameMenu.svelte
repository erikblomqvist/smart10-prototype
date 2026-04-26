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
		<span>{$_('menu.turn', { values: { name: currentPlayer?.name ?? '—' } })}</span>
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
			<button class="game-menu__action" type="button" onclick={onstartover}>
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
