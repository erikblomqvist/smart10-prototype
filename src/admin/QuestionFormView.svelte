<script>
	import { supabase } from '../lib/supabase.js';

	/** @type {{ id: string|null, navigate: (path: string) => void }} */
	let { id, navigate } = $props();

	const isEdit = $derived(id !== null);
	const NUM_BLOBS = 10;

	// --- Form state ---
	let deckId = $state('');
	let type = $state(/** @type {import('../data/questionTypes.js').QuestionType} */ ('standard'));
	let questionText = $state('');
	let questionNumber = $state(/** @type {number|''} */ (''));
	let options = $state(/** @type {string[]} */ (Array(NUM_BLOBS).fill('')));
	// correctAnswers: type-specific values
	let correctAnswers = $state(/** @type {any[]} */ (Array(NUM_BLOBS).fill('')));
	// For colors: per-blob HSL state
	let colorHsl = $state(
		Array(NUM_BLOBS).fill(null).map(() => ({ h: 0, s: 80, l: 50 })),
	);
	// Media per blob: { url, spotify_url, youtube_url }
	let media = $state(
		Array(NUM_BLOBS).fill(null).map(() => ({ url: '', spotify_url: '', youtube_url: '' })),
	);

	/** @type {{ id: string, name: string }[]} */
	let decks = $state([]);
	let loading = $state(true);
	let saving = $state(false);
	let error = $state('');

	// Reset correct answers when type changes (only on user-initiated change)
	let prevType = type;
	$effect(() => {
		if (type !== prevType) {
			correctAnswers = initCorrectAnswers(type);
			prevType = type;
		}
	});

	$effect(() => {
		loadDecks();
		if (isEdit && id) loadQuestion(id);
		else loading = false;
	});

	async function loadDecks() {
		const { data } = await supabase.from('decks').select('id, name').order('name');
		decks = data ?? [];
	}

	/** @param {import('../data/questionTypes.js').QuestionType} t */
	function initCorrectAnswers(t) {
		if (t === 'boolean') return Array(NUM_BLOBS).fill(false);
		if (t === 'rank' || t === 'numbers') return Array(NUM_BLOBS).fill(0);
		return Array(NUM_BLOBS).fill('');
	}

	async function loadQuestion(/** @type {string} */ qId) {
		const { data, error: err } = await supabase
			.from('questions')
			.select('*')
			.eq('id', qId)
			.single();
		if (err) { error = 'Failed to load question.'; loading = false; return; }

		deckId = data.deck_id;
		type = data.type;
		prevType = data.type;
		questionText = data.question_text;
		questionNumber = data.question_number ?? '';
		options = data.options_json ?? Array(NUM_BLOBS).fill('');

		const loaded = data.correct_answers_json ?? Array(NUM_BLOBS).fill('');
		correctAnswers = loaded;

		// For colors: unpack stored { text, backgroundColor } into colorHsl + correctAnswers[i].text
		if (data.type === 'colors') {
			colorHsl = loaded.map((/** @type {any} */ ca) => {
				const match = (ca?.backgroundColor ?? '').match(/hsl\((\d+)\s+(\d+)%\s+(\d+)%\)/);
				return match
					? { h: +match[1], s: +match[2], l: +match[3] }
					: { h: 0, s: 80, l: 50 };
			});
		}

		const loadedMedia = data.answer_media_json ?? Array(NUM_BLOBS).fill(null);
		media = loadedMedia.map((/** @type {any} */ m) => ({
			url: m?.url ?? '',
			spotify_url: m?.spotify_url ?? '',
			youtube_url: m?.youtube_url ?? '',
		}));

		loading = false;
	}

	/** @param {number} i */
	function colorToBg(i) {
		const { h, s, l } = colorHsl[i];
		return `hsl(${h} ${s}% ${l}%)`;
	}

	/** @param {number} i */
	function syncColorAnswer(i) {
		const text = typeof correctAnswers[i] === 'object' ? correctAnswers[i]?.text ?? '' : correctAnswers[i] ?? '';
		const backgroundColor = colorToBg(i);
		correctAnswers[i] = { text, backgroundColor };
	}

	/** @param {number} i @param {string} text */
	function setColorText(i, text) {
		correctAnswers[i] = { text, backgroundColor: colorToBg(i) };
	}

	async function handleSubmit(/** @type {SubmitEvent} */ e) {
		e.preventDefault();
		error = '';
		if (!deckId) { error = 'Please select a deck.'; return; }
		if (!questionText.trim()) { error = 'Question text is required.'; return; }
		if (options.some((o) => !o.trim())) { error = 'All 10 options must be filled in.'; return; }

		// Serialize correct answers for colors
		const finalAnswers = type === 'colors'
			? correctAnswers.map((ca, i) => ({
					text: (typeof ca === 'object' ? ca?.text : ca) ?? '',
					backgroundColor: colorToBg(i),
				}))
			: correctAnswers;

		const finalMedia = media.map((m) => ({
			...(m.url ? { url: m.url } : {}),
			...(m.spotify_url ? { spotify_url: m.spotify_url } : {}),
			...(m.youtube_url ? { youtube_url: m.youtube_url } : {}),
		}));

		const payload = {
			deck_id: deckId,
			type,
			question_text: questionText.trim(),
			question_number: questionNumber !== '' ? Number(questionNumber) : null,
			options_json: options,
			correct_answers_json: finalAnswers,
			answer_media_json: finalMedia,
		};

		saving = true;
		try {
			if (isEdit && id) {
				const { error: err } = await supabase.from('questions').update(payload).eq('id', id);
				if (err) throw err;
			} else {
				const { error: err } = await supabase.from('questions').insert(payload);
				if (err) throw err;
			}
			navigate('/questions');
		} catch (/** @type {any} */ err) {
			error = err.message ?? 'Failed to save.';
			saving = false;
		}
	}

	const TYPE_OPTIONS = [
		{ value: 'standard', label: 'Standard' },
		{ value: 'boolean', label: 'Boolean (Yes / No)' },
		{ value: 'rank', label: 'Rank (1–10)' },
		{ value: 'chooseBetween', label: 'Choose between' },
		{ value: 'colors', label: 'Colors' },
		{ value: 'numbers', label: 'Numbers' },
		{ value: 'centuryDecade', label: 'Century / Decade' },
	];
</script>

<div class="admin-page">
	<div class="admin-page__header">
		<button class="admin-back" type="button" onclick={() => navigate('/questions')}>← Questions</button>
		<h1 class="admin-page__title">{isEdit ? 'Edit question' : 'New question'}</h1>
	</div>

	{#if loading}
		<p class="admin-hint">Loading…</p>
	{:else}
		<form class="admin-form admin-form--wide" onsubmit={handleSubmit}>
			{#if error}<p class="admin-form-error">{error}</p>{/if}

			<div class="admin-form-row">
				<label class="admin-label">
					Deck *
					<select class="admin-select" bind:value={deckId} required disabled={saving}>
						<option value="">Choose a deck</option>
						{#each decks as deck}
							<option value={deck.id}>{deck.name}</option>
						{/each}
					</select>
				</label>
				<label class="admin-label">
					Type *
					<select class="admin-select" bind:value={type} disabled={saving}>
						{#each TYPE_OPTIONS as opt}
							<option value={opt.value}>{opt.label}</option>
						{/each}
					</select>
				</label>
			</div>

			<label class="admin-label">
				Question text *
				<input class="admin-input" type="text" bind:value={questionText} required disabled={saving} placeholder="Write the question" />
			</label>

			<label class="admin-label" style="max-width:200px">
				Question number
				<input class="admin-input" type="number" bind:value={questionNumber} disabled={saving} placeholder="Optional" />
			</label>

			<!-- Options + correct answers grid -->
			<div class="admin-label">
				Options &amp; correct answers
				<div class="admin-options">
					{#each options as _, i}
						<div class="admin-option-row">
							<span class="admin-option-num">{i + 1}</span>

							<!-- Option label -->
							<input
								class="admin-input admin-option-label"
								type="text"
								bind:value={options[i]}
								placeholder="Option {i + 1}"
								required
								disabled={saving}
							/>

							<!-- Correct answer — type-specific -->
							{#if type === 'standard'}
								<input class="admin-input admin-option-answer" type="text" bind:value={correctAnswers[i]} placeholder="Correct answer" disabled={saving} />
								<input class="admin-input admin-option-url" type="url" bind:value={media[i].url} placeholder="URL" disabled={saving} />
								<input class="admin-input admin-option-url" type="url" bind:value={media[i].spotify_url} placeholder="Spotify URL" disabled={saving} />
								<input class="admin-input admin-option-url" type="url" bind:value={media[i].youtube_url} placeholder="YouTube URL" disabled={saving} />

							{:else if type === 'boolean'}
								<label class="admin-toggle-wrap">
									<input type="checkbox" bind:checked={correctAnswers[i]} disabled={saving} />
									<span class="admin-toggle" class:admin-toggle--on={correctAnswers[i]}>{correctAnswers[i] ? 'Yes' : 'No'}</span>
								</label>
								<input class="admin-input admin-option-url" type="url" bind:value={media[i].url} placeholder="URL" disabled={saving} />

							{:else if type === 'rank'}
								<input class="admin-input admin-option-num-input" type="number" min="1" max="10" bind:value={correctAnswers[i]} placeholder="1–10" disabled={saving} />
								<input class="admin-input admin-option-url" type="url" bind:value={media[i].url} placeholder="URL" disabled={saving} />

							{:else if type === 'chooseBetween'}
								<input class="admin-input admin-option-answer" type="text" bind:value={correctAnswers[i]} placeholder="Correct choice" disabled={saving} />
								<input class="admin-input admin-option-url" type="url" bind:value={media[i].url} placeholder="URL" disabled={saving} />

							{:else if type === 'colors'}
								<div class="admin-color-picker">
									<span class="admin-color-swatch" style="background:{colorToBg(i)}"></span>
									<label class="admin-color-slider">
										H
										<input type="range" min="0" max="360"
											value={colorHsl[i].h}
											oninput={(e) => { colorHsl[i].h = +/** @type {HTMLInputElement} */ (e.target).value; syncColorAnswer(i); }}
											disabled={saving}
										/>
										<span>{colorHsl[i].h}</span>
									</label>
									<label class="admin-color-slider">
										S
										<input type="range" min="0" max="100"
											value={colorHsl[i].s}
											oninput={(e) => { colorHsl[i].s = +/** @type {HTMLInputElement} */ (e.target).value; syncColorAnswer(i); }}
											disabled={saving}
										/>
										<span>{colorHsl[i].s}%</span>
									</label>
									<label class="admin-color-slider">
										L
										<input type="range" min="0" max="100"
											value={colorHsl[i].l}
											oninput={(e) => { colorHsl[i].l = +/** @type {HTMLInputElement} */ (e.target).value; syncColorAnswer(i); }}
											disabled={saving}
										/>
										<span>{colorHsl[i].l}%</span>
									</label>
								</div>
								<input
									class="admin-input admin-option-answer"
									type="text"
									value={typeof correctAnswers[i] === 'object' ? correctAnswers[i]?.text ?? '' : correctAnswers[i] ?? ''}
									oninput={(e) => setColorText(i, /** @type {HTMLInputElement} */ (e.target).value)}
									placeholder="Color label (e.g. 'röd')"
									disabled={saving}
								/>
								<input class="admin-input admin-option-url" type="url" bind:value={media[i].url} placeholder="URL" disabled={saving} />

							{:else if type === 'numbers'}
								<input class="admin-input admin-option-num-input" type="number" step="any" bind:value={correctAnswers[i]} placeholder="Number" disabled={saving} />
								<input class="admin-input admin-option-url" type="url" bind:value={media[i].url} placeholder="URL" disabled={saving} />

							{:else if type === 'centuryDecade'}
								<input class="admin-input admin-option-answer" type="text" bind:value={correctAnswers[i]} placeholder="e.g. 1960" disabled={saving} />
								<input class="admin-input admin-option-url" type="url" bind:value={media[i].url} placeholder="URL" disabled={saving} />
							{/if}
						</div>
					{/each}
				</div>
			</div>

			<div class="admin-form-actions">
				<button class="admin-btn admin-btn--primary" type="submit" disabled={saving}>
					{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create question'}
				</button>
				<button class="admin-btn" type="button" onclick={() => navigate('/questions')} disabled={saving}>Cancel</button>
			</div>
		</form>
	{/if}
</div>
