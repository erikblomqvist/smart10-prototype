<script>
	import AnswerBlob from './AnswerBlob.svelte';
	import AnswerTextPopover from './AnswerTextPopover.svelte';

	/**
	 * @type {{
	 *   questionType: import('../data/questionTypes.js').QuestionType,
	 *   questionText: string,
	 *   answers: string[],
	 *   correctAnswers: (boolean|string|number|{ text: string, backgroundColor: string })[],
	 *   blobs?: (boolean|null)[],
	 *   seatRotation?: number,
	 *   onblobclick?: (index: number) => void,
	 * }}
	 */
	let {
		questionType,
		questionText,
		answers,
		correctAnswers,
		blobs,
		seatRotation = 0,
		onblobclick,
	} = $props();

	const answerBlobs = $derived(blobs ?? answers.map(() => null));
	const popoverIdPrefix = Math.random().toString(36).slice(2);

	/** @param {number} index */
	function getAnswerPopoverId(index) {
		return `answer-popover-${popoverIdPrefix}-${index}`;
	}
</script>

<div class="container" style="--seat-rotation:{seatRotation}">
	<div class="question">
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
		transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
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
		box-sizing: border-box;
		position: relative;
		z-index: 1;
		display: grid;
		place-items: center;
		border-radius: 50%;
		border: 4px solid var(--question-color);
		width: var(--question-size);
		height: var(--question-size);
		padding: var(--question-padding);
		box-shadow: 0 0 0 1px hsl(0 0% 0%);
		text-align: center;
	}

	.question p {
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
