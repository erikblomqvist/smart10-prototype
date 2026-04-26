<script>
	/**
	 * @type {{ id: string, answer: string|number|{ text: string, backgroundColor: string } }}
	 */
	let { id, answer } = $props();

	const isColorAnswer = $derived(
		typeof answer === 'object' && answer !== null,
	);
	const answerLabel = $derived(isColorAnswer ? answer.text : String(answer));
	const answerBackgroundColor = $derived(
		isColorAnswer ? answer.backgroundColor : undefined,
	);

	/** @param {MouseEvent & { currentTarget: HTMLElement }} event */
	function closePopover(event) {
		event.currentTarget.hidePopover();
	}
</script>

<button
	{id}
	class="answer-popover"
	type="button"
	popover="auto"
	data-answer-kind={isColorAnswer ? 'color' : 'text'}
	style={answerBackgroundColor
		? `--answer-background-color:${answerBackgroundColor}`
		: undefined}
	onclick={closePopover}
>
	{answerLabel}
</button>
