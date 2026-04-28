<script>
	import { _ } from 'svelte-i18n';
	import { getPlayerIconComponent } from '../lib/playerIcons.js';

	/**
	 * @type {{
	 *   players: import('../lib/game.svelte.js').GamePlayer[],
	 *   roundNumber?: number,
	 *   onnext: () => void,
	 * }}
	 */
	let { players, roundNumber, onnext } = $props();

	const rankedPlayers = $derived(
		[...players].sort((a, b) => b.roundScore - a.roundScore),
	);
</script>

<div class="review-panel">
	<h2 class="review-panel__heading">
		{$_('game.round_heading', { values: { n: roundNumber } })}
	</h2>
	<ol class="review-panel__scores">
		{#each rankedPlayers as player}
			{@const PlayerIcon = getPlayerIconComponent(player.icon)}
			<li class="review-panel__score-item">
				<span class="review-panel__player-icon" aria-hidden="true">
					{#if PlayerIcon}<PlayerIcon size={14} />{/if}
				</span>
				<span class="review-panel__player-name">{player.name}</span>
				<span class="review-panel__round-score"
					>+{player.roundScore}</span
				>
				<span class="review-panel__total-score">
					{$_('game.pts', { values: { n: player.totalScore } })}
				</span>
			</li>
		{/each}
	</ol>
	<button class="review-panel__btn" type="button" onclick={onnext}>
		{$_('game.next_round')}
	</button>
</div>

<style>
	.review-panel {
		position: fixed;
		inset-inline: 0;
		bottom: 0;
		height: var(--review-panel-height);
		display: grid;
		grid-template-columns: 1fr auto;
		grid-template-rows: auto 1fr;
		gap: 0.4rem 1rem;
		padding: 0.75rem 1.25rem max(0.75rem, env(safe-area-inset-bottom));
		background: hsl(0 0% 5% / 0.92);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border-top: 1px solid hsl(0 0% 100% / 0.1);
	}

	.review-panel__heading {
		grid-column: 1 / -1;
		margin: 0;
		font-family: 'Oswald', sans-serif;
		font-size: var(--font-size-sm);
		font-weight: 400;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: hsl(0 0% 100% / 0.45);
	}

	.review-panel__scores {
		grid-column: 1;
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 0.2rem;
		overflow-y: auto;
		min-width: 0;
	}

	.review-panel__score-item {
		display: grid;
		grid-template-columns: 1.25rem 1fr auto auto;
		align-items: center;
		gap: 0.4rem;
		font-family: 'Yanone Kaffeesatz', sans-serif;
		font-size: var(--font-size-lg);
		font-weight: 600;
		color: var(--white);
	}

	.review-panel__player-icon {
		display: grid;
		place-items: center;
		color: hsl(0 0% 100% / 0.55);
	}

	.review-panel__player-name {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.review-panel__round-score {
		color: var(--white);
		font-size: var(--font-size-xl);
		min-width: 2.5rem;
		text-align: right;
	}

	.review-panel__total-score {
		color: hsl(0 0% 100% / 0.4);
		font-size: var(--font-size-md);
		min-width: 3.25rem;
		text-align: right;
	}

	.review-panel__btn {
		grid-column: 2;
		grid-row: 2;
		align-self: center;
		border: none;
		border-radius: 0.5rem;
		padding: 0.75rem 1.25rem;
		background-color: var(--orange-600);
		color: var(--white);
		font-family: 'Oswald', sans-serif;
		font-size: var(--font-size-md);
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		cursor: pointer;
		white-space: nowrap;
		transition: opacity 0.15s;
	}

	.review-panel__btn:hover {
		opacity: 0.85;
	}
</style>
