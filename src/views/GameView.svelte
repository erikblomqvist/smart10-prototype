<script>
	import { _ } from 'svelte-i18n';
	import { game, revealBlob, passCurrentPlayer, endRound, startNextRound, checkRoundOver } from '../lib/game.svelte.js';
	import { QUESTION_TYPES } from '../data/questionTypes.js';
	import { getPlayerIconComponent } from '../lib/playerIcons.js';
	import GameMenu from '../components/GameMenu.svelte';
	import QuestionMeta from '../components/QuestionMeta.svelte';
	import QuestionWheel from '../components/QuestionWheel.svelte';
	import AnswerDialog from '../components/AnswerDialog.svelte';

	/** @type {{ onstartover: () => void }} */
	let { onstartover } = $props();

	let dialogOpen = $state(false);
	let pendingBlobIndex = $state(/** @type {number|null} */ (null));

	const currentPlayer = $derived(
		game.players.find((p) => p.id === game.currentPlayerId) ?? null,
	);

	const question = $derived(game.currentRound?.question ?? null);

	const questionTypeConfig = $derived(
		question ? (QUESTION_TYPES[question.type] ?? null) : null,
	);

	const blobStates = $derived(
		question
			? question.options.map((_, i) => {
					const results = game.currentRound?.blobResults ?? {};
					return i in results ? results[i] : null;
				})
			: [],
	);

	const reviewBlobStates = $derived(
		question
			? question.options.map((_, i) => {
					const results = game.currentRound?.blobResults ?? {};
					return i in results ? results[i] : true;
				})
			: [],
	);

	const roundIsOver = $derived(checkRoundOver());

	const seatRotation = $derived(((4 - (currentPlayer?.seatPosition ?? 0) + 8) % 8) * 45);

	const lastPlayer = $derived(
		game.players.find((p) => p.id === game.currentRound?.lastPlayerId) ?? null,
	);

	const reviewSeatRotation = $derived(
		lastPlayer ? ((4 - lastPlayer.seatPosition + 8) % 8) * 45 : 0,
	);

	const pendingBlobLabel = $derived(
		pendingBlobIndex !== null && question ? question.options[pendingBlobIndex] : '',
	);

	const pendingBlobAnswer = $derived(
		pendingBlobIndex !== null && question ? (question.correctAnswers[pendingBlobIndex] ?? null) : null,
	);

	const podiumPlayers = $derived(
		[...game.players].sort((a, b) => b.totalScore - a.totalScore),
	);

	function handleBlobClick(/** @type {number} */ blobIndex) {
		pendingBlobIndex = blobIndex;
		dialogOpen = true;
	}

	function handleDialogResult(/** @type {boolean} */ isCorrect) {
		dialogOpen = false;
		if (pendingBlobIndex !== null) {
			revealBlob(pendingBlobIndex, isCorrect);
			pendingBlobIndex = null;
		}
	}

	function handlePassOrEnd() {
		if (roundIsOver) {
			endRound();
		} else {
			passCurrentPlayer();
		}
	}

	function handleSave() {
		navigator.clipboard?.writeText(game.code).catch(() => {});
		alert($_('game.save_alert', { values: { code: game.code } }));
	}

	function handleStartOver() {
		if (confirm($_('game.new_game_confirm'))) {
			onstartover();
		}
	}
</script>

{#if game.status === 'playing'}
	<main class="main--game" data-question-type={questionTypeConfig?.cssToken}>
		<GameMenu
			{currentPlayer}
			players={game.players}
			onstartover={handleStartOver}
			onsave={handleSave}
		/>

		{#if question}
			<QuestionMeta questionType={question.type} deck={question.deck} />

			<QuestionWheel
				questionType={question.type}
				questionText={question.text}
				answers={question.options}
				correctAnswers={question.correctAnswers}
				blobs={blobStates}
				{seatRotation}
				onblobclick={handleBlobClick}
			/>
		{/if}

		<div class="game-action">
			<button
				class="game-action__btn"
				class:game-action__btn--end-round={roundIsOver}
				type="button"
				onclick={handlePassOrEnd}
			>
				{roundIsOver ? $_('game.end_round') : $_('game.pass')}
			</button>
		</div>

		<AnswerDialog
			open={dialogOpen}
			blobLabel={pendingBlobLabel}
			correctAnswer={pendingBlobAnswer}
			questionType={question?.type ?? 'standard'}
			onresult={handleDialogResult}
		/>
	</main>

{:else if game.status === 'round_review'}
	<main class="main--review" data-question-type={questionTypeConfig?.cssToken}>
		{#if question}
			<QuestionWheel
				questionType={question.type}
				questionText={question.text}
				answers={question.options}
				correctAnswers={question.correctAnswers}
				blobs={reviewBlobStates}
				seatRotation={reviewSeatRotation}
			/>
		{/if}

		<div class="review-panel">
			<h2 class="review-panel__heading">
				{$_('game.round_heading', { values: { n: game.currentRound?.roundNumber } })}
			</h2>
			<ol class="review-panel__scores">
				{#each [...game.players].sort((a, b) => b.roundScore - a.roundScore) as player}
					{@const PlayerIcon = getPlayerIconComponent(player.icon)}
					<li class="review-panel__score-item">
						<span class="review-panel__player-icon" aria-hidden="true">
							{#if PlayerIcon}<PlayerIcon size={14} />{/if}
						</span>
						<span class="review-panel__player-name">{player.name}</span>
						<span class="review-panel__round-score">+{player.roundScore}</span>
						<span class="review-panel__total-score">
							{$_('game.pts', { values: { n: player.totalScore } })}
						</span>
					</li>
				{/each}
			</ol>
			<button class="review-panel__btn" type="button" onclick={startNextRound}>
				{$_('game.next_round')}
			</button>
		</div>
	</main>

{:else if game.status === 'finished'}
	<main class="main--finished" data-question-type={questionTypeConfig?.cssToken}>
		<div class="podium">
			<p class="podium__label">{$_('game.game_over')}</p>

			{#if podiumPlayers[0]}
				{@const WinnerIcon = getPlayerIconComponent(podiumPlayers[0].icon)}
				<div class="podium__winner">
					<div class="podium__winner-icon">
						{#if WinnerIcon}<WinnerIcon size={56} />{/if}
					</div>
					<p class="podium__winner-name">
						{$_('game.wins', { values: { name: podiumPlayers[0].name } })}
					</p>
					<p class="podium__winner-score">
						{$_('game.pts', { values: { n: podiumPlayers[0].totalScore } })}
					</p>
				</div>
			{/if}

			<ol class="podium__list">
				{#each podiumPlayers as player, i}
					{@const Icon = getPlayerIconComponent(player.icon)}
					<li class="podium__list-item">
						<span class="podium__rank">#{i + 1}</span>
						<span class="podium__icon" aria-hidden="true">
							{#if Icon}<Icon size={16} />{/if}
						</span>
						<span class="podium__name">{player.name}</span>
						<span class="podium__score">
							{$_('game.pts', { values: { n: player.totalScore } })}
						</span>
					</li>
				{/each}
			</ol>

			<button class="podium__btn" type="button" onclick={handleStartOver}>
				{$_('game.new_game')}
			</button>
		</div>
	</main>
{/if}
