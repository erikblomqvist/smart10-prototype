<script>
	import { _ } from 'svelte-i18n';

	/**
	 * @type {{ players: { name: string, totalScore: number }[] }}
	 */
	let { players } = $props();

	const rankedPlayers = $derived(
		[...players].sort((a, b) => b.totalScore - a.totalScore),
	);
</script>

<ol class="overall-score-list">
	{#each rankedPlayers as player, index}
		<li class="overall-score-list__item">
			<span class="overall-score-list__rank">{index + 1}</span>
			<span class="overall-score-list__player">{player.name}</span>
			<span class="overall-score-list__score"
				>{$_('game.pts', { values: { n: player.totalScore } })}</span
			>
		</li>
	{/each}
</ol>
