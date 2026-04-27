<script>
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import {
		game,
		revealBlob,
		passCurrentPlayer,
		endRound,
		startNextRound,
		checkRoundOver,
		canUndoLastMove,
		undoLastMove,
	} from '../lib/game.svelte.js';
	import { QUESTION_TYPES } from '../data/questionTypes.js';
	import GameMenu from '../components/GameMenu.svelte';
	import QuestionMeta from '../components/QuestionMeta.svelte';
	import QuestionWheel from '../components/QuestionWheel.svelte';
	import AnswerDialog from '../components/AnswerDialog.svelte';
	import UndoLastMoveDialog from '../components/UndoLastMoveDialog.svelte';
	import RoundReviewPanel from '../components/RoundReviewPanel.svelte';
	import GameFinishedPodium from '../components/GameFinishedPodium.svelte';

	/** @type {{ onstartover: () => void }} */
	let { onstartover } = $props();

	let dialogOpen = $state(false);
	let pendingBlobIndex = $state(/** @type {number|null} */ (null));
	let undoDialogOpen = $state(false);

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
	const undoIsAvailable = $derived(canUndoLastMove());
	const undoableBlobIndex = $derived(
		undoIsAvailable
			? (game.currentRound?.lastAnswerMove?.blobIndex ?? null)
			: null,
	);

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

	const INTRO_ROTATION_DURATION_MS = 800;
	const INTRO_ROTATION_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';
	const DEFAULT_ROTATION_EASING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
	const INTRO_READING_BASE_MS = 1400;
	const INTRO_READING_MS_PER_CHARACTER = 25;
	const INTRO_READING_MIN_MS = 1800;
	const INTRO_READING_MAX_MS = 4000;
	let introSeatRotation = $state(/** @type {number|null} */ (null));
	let playedIntroRoundKey = /** @type {string | null} */ (null);
	let introTimerIds = /** @type {ReturnType<typeof setTimeout>[]} */ ([]);
	const wheelSeatRotation = $derived(introSeatRotation ?? seatRotation);
	const wheelRotationDurationMs = $derived(
		introSeatRotation === null ? 500 : INTRO_ROTATION_DURATION_MS,
	);
	const wheelRotationEasing = $derived(
		introSeatRotation === null
			? DEFAULT_ROTATION_EASING
			: INTRO_ROTATION_EASING,
	);

	const GAME_LOCK_CLASS = 'game-interaction-lock';
	const GAME_LOCK_SCROLL_ALLOW_SELECTOR = '[data-game-scroll-lock-allow]';
	const DOUBLE_TAP_DELAY = 300;
	const lockedElements = $derived([document.documentElement, document.body]);
	let lastTouchEnd = 0;
	let lastTouchY = 0;
	let gameSurfaceEl = $state(/** @type {HTMLElement | null} */ (null));
	let viewportResetFrame = /** @type {number | null} */ (null);

	function clamp(
		/** @type {number} */ value,
		/** @type {number} */ min,
		/** @type {number} */ max,
	) {
		return Math.min(Math.max(value, min), max);
	}

	function getQuestionReadingMs(/** @type {string} */ text) {
		return clamp(
			INTRO_READING_BASE_MS +
				text.length * INTRO_READING_MS_PER_CHARACTER,
			INTRO_READING_MIN_MS,
			INTRO_READING_MAX_MS,
		);
	}

	function clearIntroTimers() {
		introTimerIds.forEach(clearTimeout);
		introTimerIds = [];
	}

	function resetIntroRotation() {
		clearIntroTimers();
		introSeatRotation = null;
	}

	function scheduleIntroStep(
		/** @type {number} */ delay,
		/** @type {() => void} */ callback,
	) {
		const timerId = setTimeout(callback, delay);
		introTimerIds = [...introTimerIds, timerId];
	}

	function getIntroPlayerPath(
		/** @type {{ id: string, seatPosition: number }} */ starter,
	) {
		const sortedPlayers = [...game.players].sort(
			(a, b) => a.turnOrder - b.turnOrder,
		);
		const starterIndex = sortedPlayers.findIndex(
			(player) => player.id === starter.id,
		);

		if (starterIndex === -1 || sortedPlayers.length <= 1) {
			return [];
		}

		const rotatedPlayers = [
			...sortedPlayers.slice(starterIndex),
			...sortedPlayers.slice(0, starterIndex),
		];

		return [...rotatedPlayers, starter];
	}

	function startRoundIntro(
		/** @type {{ id: string, seatPosition: number }} */ starter,
		/** @type {string} */ questionText,
	) {
		const playerPath = getIntroPlayerPath(starter);
		if (!playerPath.length) return false;

		clearIntroTimers();

		const readingMs = getQuestionReadingMs(questionText);
		introSeatRotation = getSeatRotation(starter.seatPosition);

		playerPath.slice(1).forEach((player, index) => {
			scheduleIntroStep(readingMs * (index + 1), () => {
				introSeatRotation = getSeatRotation(player.seatPosition);
			});
		});

		scheduleIntroStep(readingMs * playerPath.length, () => {
			resetIntroRotation();
		});

		return true;
	}

	function setGameInteractionLock(/** @type {boolean} */ locked) {
		lockedElements.forEach((element) =>
			element.classList.toggle(GAME_LOCK_CLASS, locked),
		);
	}

	function resetGameViewport() {
		const wasLocked = document.body.classList.contains(GAME_LOCK_CLASS);

		if (wasLocked) {
			setGameInteractionLock(false);
		}

		window.scrollTo(0, 0);
		document.scrollingElement?.scrollTo(0, 0);
		document.documentElement.scrollTop = 0;
		document.body.scrollTop = 0;

		if (gameSurfaceEl) {
			gameSurfaceEl.scrollTop = 0;
			gameSurfaceEl.scrollLeft = 0;
		}

		if (wasLocked) {
			setGameInteractionLock(true);
		}
	}

	function scheduleGameViewportReset() {
		if (viewportResetFrame !== null) {
			cancelAnimationFrame(viewportResetFrame);
		}

		resetGameViewport();
		viewportResetFrame = requestAnimationFrame(() => {
			resetGameViewport();
			viewportResetFrame = requestAnimationFrame(() => {
				resetGameViewport();
				viewportResetFrame = null;
			});
		});
	}

	function preventDefault(/** @type {Event} */ event) {
		event.preventDefault();
	}

	function getAllowedGameScroller(/** @type {EventTarget | null} */ target) {
		return target instanceof Element
			? target.closest(GAME_LOCK_SCROLL_ALLOW_SELECTOR)
			: null;
	}

	function canScrollAllowedElement(
		/** @type {Element} */ element,
		/** @type {number} */ deltaY,
	) {
		const scrollableElement = /** @type {HTMLElement} */ (element);
		const canScroll =
			scrollableElement.scrollHeight > scrollableElement.clientHeight;
		const isAtTop = scrollableElement.scrollTop <= 0;
		const isAtBottom =
			scrollableElement.scrollTop + scrollableElement.clientHeight >=
			scrollableElement.scrollHeight - 1;

		return (
			canScroll &&
			!((deltaY > 0 && isAtTop) || (deltaY < 0 && isAtBottom))
		);
	}

	function handleLockedTouchStart(/** @type {TouchEvent} */ event) {
		lastTouchY = event.touches[0]?.clientY ?? 0;
	}

	function handleLockedTouchMove(/** @type {TouchEvent} */ event) {
		const allowedScroller = getAllowedGameScroller(event.target);
		const currentTouchY = event.touches[0]?.clientY ?? lastTouchY;
		const deltaY = currentTouchY - lastTouchY;

		if (
			event.touches.length > 1 ||
			!allowedScroller ||
			!canScrollAllowedElement(allowedScroller, deltaY)
		) {
			event.preventDefault();
		}

		lastTouchY = currentTouchY;
	}

	function handleLockedTouchEnd(/** @type {TouchEvent} */ event) {
		const now = Date.now();

		if (now - lastTouchEnd <= DOUBLE_TAP_DELAY) {
			event.preventDefault();
		}

		lastTouchEnd = now;
	}

	onMount(() => {
		const touchOptions = { passive: false };

		resetGameViewport();
		setGameInteractionLock(true);
		document.addEventListener('touchstart', handleLockedTouchStart, {
			passive: true,
		});
		document.addEventListener(
			'touchmove',
			handleLockedTouchMove,
			touchOptions,
		);
		document.addEventListener(
			'touchend',
			handleLockedTouchEnd,
			touchOptions,
		);
		document.addEventListener('gesturestart', preventDefault);
		document.addEventListener('gesturechange', preventDefault);
		document.addEventListener('gestureend', preventDefault);

		return () => {
			if (viewportResetFrame !== null) {
				cancelAnimationFrame(viewportResetFrame);
			}

			setGameInteractionLock(false);
			resetIntroRotation();
			document.removeEventListener('touchstart', handleLockedTouchStart);
			document.removeEventListener('touchmove', handleLockedTouchMove);
			document.removeEventListener('touchend', handleLockedTouchEnd);
			document.removeEventListener('gesturestart', preventDefault);
			document.removeEventListener('gesturechange', preventDefault);
			document.removeEventListener('gestureend', preventDefault);
		};
	});

	$effect(() => {
		const roundNumber = game.currentRound?.roundNumber;

		if (game.status === 'playing' && roundNumber) {
			scheduleGameViewportReset();
		}
	});

	$effect(() => {
		const round = game.currentRound;
		const starter = currentPlayer;
		const roundQuestion = round?.question ?? null;
		const playerCount = game.players.length;
		const roundKey = roundQuestion
			? `${round?.roundNumber ?? 0}:${roundQuestion.id}`
			: null;
		const hasRoundProgress =
			(round?.answeredBlobs.length ?? 0) > 0 ||
			round?.lastPlayerId !== null;

		if (
			game.status !== 'playing' ||
			!roundKey ||
			!starter ||
			playerCount <= 1 ||
			hasRoundProgress ||
			playedIntroRoundKey === roundKey
		) {
			if (game.status !== 'playing' || hasRoundProgress) {
				resetIntroRotation();
			}
			return;
		}

		if (startRoundIntro(starter, roundQuestion.text)) {
			playedIntroRoundKey = roundKey;
		}
	});

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

	function handleUndoBlobClick(/** @type {number} */ blobIndex) {
		if (blobIndex !== undoableBlobIndex) return;
		undoDialogOpen = true;
	}

	function handleDialogResult(/** @type {boolean} */ isCorrect) {
		dialogOpen = false;
		if (pendingBlobIndex !== null) {
			revealBlob(pendingBlobIndex, isCorrect);
			pendingBlobIndex = null;
		}
	}

	function handleUndoDialogConfirm() {
		undoDialogOpen = false;
		undoLastMove();
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
		bind:this={gameSurfaceEl}
		class="main--game"
		data-question-type={questionTypeConfig?.cssToken}
		style:--current-player-color={currentPlayer
			? `var(--${currentPlayer.color})`
			: null}
	>
		<GameMenu
			{currentPlayer}
			players={game.players}
			onstartover={handleStartOver}
			onsave={handleSave}
			onundo={undoLastMove}
			canundo={undoIsAvailable}
		/>

		{#if question}
			<QuestionMeta
				questionType={question.type}
				deck={question.deck}
				deckIcon={question.deckIcon}
			/>

			<QuestionWheel
				questionType={question.type}
				questionText={question.text}
				answers={question.options}
				correctAnswers={question.correctAnswers}
				blobs={blobStates}
				seatRotation={wheelSeatRotation}
				rotationDurationMs={wheelRotationDurationMs}
				rotationEasing={wheelRotationEasing}
				{undoableBlobIndex}
				onblobclick={handleBlobClick}
				onundoblobclick={handleUndoBlobClick}
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
		{#if undoDialogOpen}
			<UndoLastMoveDialog
				open={true}
				onconfirm={handleUndoDialogConfirm}
				oncancel={() => (undoDialogOpen = false)}
			/>
		{/if}
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
