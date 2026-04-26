<script>
	import { onMount } from 'svelte';
	import { CircleDot } from 'lucide-svelte';
	import { QUESTION_TYPES } from '../data/questionTypes.js';
	import LucideIcon from './LucideIcon.svelte';

	/**
	 * @type {{ questionType: import('../data/questionTypes.js').QuestionType, deck: string, deckIcon?: string|null }}
	 */
	let { questionType, deck, deckIcon = null } = $props();

	/** @type {((id: string|null|undefined) => Array<[string, Record<string, string>]>)|null} */
	let getDeckIconNode = $state(null);

	const typeConfig = $derived(
		QUESTION_TYPES[questionType] ?? QUESTION_TYPES.standard,
	);
	const deckIconNode = $derived(deckIcon ? getDeckIconNode?.(deckIcon) : null);

	onMount(async () => {
		const icons = await import('../lib/deckIcons.js');
		getDeckIconNode = icons.getDeckIconNode;
	});
</script>

<dl class="question-meta">
	<dt><span class="question-meta__title">Type:</span></dt>
	<dd class="question-meta-type">
		<typeConfig.icon />
		<span class="question-meta__value">{typeConfig.label}</span>
	</dd>

	<dt><span class="question-meta__title">Deck:</span></dt>
	<dd>
		{#if deckIconNode}
			<LucideIcon name={deckIcon} iconNode={deckIconNode} />
		{:else}
			<CircleDot />
		{/if}
		<span class="question-meta__value">{deck}</span>
	</dd>
</dl>

<style>
	.question-meta {
		position: fixed;
		bottom: 0;
		left: 50%;
		display: grid;
		grid-template-columns: repeat(4, auto);
		align-items: center;
		gap: 1em;
		margin: 0;
		border-radius: 0.5em;
		border-bottom-left-radius: 0;
		border-bottom-right-radius: 0;
		border: 3px solid var(--orange-700);
		border-bottom: 0;
		padding: 0.5em 1em;
		background-color: hsl(0 0% 100%);
		transform: translateX(-50%);
	}

	dt {
		color: var(--grayscale-700);
		font-weight: 600;
	}

	dd {
		display: flex;
		align-items: center;
		gap: 0.5em;
		margin: 0;
		white-space: nowrap;
	}

	.question-meta-type {
		color: var(--question-color);
	}
</style>
