<script>
	import AnswerBlob from './AnswerBlob.svelte';
	import AnswerTextPopover from './AnswerTextPopover.svelte';
	import { QUESTION_TYPES } from '../data/questionTypes.js';

	/**
	 * @type {{
	 *   questionType: import('../data/questionTypes.js').QuestionType,
	 *   questionText: string,
	 *   answers: string[],
	 *   correctAnswers: (boolean|string|number|{ text: string, backgroundColor: string })[],
	 *   blobs?: (boolean|null)[],
	 *   seatRotation?: number,
	 *   rotationDurationMs?: number,
	 *   rotationEasing?: string,
	 *   undoableBlobIndex?: number|null,
	 *   onblobclick?: (index: number) => void,
	 *   onundoblobclick?: (index: number) => void,
	 * }}
	 */
	let {
		questionType,
		questionText,
		answers,
		correctAnswers,
		blobs,
		seatRotation = 0,
		rotationDurationMs = 500,
		rotationEasing = 'cubic-bezier(0.34, 1.56, 0.64, 1)',
		undoableBlobIndex = null,
		onblobclick,
		onundoblobclick,
	} = $props();

	const answerBlobs = $derived(blobs ?? answers.map(() => null));
	const questionTypeToken = $derived(
		QUESTION_TYPES[questionType]?.cssToken ?? 'standard',
	);
	const popoverIdPrefix = Math.random().toString(36).slice(2);

	/** @param {number} index */
	function getAnswerPopoverId(index) {
		return `answer-popover-${popoverIdPrefix}-${index}`;
	}
</script>

<div
	class="container"
	style="--seat-rotation:{seatRotation};--rotation-duration-ms:{rotationDurationMs};--rotation-easing:{rotationEasing}"
>
	<div class={`question question--${questionTypeToken}`}>
		<p>{questionText}</p>
	</div>

	<div class="blobs">
		{#each answerBlobs as blob, i}
			<AnswerBlob
				answered={blob}
				correctAnswer={correctAnswers[i]}
				{questionType}
				index={i + 1}
				total={answerBlobs.length}
				onreveal={blob === null ? () => onblobclick?.(i) : undefined}
				onansweredclick={blob !== null && undoableBlobIndex === i
					? () => onundoblobclick?.(i)
					: undefined}
			/>
		{/each}
	</div>

	<div class="answers">
		{#each answers as answer, i}
			<button
				class="answer"
				type="button"
				popovertarget={getAnswerPopoverId(i)}
				aria-label={`Show full answer: ${answer}`}
				style="--index:{i + 1};--total:{answers.length}"
			>
				<span class="answer-text">{answer}</span>
			</button>
		{/each}
	</div>

	{#each answers as answer, i}
		<AnswerTextPopover id={getAnswerPopoverId(i)} text={answer} />
	{/each}
</div>

<style>
	.container {
		--container-size: min(70cqmin, 32em);
		--container-radius: calc(var(--container-size) / 2);
		--question-scale: 0.55;
		--question-size: calc(var(--container-size) * var(--question-scale));
		--question-radius: calc(var(--question-size) / 2);
		--question-padding: calc(var(--question-size) * 0.12);
		--answer-radius: calc(var(--container-size) / 2.6);
		--blob-radius: calc(var(--container-size) / 1.6);

		position: relative;
		display: grid;
		place-items: center;
		border-radius: 50%;
		width: var(--container-size);
		height: var(--container-size);
		background-color: hsl(0, 0%, 100%);
		transform: rotate(calc(var(--seat-rotation, 0) * 1deg));
		transition: transform calc(var(--rotation-duration-ms, 500) * 1ms)
			var(--rotation-easing, cubic-bezier(0.34, 1.56, 0.64, 1));
	}

	.container::after {
		content: '';
		position: absolute;
		inset: 0;
		z-index: 2;
		pointer-events: none;
		border-radius: inherit;
		box-shadow:
			inset -1px 2px 4px hsl(0 0% 0% / 0.25),
			inset 3px -4px 10px 2px hsl(0 0% 0% / 0.25);
	}

	@container body (width <= 36rem) {
		.container {
			--question-scale: 0.5;
			--question-padding: 1.5em;
		}
	}

	@container body (height <= 36rem) {
		.container {
			--question-scale: 0.5;
			--question-padding: 1.5em;
		}
	}

	@container body (width <= 27rem) {
		.container {
			--question-scale: 0.45;
			--question-padding: 1em;
		}
	}

	@container body (height <= 27rem) {
		.container {
			--question-scale: 0.45;
			--question-padding: 1em;
		}
	}

	.question {
		--question-pattern-width: clamp(
			0.45rem,
			calc(var(--question-size) * 0.035),
			0.8rem
		);
		--question-pattern-color: var(--question-color);
		--question-pattern: var(--question-color);

		box-sizing: border-box;
		position: relative;
		z-index: 1;
		display: grid;
		place-items: center;
		border-radius: 50%;
		overflow: hidden;
		width: var(--question-size);
		height: var(--question-size);
		padding: var(--question-padding);
		background: var(--white);
		box-shadow: 0 0 0 1px hsl(0 0% 0%);
		text-align: center;
	}

	.question::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: 0;
		border-radius: inherit;
		background: var(--question-pattern);
		pointer-events: none;
		-webkit-mask: radial-gradient(
			farthest-side,
			transparent calc(100% - var(--question-pattern-width)),
			hsl(0 0% 0%) calc(100% - var(--question-pattern-width) + 1px)
		);
		mask: radial-gradient(
			farthest-side,
			transparent calc(100% - var(--question-pattern-width)),
			hsl(0 0% 0%) calc(100% - var(--question-pattern-width) + 1px)
		);
	}

	.question--standard {
		--question-pattern: radial-gradient(
					circle at 50% 20%,
					var(--question-pattern-color) 0 0.22rem,
					transparent 0.24rem
				)
				0 0 / 1rem 0.65rem,
			radial-gradient(
					circle at 50% 80%,
					var(--question-pattern-color) 0 0.22rem,
					transparent 0.24rem
				)
				0.5rem 0 / 1rem 0.65rem;
	}

	.question--boolean {
		--question-pattern: repeating-conic-gradient(
			from 9deg,
			var(--question-pattern-color) 0deg 13deg,
			transparent 13deg 26deg
		);
	}

	.question--rank {
		--question-pattern: repeating-conic-gradient(
				from 2deg,
				hsl(0 0% 0% / 0.25) 0deg 2deg,
				transparent 2deg 10deg
			),
			repeating-linear-gradient(
				90deg,
				var(--question-pattern-color) 0 0.18rem,
				transparent 0.18rem 0.36rem,
				var(--question-pattern-color) 0.36rem 0.62rem,
				transparent 0.62rem 0.95rem
			);
	}

	.question--choose-between {
		--question-pattern: conic-gradient(
					from 45deg,
					var(--question-pattern-color) 0 25%,
					transparent 0 50%,
					var(--question-pattern-color) 0 75%,
					transparent 0
				)
				0 0 / 0.9rem 0.9rem;
	}

	.question--colors {
		--question-pattern: radial-gradient(
					circle,
					hsl(330 100% 71%) 0 0.16rem,
					transparent 0.18rem
				)
				0 0 / 0.62rem 0.62rem,
			radial-gradient(circle, hsl(46 100% 62%) 0 0.18rem, transparent 0.2rem)
				0.3rem 0.1rem / 0.72rem 0.72rem,
			radial-gradient(circle, hsl(206 100% 42%) 0 0.14rem, transparent 0.16rem)
				0.1rem 0.36rem / 0.68rem 0.68rem;
	}

	.question--numbers {
		--question-pattern: linear-gradient(
					90deg,
					transparent 0 30%,
					var(--question-pattern-color) 30% 45%,
					transparent 45% 55%,
					var(--question-pattern-color) 55% 70%,
					transparent 70%
				)
				0 0 / 0.9rem 0.9rem,
			linear-gradient(
					0deg,
					var(--question-pattern-color) 0 18%,
					transparent 18% 82%,
					var(--question-pattern-color) 82% 100%
				)
				0.45rem 0.45rem / 0.9rem 0.9rem;
	}

	.question--century-decade {
		--question-pattern: repeating-conic-gradient(
				from -1deg,
				var(--question-pattern-color) 0deg 3deg,
				transparent 3deg 10deg
			),
			repeating-conic-gradient(
				from 0deg,
				hsl(0 0% 0% / 0.3) 0deg 1deg,
				transparent 1deg 30deg
			);
	}

	.question p {
		position: relative;
		z-index: 1;
		margin: 0;
		font-size: clamp(0.875rem, calc(var(--question-size) * 0.13), 1.5rem);
		line-height: 1.1;
		text-wrap: balance;
		overflow-wrap: break-word;
		hyphens: auto;
	}

	.blobs,
	.answers {
		pointer-events: none;
		position: absolute;
		inset: 0;
	}

	.answers {
		clip-path: circle(50% at 50% 50%);
	}

	.answer {
		--angle-fraction: calc(((var(--index) - 1) / var(--total)) - 0.25);
		--angle-in-turns: calc(var(--angle-fraction) * 1turn);
		--answer-slot-width: calc(
			2 * var(--answer-radius) * sin(calc(0.5turn / var(--total))) * 0.85
		);
		--connector-outer-length: calc(
			var(--container-radius) - var(--answer-radius)
		);
		--connector-length: calc(
			var(--container-radius) - var(--question-radius)
		);

		pointer-events: auto;
		appearance: none;
		position: absolute;
		top: calc(50% + sin(var(--angle-in-turns)) * var(--answer-radius));
		left: calc(50% + cos(var(--angle-in-turns)) * var(--answer-radius));
		display: grid;
		place-items: center;
		z-index: 0;
		border: 0;
		margin: 0;
		padding: 0;
		width: var(--answer-slot-width);
		background: none;
		color: inherit;
		font: inherit;
		transform: translate(-50%, -50%);
		text-align: center;
		cursor: pointer;
	}

	.answer:focus-visible {
		outline: 3px solid var(--orange-800);
		outline-offset: 3px;
	}

	.answer::before {
		content: '';
		position: absolute;
		top: calc(50% - var(--connector-outer-length));
		left: 50%;
		z-index: 0;
		width: 1px;
		height: var(--connector-length);
		margin-inline-start: -0.5px;
		background-color: hsl(0 0% 0% / 0.2);
		mask: linear-gradient(
			to bottom,
			hsl(0 0% 0%) 0 20%,
			transparent 20% 80%,
			hsl(0 0% 0%) 80%
		);
		rotate: calc(var(--angle-in-turns) + 0.25turn);
		transform-origin: 50% var(--connector-outer-length);
	}

	.answer-text {
		position: relative;
		z-index: 1;
		display: -webkit-box;
		box-sizing: border-box;
		overflow: hidden;

		max-width: 100%;
		padding-inline: 0.35em;

		font-size: clamp(0.75rem, calc(var(--container-size) * 0.035), 1rem);
		line-height: 1.1;
		text-wrap: balance;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
	}

	@container body (width >= 40rem) {
		.answer-text {
			-webkit-line-clamp: 3;
			line-clamp: 3;
		}
	}
</style>
