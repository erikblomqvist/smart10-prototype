<script>
	import { _ } from 'svelte-i18n';

	/**
	 * @type {{
	 *   open: boolean,
	 *   blobLabel: string,
	 *   correctAnswer: import('../data/game.js').CorrectAnswer | null,
	 *   questionType: import('../data/questionTypes.js').QuestionType,
	 *   onresult: (isCorrect: boolean) => void,
	 * }}
	 */
	let { open, blobLabel, correctAnswer, questionType, onresult } = $props();

	/** @type {HTMLDialogElement | null} */
	let dialogEl = $state(null);

	$effect(() => {
		if (!dialogEl) return;
		if (open && !dialogEl.open) dialogEl.showModal();
		else if (!open && dialogEl.open) dialogEl.close();
	});

	const isBoolean = $derived(typeof correctAnswer === 'boolean');
	const isColor = $derived(
		typeof correctAnswer === 'object' && correctAnswer !== null && 'backgroundColor' in correctAnswer,
	);

	const colorStyle = $derived(
		isColor ? `--answer-bg: ${/** @type {any} */ (correctAnswer).backgroundColor}` : '',
	);
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<dialog
	bind:this={dialogEl}
	class="answer-dialog"
	class:answer-dialog--boolean={isBoolean}
	class:answer-dialog--color={isColor}
	style={colorStyle}
	onkeydown={(e) => e.key === 'Escape' && e.preventDefault()}
	onclick={(e) => e.stopPropagation()}
>
	<p class="answer-dialog__label">{blobLabel}</p>

	{#if isColor}
		<div class="answer-dialog__color-swatch"></div>
	{/if}

	<p
		class="answer-dialog__answer"
		class:answer-dialog__answer--yes={isBoolean && correctAnswer === true}
		class:answer-dialog__answer--no={isBoolean && correctAnswer === false}
	>
		{#if correctAnswer !== null}
			{#if isBoolean}
				{correctAnswer ? $_('answer_dialog.yes') : $_('answer_dialog.no')}
			{:else if questionType === 'centuryDecade'}
				{correctAnswer}-talet
			{:else if isColor}
				{/** @type {any} */ (correctAnswer).text}
			{:else}
				{correctAnswer}
			{/if}
		{/if}
	</p>

	<div class="answer-dialog__actions">
		<button
			class="answer-dialog__btn answer-dialog__btn--correct"
			type="button"
			onclick={() => onresult(true)}
		>
			{$_('answer_dialog.correct')}
		</button>
		<button
			class="answer-dialog__btn answer-dialog__btn--wrong"
			type="button"
			onclick={() => onresult(false)}
		>
			{$_('answer_dialog.wrong')}
		</button>
	</div>
</dialog>
