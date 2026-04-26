<script>
	import { _ } from 'svelte-i18n';
	import {
		game,
		revealBlob,
		passCurrentPlayer,
		endRound,
		startNextRound,
		checkRoundOver,
	} from '../lib/game.svelte.js';
	import { QUESTION_TYPES } from '../data/questionTypes.js';
	import GameMenu from '../components/GameMenu.svelte';
	import QuestionMeta from '../components/QuestionMeta.svelte';
	import QuestionWheel from '../components/QuestionWheel.svelte';
	import AnswerDialog from '../components/AnswerDialog.svelte';
	import RoundReviewPanel from '../components/RoundReviewPanel.svelte';
	import GameFinishedPodium from '../components/GameFinishedPodium.svelte';

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

	function getSeatRotation(/** @type {number} */ seatPosition) {
		return ((seatPosition + 4) % 8) * 45;
	}

	const seatRotation = $derived(
		currentPlayer ? getSeatRotation(currentPlayer.seatPosition) : 0,
	);

	const lastPlayer = $derived(
		game.players.find((p) => p.id === game.currentRound?.lastPlayerId) ??
			null,
	);

	const reviewSeatRotation = $derived(
		lastPlayer ? getSeatRotation(lastPlayer.seatPosition) : 0,
	);

	const pendingBlobLabel = $derived(
		pendingBlobIndex !== null && question
			? question.options[pendingBlobIndex]
			: '',
	);

	const pendingBlobAnswer = $derived(
		pendingBlobIndex !== null && question
			? (question.correctAnswers[pendingBlobIndex] ?? null)
			: null,
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
	<main
		class="main--game"
		data-question-type={questionTypeConfig?.cssToken}
		style:--current-player-color={currentPlayer ? `var(--${currentPlayer.color})` : null}
	>
		<GameMenu
			{currentPlayer}
			players={game.players}
			onstartover={handleStartOver}
			onsave={handleSave}
		/>

		{#if question}
			<QuestionMeta questionType={question.type} deck={question.deck} deckIcon={question.deckIcon} />

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
	<main
		class="main--review"
		data-question-type={questionTypeConfig?.cssToken}
	>
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

		<RoundReviewPanel
			players={game.players}
			roundNumber={game.currentRound?.roundNumber}
			onnext={startNextRound}
		/>
	</main>
{:else if game.status === 'finished'}
	<main
		class="main--finished"
		data-question-type={questionTypeConfig?.cssToken}
	>
		<GameFinishedPodium
			players={game.players}
			onstartover={handleStartOver}
		/>
	</main>
{/if}

<style>
	.game-action {
		position: fixed;
		bottom: calc(var(--question-meta-space, 4rem) + 0.75rem);
		right: max(1rem, env(safe-area-inset-right));
		z-index: 5;
	}

	.game-action__btn {
		border: none;
		border-radius: 0.5rem;
		padding: 0.625rem 1.25rem;
		background-color: var(--grayscale-800);
		color: var(--white);
		font-family: 'Oswald', sans-serif;
		font-size: var(--font-size-base);
		font-weight: 600;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		cursor: pointer;
		transition: background-color 0.15s;
		box-shadow: 0 2px 8px hsl(0 0% 0% / 0.25);
	}

	.game-action__btn:hover {
		background-color: var(--grayscale-700);
	}

	.game-action__btn--end-round {
		background-color: var(--orange-700);
	}

	.game-action__btn--end-round:hover {
		background-color: var(--orange-800);
	}
</style>
