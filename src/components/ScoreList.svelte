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
