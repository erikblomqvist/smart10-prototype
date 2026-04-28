<script>
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import {
		game,
		revealBlob,
		advanceCurrentPlayer,
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
	let reviewRevealedBlobIndexes = $state(/** @type {number[]} */ ([]));
	let reviewRevealRoundKey = /** @type {string|null} */ (null);

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
					if (i in results) return results[i];
					return reviewRevealedBlobIndexes.includes(i) ? true : null;
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
	const DEFAULT_ROTATION_EASING = 'linear(0, 0.0016 0.34%, 0.0084 0.79%, 0.0369 1.7%, 0.0894, 0.1594 3.73%, 0.3141 5.54%, 0.7904 10.52%, 0.9119, 1.0156, 1.0992, 1.1617 16.39%, 1.1836 17.07%, 1.2039 17.86%, 1.2168 18.54%, 1.2271 19.33%, 1.2329 20.24%, 1.2327, 1.2263, 1.2146, 1.1988 24.31%, 1.1774 25.44%, 1.0565 30.87%, 1.0055 33.58%, 0.9826 35.16%, 0.9664 36.63%, 0.9544, 0.9476 39.8%, 0.9455 41.83%, 0.9498 43.98%, 0.959 46.24%, 0.9861 51.44%, 0.9978 54.04%, 1.007, 1.0118 59.92%, 1.0118 64.56%, 1.0006 74.62%, 0.9974 80.05%, 1.0005 99.95%)';
	const INTRO_READING_BASE_MS = 1400;
	const INTRO_READING_MS_PER_CHARACTER = 25;
	const INTRO_READING_MIN_MS = 1800;
	const INTRO_READING_MAX_MS = 4000;
	const SPRING_DRAG_MAX_ROTATION = 360;
	const SPRING_DRAG_ROTATION_PER_PX = 0.24;
	const SPRING_DRAG_RETURN_DURATION_MS = 620;
	const STREAK_THRESHOLD = 3;
	const STREAK_CELEBRATION_MS = 1000;
	const SPRING_DRAG_IGNORE_SELECTOR =
		'button, a, input, select, textarea, [role="button"], [popover], [data-game-scroll-lock-allow]';
	let introSeatRotation = $state(/** @type {number|null} */ (null));
	let playedIntroRoundKey = /** @type {string | null} */ (null);
	let introTimerIds = /** @type {ReturnType<typeof setTimeout>[]} */ ([]);
	let springDragPointerId = $state(/** @type {number|null} */ (null));
	let springDragStartY = 0;
	let springDragRotationOffset = $state(0);
	let springDragIsActive = $state(false);
	let streakCelebrationPlayerId = $state(/** @type {string|null} */ (null));
	let streakBurstKey = $state(0);
	let streakCelebrationTimerId = /** @type {ReturnType<typeof setTimeout>|null} */ (null);
	const wheelSeatRotation = $derived(introSeatRotation ?? seatRotation);
	const interactiveWheelSeatRotation = $derived(
		wheelSeatRotation + springDragRotationOffset,
	);
	const streakCelebrationActive = $derived(streakCelebrationPlayerId !== null);
	const wheelStreakLevel = $derived(currentPlayer?.roundScore ?? 0);
	const wheelStreakColor = $derived(
		currentPlayer ? `var(--${currentPlayer.color})` : 'var(--orange-700)',
	);
	const wheelRotationDurationMs = $derived(
		springDragIsActive
			? 0
			: springDragRotationOffset !== 0
				? SPRING_DRAG_RETURN_DURATION_MS
				: introSeatRotation === null
					? SPRING_DRAG_RETURN_DURATION_MS
					: INTRO_ROTATION_DURATION_MS,
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

	function resetSpringDrag() {
		springDragPointerId = null;
		springDragIsActive = false;
		springDragRotationOffset = 0;
	}

	function clearStreakCelebration() {
		if (streakCelebrationTimerId !== null) {
			clearTimeout(streakCelebrationTimerId);
			streakCelebrationTimerId = null;
		}

		streakCelebrationPlayerId = null;
	}

	function startStreakCelebration(
		/** @type {NonNullable<ReturnType<typeof revealBlob>>} */ result,
	) {
		clearStreakCelebration();
		streakCelebrationPlayerId = result.playerId;
		streakBurstKey += 1;

		streakCelebrationTimerId = setTimeout(() => {
			streakCelebrationTimerId = null;
			streakCelebrationPlayerId = null;

			if (result.nextPlayerId) {
				advanceCurrentPlayer(result.playerId);
			}
		}, STREAK_CELEBRATION_MS);
	}

	function hasOpenPopover() {
		try {
			return document.querySelector('[popover]:popover-open') !== null;
		} catch {
			return false;
		}
	}

	function isSpringDragIgnoredTarget(/** @type {EventTarget | null} */ target) {
		return (
			target instanceof Element &&
			target.closest(SPRING_DRAG_IGNORE_SELECTOR) !== null
		);
	}

	function canStartSpringDrag(/** @type {PointerEvent} */ event) {
		return (
			event.isPrimary &&
			event.pointerType !== 'mouse' &&
			game.status === 'playing' &&
			question !== null &&
			introSeatRotation === null &&
			!streakCelebrationActive &&
			!dialogOpen &&
			!undoDialogOpen &&
			!hasOpenPopover() &&
			!isSpringDragIgnoredTarget(event.target)
		);
	}

	function handleSpringDragPointerDown(
		/** @type {PointerEvent & { currentTarget: HTMLElement }} */ event,
	) {
		if (!canStartSpringDrag(event)) return;

		springDragPointerId = event.pointerId;
		springDragStartY = event.clientY;
		springDragRotationOffset = 0;
		springDragIsActive = true;
		event.currentTarget.setPointerCapture(event.pointerId);
		event.preventDefault();
	}

	function handleSpringDragPointerMove(/** @type {PointerEvent} */ event) {
		if (springDragPointerId !== event.pointerId) return;

		const deltaY = event.clientY - springDragStartY;
		springDragRotationOffset = clamp(
			deltaY * SPRING_DRAG_ROTATION_PER_PX,
			-SPRING_DRAG_MAX_ROTATION,
			SPRING_DRAG_MAX_ROTATION,
		);
		event.preventDefault();
	}

	function handleSpringDragPointerEnd(
		/** @type {PointerEvent & { currentTarget: HTMLElement }} */ event,
	) {
		if (springDragPointerId !== event.pointerId) return;

		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}

		resetSpringDrag();
		event.preventDefault();
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
			clearStreakCelebration();
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
		if (
			game.status !== 'playing' ||
			dialogOpen ||
			undoDialogOpen ||
			streakCelebrationActive ||
			introSeatRotation !== null
		) {
			resetSpringDrag();
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

	$effect(() => {
		const roundKey = game.currentRound
			? `${game.currentRound.roundNumber}:${game.currentRound.question.id}`
			: null;

		if (game.status !== 'round_review' || !roundKey) {
			reviewRevealedBlobIndexes = [];
			reviewRevealRoundKey = null;
			return;
		}

		if (reviewRevealRoundKey !== roundKey) {
			reviewRevealedBlobIndexes = [];
			reviewRevealRoundKey = roundKey;
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
		if (streakCelebrationActive) return;
		pendingBlobIndex = blobIndex;
		dialogOpen = true;
	}

	function handleUndoBlobClick(/** @type {number} */ blobIndex) {
		if (streakCelebrationActive) return;
		if (blobIndex !== undoableBlobIndex) return;
		undoDialogOpen = true;
	}

	function handleReviewBlobClick(/** @type {number} */ blobIndex) {
		if (reviewRevealedBlobIndexes.includes(blobIndex)) return;
		reviewRevealedBlobIndexes = [...reviewRevealedBlobIndexes, blobIndex];
	}

	function handleDialogResult(/** @type {boolean} */ isCorrect) {
		dialogOpen = false;
		if (pendingBlobIndex !== null) {
			const shouldDeferAdvance =
				isCorrect && currentPlayer?.roundScore === STREAK_THRESHOLD - 1;
			const result = revealBlob(pendingBlobIndex, isCorrect, {
				deferAdvance: shouldDeferAdvance,
			});

			if (
				result?.isCorrect &&
				result.previousRoundScore === STREAK_THRESHOLD - 1 &&
				result.newRoundScore === STREAK_THRESHOLD
			) {
				startStreakCelebration(result);
			}

			pendingBlobIndex = null;
		}
	}

	function handleUndoDialogConfirm() {
		if (streakCelebrationActive) return;
		undoDialogOpen = false;
		undoLastMove();
	}

	function handlePassOrEnd() {
		if (streakCelebrationActive) return;
		if (roundIsOver) {
			endRound();
		} else {
			passCurrentPlayer();
		}
	}

	function handleUndo() {
		if (streakCelebrationActive) return;
		undoLastMove();
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
		onpointerdown={handleSpringDragPointerDown}
		onpointermove={handleSpringDragPointerMove}
		onpointerup={handleSpringDragPointerEnd}
		onpointercancel={handleSpringDragPointerEnd}
		onlostpointercapture={handleSpringDragPointerEnd}
		style:--current-player-color={currentPlayer
			? `var(--${currentPlayer.color})`
			: null}
	>
		<GameMenu
			{currentPlayer}
			players={game.players}
			onstartover={handleStartOver}
			onsave={handleSave}
			onundo={handleUndo}
			canundo={undoIsAvailable && !streakCelebrationActive}
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
				answerMedia={question.answerMedia}
				blobs={blobStates}
				seatRotation={interactiveWheelSeatRotation}
				rotationDurationMs={wheelRotationDurationMs}
				rotationEasing={wheelRotationEasing}
				streakLevel={wheelStreakLevel}
				streakColor={wheelStreakColor}
				{streakBurstKey}
				{undoableBlobIndex}
				onblobclick={streakCelebrationActive ? undefined : handleBlobClick}
				onundoblobclick={streakCelebrationActive ? undefined : handleUndoBlobClick}
			/>
		{/if}

		<div class="game-action">
			<button
				class="game-action__btn"
				class:game-action__btn--end-round={roundIsOver}
				type="button"
				disabled={streakCelebrationActive}
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
			seatRotation={interactiveWheelSeatRotation}
			rotationDurationMs={wheelRotationDurationMs}
			rotationEasing={wheelRotationEasing}
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
				answerMedia={question.answerMedia}
				blobs={reviewBlobStates}
				seatRotation={reviewSeatRotation}
				onblobclick={handleReviewBlobClick}
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

	.game-action__btn:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.game-action__btn--end-round {
		background-color: var(--orange-700);
	}

	.game-action__btn--end-round:hover {
		background-color: var(--orange-800);
	}
</style>
