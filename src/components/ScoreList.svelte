<script>
	import { _ } from 'svelte-i18n';

	/**
	 * @type {{
	 *   players: { name: string, status: string, roundScore: number }[],
	 * }}
	 */
	let { players } = $props();
</script>

<ol class="score-list">
	{#each players as player}
		<li class="score-list__item" data-player-state={player.status}>
			<span class="score-list__player">{player.name}</span>
			<span class="score-list__status">
				{#if player.status === 'active'}
					{$_('score.playing')}
				{:else if player.status === 'passed'}
					{$_('score.passed')}
				{:else if player.status === 'out'}
					{$_('score.out')}
				{:else}
					{player.status}
				{/if}
			</span>
			<span class="score-list__score">{player.roundScore}</span>
		</li>
	{/each}
</ol>

<style>
	.score-list {
		display: grid;
		gap: 0.5rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.score-list__item {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.125rem 0.75rem;
		align-items: center;
		border: 2px solid var(--grayscale-200);
		border-radius: 0.5rem;
		padding: 0.625rem 0.75rem;
		background-color: var(--grayscale-100);
	}

	.score-list__player {
		color: var(--grayscale-900);
		font-size: var(--font-size-lg);
		font-weight: 700;
	}

	.score-list__status {
		color: var(--grayscale-600);
		font-size: var(--font-size-base);
	}

	.score-list__score {
		grid-row: span 2;
		color: var(--grayscale-900);
		font-size: var(--font-size-lg);
		font-weight: 700;
	}

	.score-list__item[data-player-state='active'] {
		border-color: var(--orange-600);
		background-color: var(--orange-100);
	}

	.score-list__item[data-player-state='passed'],
	.score-list__item[data-player-state='incorrect'],
	.score-list__item[data-player-state='out'] {
		opacity: 0.58;
	}

	.score-list__item[data-player-state='passed'] {
		border-style: dashed;
	}

	.score-list__item[data-player-state='incorrect'],
	.score-list__item[data-player-state='out'] {
		border-color: hsl(0 86% 58%);
		background:
			linear-gradient(
				135deg,
				transparent calc(50% - 1px),
				hsl(0 86% 58% / 0.65) 50%,
				transparent calc(50% + 1px)
			),
			var(--grayscale-100);
	}
</style>
