<script>
	import QuestionWheel from '../../components/QuestionWheel.svelte';
	import RoundReviewPanel from '../../components/RoundReviewPanel.svelte';

	/**
	 * @type {{
	 *   questionTypeToken?: string,
	 *   question: import('../../lib/game.svelte.js').GameQuestion|null,
	 *   players: import('../../lib/game.svelte.js').GamePlayer[],
	 *   roundNumber?: number,
	 *   reviewBlobStates: (boolean|null)[],
	 *   seatRotation: number,
	 *   onblobclick: (index: number) => void,
	 *   onnext: () => void,
	 * }}
	 */
	let {
		questionTypeToken,
		question,
		players,
		roundNumber,
		reviewBlobStates,
		seatRotation,
		onblobclick,
		onnext,
	} = $props();
</script>

<main class="main--review" data-question-type={questionTypeToken}>
	{#if question}
		<QuestionWheel
			questionType={question.type}
			questionText={question.text}
			answers={question.options}
			correctAnswers={question.correctAnswers}
			answerMedia={question.answerMedia}
			blobs={reviewBlobStates}
			{seatRotation}
			{onblobclick}
		/>
	{/if}

	<RoundReviewPanel {players} {roundNumber} {onnext} />
</main>
