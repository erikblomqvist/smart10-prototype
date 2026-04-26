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
	let { questionType, questionText, answers, correctAnswers, blobs, seatRotation = 0, onblobclick } =
		$props();

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
			<span class="answer" style="--index:{i + 1};--total:{answers.length}">
				<span class="answer-text">{answer}</span>
			</span>
		{/each}
	</div>
</div>
