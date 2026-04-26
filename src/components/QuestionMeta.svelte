<script>
	import { CircleDot } from 'lucide-svelte';
	import { QUESTION_TYPES } from '../data/questionTypes.js';

	/**
	 * @type {{ questionType: import('../data/questionTypes.js').QuestionType, deck: string }}
	 */
	let { questionType, deck } = $props();

	const typeConfig = $derived(
		QUESTION_TYPES[questionType] ?? QUESTION_TYPES.standard,
	);
</script>

<dl class="question-meta">
	<dt><span class="question-meta__title">Type:</span></dt>
	<dd class="question-meta-type">
		<typeConfig.icon />
		<span class="question-meta__value">{typeConfig.label}</span>
	</dd>

	<dt><span class="question-meta__title">Deck:</span></dt>
	<dd>
		<CircleDot />
		<span class="question-meta__value">{deck}</span>
	</dd>
</dl>
