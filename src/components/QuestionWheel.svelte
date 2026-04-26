<script>
	import AnswerBlob from './AnswerBlob.svelte';

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
			<span
				class="answer"
				style="--index:{i + 1};--total:{answers.length}"
			>
				<span class="answer-text">{answer}</span>
			</span>
		{/each}
	</div>
</div>

<style>
	.container {
		--container-size: min(70cqmin, 32em);
		--container-radius: calc(var(--container-size) / 2);
		--question-scale: 0.55;
		--question-size: calc(var(--container-size) * var(--question-scale));
		--question-radius: calc(var(--question-size) / 2);
		--question-padding: 2em;
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
		font-size: clamp(0.875rem, 4.5cqmin, 1.5rem);
		line-height: 1.2;
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
		--connector-outer-length: calc(
			var(--container-radius) - var(--answer-radius)
		);
		--connector-length: calc(
			var(--container-radius) - var(--question-radius)
		);

		pointer-events: auto;
		position: absolute;
		top: calc(50% + sin(var(--angle-in-turns)) * var(--answer-radius));
		left: calc(50% + cos(var(--angle-in-turns)) * var(--answer-radius));
		display: inline-block;
		z-index: 0;
		width: max-content;
		transform: translate(-50%, -50%);
		text-align: center;
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
		background-color: hsl(0 0% 0%);
		rotate: calc(var(--angle-in-turns) + 0.25turn);
		transform-origin: 50% var(--connector-outer-length);
	}

	.answer-text {
		position: relative;
		z-index: 1;
		background-color: hsl(0 0% 100%);
		padding: 0.5em;
		font-size: clamp(0.875rem, 3cqmin, 1rem);
	}
</style>
