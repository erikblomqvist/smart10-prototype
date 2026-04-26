<script>
	import { _ } from 'svelte-i18n';
	import { Check, X } from 'lucide-svelte';

	/**
	 * @type {{
	 *   answered: boolean|null,
	 *   correctAnswer: import('../data/game.js').CorrectAnswer,
	 *   questionType?: import('../data/questionTypes.js').QuestionType,
	 *   index: number,
	 *   total: number,
	 *   onreveal?: () => void,
	 * }}
	 */
	let { answered = null, correctAnswer, questionType, index, total, onreveal } = $props();

	const isAnswered = $derived(answered !== null);
	const isBooleanAnswer = $derived(typeof correctAnswer === 'boolean');
	const isColorAnswer = $derived(
		typeof correctAnswer === 'object' && correctAnswer !== null && 'backgroundColor' in correctAnswer,
	);
	const isCorrect = $derived(answered === true);
	const displayAnswer = $derived(
		questionType === 'centuryDecade' ? `${correctAnswer}-talet` : correctAnswer,
	);
	const answerLabel = $derived(
		isColorAnswer
			? /** @type {any} */ (correctAnswer).text
			: String(displayAnswer),
	);
	const answerBackgroundColor = $derived(
		isColorAnswer ? /** @type {any} */ (correctAnswer).backgroundColor : undefined,
	);
</script>

<button
	class="blob"
	type="button"
	data-answered={isAnswered}
	data-correct={isAnswered ? (isBooleanAnswer ? !!correctAnswer : isCorrect) : undefined}
	data-answer-kind={isBooleanAnswer ? 'boolean' : isColorAnswer ? 'color' : 'text'}
	style="--index:{index};--total:{total}{answerBackgroundColor
		? `;--answer-background-color:${answerBackgroundColor}`
		: ''}"
	aria-label={isAnswered
		? $_('blob.answer_aria', { values: { answer: answerLabel } })
		: $_('blob.reveal_aria', { values: { n: index } })}
	onclick={() => {
		if (answered === null) onreveal?.();
	}}
>
	{#if isAnswered}
		{#if isBooleanAnswer}
			<div class="blob-icon">
				{#if correctAnswer}
					<Check />
				{:else}
					<X />
				{/if}
			</div>
		{:else}
			<span class="blob-answer">{answerLabel}</span>
		{/if}
	{/if}
</button>
