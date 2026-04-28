<script>
	import { supabase } from '../lib/supabase.js';
	import { QUESTION_TYPES } from '../data/questionTypes.js';
	import {
		createEmptyImportDraft,
		normalizeAnswers,
		normalizeImportDraft,
		toQuestionInsertPayload,
		validateImportDraft,
	} from '../lib/questionImport.js';

	/** @type {{ navigate: (path: string) => void }} */
	let { navigate } = $props();

	/** @type {{ id: string, name: string }[]} */
	let decks = $state([]);
	let deckId = $state('');
	let loading = $state(true);
	let saving = $state(false);
	let error = $state('');
	let items = $state(/** @type {ImportItem[]} */ ([]));

	const typeOptions = Object.entries(QUESTION_TYPES);

	/**
	 * @typedef {{
	 *   id: string,
	 *   fileName: string,
	 *   previewUrl: string,
	 *   status: 'queued'|'extracting'|'ready'|'error'|'saved',
	 *   draft: ReturnType<typeof normalizeImportDraft>,
	 *   errors: string[],
	 *   extractionError: string,
	 *   collapsed: boolean
	 * }} ImportItem
	 */

	$effect(() => {
		loadDecks();
		return () => {
			items.forEach((item) => URL.revokeObjectURL(item.previewUrl));
		};
	});

	async function loadDecks() {
		const { data, error: err } = await supabase.from('decks').select('id, name').order('name');
		if (err) error = err.message;
		decks = data ?? [];
		loading = false;
	}

	/** @param {Event} event */
	async function handleFiles(event) {
		const input = /** @type {HTMLInputElement} */ (event.currentTarget);
		const files = Array.from(input.files ?? []).filter((file) => file.type.startsWith('image/'));
		input.value = '';
		if (files.length === 0) return;

		const newItems = files.map((file, index) => ({
			id: `${Date.now()}-${index}-${file.name}`,
			fileName: file.name,
			previewUrl: URL.createObjectURL(file),
			status: /** @type {ImportItem['status']} */ ('queued'),
			draft: createEmptyImportDraft(),
			errors: [],
			extractionError: '',
			collapsed: false,
		}));

		items = [...newItems, ...items];
		await Promise.all(newItems.map((item, index) => extractFile(item.id, files[index])));
	}

	/**
	 * @param {string} id
	 * @param {File} file
	 */
	async function extractFile(id, file) {
		updateItem(id, (item) => ({ ...item, status: 'extracting', extractionError: '' }));
		try {
			const image = await imageToUploadDataUrl(file);
			const response = await fetch('/api/extract-card', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ image }),
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data?.error ?? 'Extraction failed.');

			const draft = normalizeImportDraft(data);
			updateItem(id, (item) => ({
				...item,
				status: 'ready',
				draft,
				errors: validateImportDraft(draft),
				extractionError: '',
			}));
		} catch (/** @type {any} */ err) {
			updateItem(id, (item) => ({
				...item,
				status: 'error',
				extractionError: err.message ?? 'Extraction failed.',
			}));
		}
	}

	/**
	 * @param {string} id
	 * @param {(item: ImportItem) => ImportItem} updater
	 */
	function updateItem(id, updater) {
		items = items.map((item) => (item.id === id ? updater(item) : item));
	}

	/**
	 * @param {string} id
	 * @param {(draft: ReturnType<typeof normalizeImportDraft>) => void} updater
	 */
	function updateDraft(id, updater) {
		updateItem(id, (item) => {
			const draft = structuredClone(item.draft);
			updater(draft);
			const normalized = normalizeImportDraft(draft);
			return { ...item, draft: normalized, errors: validateImportDraft(normalized) };
		});
	}

	/**
	 * @param {string} id
	 * @param {import('../data/questionTypes.js').QuestionType} type
	 */
	function changeType(id, type) {
		updateDraft(id, (draft) => {
			draft.type = type;
			draft.correct_answers_json = normalizeAnswers(type, draft.correct_answers_json);
		});
	}

	/**
	 * @param {string} id
	 * @param {number} index
	 * @param {unknown} value
	 */
	function setAnswer(id, index, value) {
		updateDraft(id, (draft) => {
			draft.correct_answers_json[index] = value;
		});
	}

	/**
	 * @param {string} id
	 * @param {number} index
	 * @param {string} key
	 * @param {string} value
	 */
	function setColorAnswer(id, index, key, value) {
		updateDraft(id, (draft) => {
			const current = draft.correct_answers_json[index];
			draft.correct_answers_json[index] = {
				text: typeof current === 'object' && current ? current.text ?? '' : '',
				backgroundColor: typeof current === 'object' && current ? current.backgroundColor ?? 'hsl(0 80% 50%)' : 'hsl(0 80% 50%)',
				[key]: value,
			};
		});
	}

	/** @param {string} id */
	function removeItem(id) {
		const item = items.find((candidate) => candidate.id === id);
		if (item) URL.revokeObjectURL(item.previewUrl);
		items = items.filter((candidate) => candidate.id !== id);
	}

	/** @param {string} id */
	function toggleCollapsed(id) {
		updateItem(id, (item) => ({ ...item, collapsed: !item.collapsed }));
	}

	function clearSaved() {
		items.filter((item) => item.status === 'saved').forEach((item) => URL.revokeObjectURL(item.previewUrl));
		items = items.filter((item) => item.status !== 'saved');
	}

	/** @param {ImportItem} item */
	async function saveItem(item) {
		error = '';
		if (!deckId) {
			error = 'Please choose a deck before saving imported questions.';
			return;
		}
		const errors = validateImportDraft(item.draft);
		if (errors.length > 0) {
			updateItem(item.id, (current) => ({ ...current, errors }));
			return;
		}

		saving = true;
		try {
			const payload = toQuestionInsertPayload(item.draft, deckId);
			const { error: err } = await supabase.from('questions').insert(payload);
			if (err) throw err;
			updateItem(item.id, (current) => ({ ...current, status: 'saved', errors: [], collapsed: true }));
		} catch (/** @type {any} */ err) {
			error = err.message ?? 'Failed to save imported question.';
		} finally {
			saving = false;
		}
	}

	async function saveAllReady() {
		for (const item of items) {
			if (item.status === 'ready' && item.errors.length === 0) {
				await saveItem(item);
			}
		}
	}

	/** @param {File} file */
	async function imageToUploadDataUrl(file) {
		try {
			return await resizeImage(file);
		} catch {
			return fileToDataUrl(file);
		}
	}

	/** @param {File} file */
	function resizeImage(file) {
		return new Promise((resolve, reject) => {
			const url = URL.createObjectURL(file);
			const image = new Image();
			image.onload = () => {
				const maxSize = 1600;
				const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
				const canvas = document.createElement('canvas');
				canvas.width = Math.max(1, Math.round(image.width * scale));
				canvas.height = Math.max(1, Math.round(image.height * scale));
				const context = canvas.getContext('2d');
				if (!context) {
					URL.revokeObjectURL(url);
					reject(new Error('Could not prepare image for upload.'));
					return;
				}
				context.drawImage(image, 0, 0, canvas.width, canvas.height);
				URL.revokeObjectURL(url);
				resolve(canvas.toDataURL('image/jpeg', 0.85));
			};
			image.onerror = () => {
				URL.revokeObjectURL(url);
				reject(new Error('Could not read image.'));
			};
			image.src = url;
		});
	}

	/** @param {File} file */
	function fileToDataUrl(file) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(String(reader.result));
			reader.onerror = () => reject(reader.error);
			reader.readAsDataURL(file);
		});
	}

	/** @param {number} value */
	function confidencePercent(value) {
		return `${Math.round(value * 100)}%`;
	}

	/** @param {number} value */
	function confidenceClass(value) {
		return Math.round(value * 100) >= 100 ? 'admin-import-confidence__pill admin-import-confidence__pill--complete' : 'admin-import-confidence__pill';
	}

	const readyToSaveCount = $derived(items.filter((item) => item.status === 'ready' && item.errors.length === 0).length);
	const savedCount = $derived(items.filter((item) => item.status === 'saved').length);
</script>

<div class="admin-page">
	<div class="admin-page__header">
		<button class="admin-back" type="button" onclick={() => navigate('/questions')}>← Questions</button>
		<h1 class="admin-page__title">Import cards</h1>
	</div>

	{#if loading}
		<p class="admin-hint">Loading…</p>
	{:else}
		<div class="admin-import">
			{#if error}<p class="admin-form-error">{error}</p>{/if}

			<section class="admin-import-panel">
				<div class="admin-form-row">
					<label class="admin-label">
						Target deck *
						<select class="admin-select" bind:value={deckId} disabled={saving}>
							<option value="">Choose a deck</option>
							{#each decks as deck}
								<option value={deck.id}>{deck.name}</option>
							{/each}
						</select>
					</label>

					<label class="admin-label">
						Card photos
						<span class="admin-file-upload">
							Upload or take photos
							<input type="file" accept="image/*" capture="environment" multiple onchange={handleFiles} />
						</span>
					</label>
				</div>
				<p class="admin-hint">Add one physical card per image. Each detected card must be reviewed before it is saved.</p>
				<div class="admin-form-actions">
					<button class="admin-btn admin-btn--primary" type="button" onclick={saveAllReady} disabled={!deckId || readyToSaveCount === 0 || saving}>
						{saving ? 'Saving…' : `Save ${readyToSaveCount} ready`}
					</button>
					<button class="admin-btn" type="button" onclick={clearSaved} disabled={savedCount === 0 || saving}>Clear saved</button>
					<button class="admin-btn" type="button" onclick={() => navigate('/questions')} disabled={saving}>Done</button>
				</div>
			</section>

			{#if items.length === 0}
				<p class="admin-hint">No card photos selected yet.</p>
			{:else}
				<div class="admin-import-list">
					{#each items as item}
						<article class="admin-import-card" class:admin-import-card--collapsed={item.status === 'saved' && item.collapsed}>
							<div class="admin-import-card__media">
								<img src={item.previewUrl} alt={`Preview of ${item.fileName}`} />
								<span class="admin-list__badge">{item.status}</span>
								<small>{item.fileName}</small>
							</div>

							<div class="admin-import-card__body">
								{#if item.status === 'extracting' || item.status === 'queued'}
									<p class="admin-hint">Extracting question data…</p>
								{:else if item.status === 'error'}
									<p class="admin-form-error">{item.extractionError}</p>
									<div class="admin-form-actions">
										<button class="admin-btn admin-btn--danger" type="button" onclick={() => removeItem(item.id)}>Discard</button>
									</div>
								{:else if item.status === 'saved' && item.collapsed}
									<div class="admin-import-saved-summary">
										<span class="admin-list__badge" data-type={item.draft.type}>{QUESTION_TYPES[item.draft.type]?.label ?? item.draft.type}</span>
										{#if item.draft.question_number}
											<span class="admin-list__num">#{item.draft.question_number}</span>
										{/if}
										<strong>{item.draft.question_text}</strong>
									</div>
									<div class="admin-form-actions">
										<button class="admin-btn admin-btn--sm" type="button" onclick={() => toggleCollapsed(item.id)}>Expand</button>
										<button class="admin-btn admin-btn--sm admin-btn--danger" type="button" onclick={() => removeItem(item.id)}>Remove</button>
									</div>
								{:else}
									<div class="admin-form-row">
										<label class="admin-label">
											Type *
											<select class="admin-select" value={item.draft.type} onchange={(event) => changeType(item.id, /** @type {import('../data/questionTypes.js').QuestionType} */ (/** @type {HTMLSelectElement} */ (event.currentTarget).value))} disabled={item.status === 'saved' || saving}>
												{#each typeOptions as [key, config]}
													<option value={key}>{config.label}</option>
												{/each}
											</select>
										</label>
										<label class="admin-label admin-import-number">
											Question number
											<input class="admin-input" type="number" value={item.draft.question_number ?? ''} oninput={(event) => updateDraft(item.id, (draft) => { draft.question_number = /** @type {HTMLInputElement} */ (event.currentTarget).value ? Number(/** @type {HTMLInputElement} */ (event.currentTarget).value) : null; })} disabled={item.status === 'saved' || saving} />
										</label>
									</div>

									<label class="admin-label">
										Question text *
										<input class="admin-input" type="text" value={item.draft.question_text} oninput={(event) => updateDraft(item.id, (draft) => { draft.question_text = /** @type {HTMLInputElement} */ (event.currentTarget).value; })} disabled={item.status === 'saved' || saving} />
									</label>

									<div class="admin-import-confidence">
										<span class={confidenceClass(item.draft.confidence.type)}>Type {confidencePercent(item.draft.confidence.type)}</span>
										<span class={confidenceClass(item.draft.confidence.question_text)}>Text {confidencePercent(item.draft.confidence.question_text)}</span>
										<span class={confidenceClass(item.draft.confidence.question_number)}>Number {confidencePercent(item.draft.confidence.question_number)}</span>
										<span class={confidenceClass(item.draft.confidence.options)}>Options {confidencePercent(item.draft.confidence.options)}</span>
										<span class={confidenceClass(item.draft.confidence.correct_answers)}>Answers {confidencePercent(item.draft.confidence.correct_answers)}</span>
									</div>

									{#if item.draft.warnings.length > 0}
										<ul class="admin-import-warnings">
											{#each item.draft.warnings as warning}
												<li>{warning}</li>
											{/each}
										</ul>
									{/if}

									<div class="admin-label">
										Options &amp; correct answers
										<div class="admin-options">
											{#each item.draft.options_json as option, i}
												<div class="admin-option-row">
													<span class="admin-option-num">{i + 1}</span>
													<input class="admin-input admin-option-label" type="text" value={option} placeholder="Option {i + 1}" oninput={(event) => updateDraft(item.id, (draft) => { draft.options_json[i] = /** @type {HTMLInputElement} */ (event.currentTarget).value; })} disabled={item.status === 'saved' || saving} />

													{#if item.draft.type === 'boolean'}
														<label class="admin-toggle-wrap">
															<input type="checkbox" checked={item.draft.correct_answers_json[i]} onchange={(event) => setAnswer(item.id, i, /** @type {HTMLInputElement} */ (event.currentTarget).checked)} disabled={item.status === 'saved' || saving} />
															<span class="admin-toggle" class:admin-toggle--on={item.draft.correct_answers_json[i]}>{item.draft.correct_answers_json[i] ? 'Yes' : 'No'}</span>
														</label>
													{:else if item.draft.type === 'rank'}
														<input class="admin-input admin-option-num-input" type="number" min="1" max="10" value={item.draft.correct_answers_json[i]} oninput={(event) => setAnswer(item.id, i, Number(/** @type {HTMLInputElement} */ (event.currentTarget).value))} disabled={item.status === 'saved' || saving} />
													{:else if item.draft.type === 'numbers'}
														<input class="admin-input admin-option-num-input" type="number" step="any" value={item.draft.correct_answers_json[i]} oninput={(event) => setAnswer(item.id, i, Number(/** @type {HTMLInputElement} */ (event.currentTarget).value))} disabled={item.status === 'saved' || saving} />
													{:else if item.draft.type === 'colors'}
														<input class="admin-input admin-option-answer" type="text" value={item.draft.correct_answers_json[i]?.text ?? ''} placeholder="Color label" oninput={(event) => setColorAnswer(item.id, i, 'text', /** @type {HTMLInputElement} */ (event.currentTarget).value)} disabled={item.status === 'saved' || saving} />
														<input class="admin-input admin-option-answer" type="text" value={item.draft.correct_answers_json[i]?.backgroundColor ?? ''} placeholder="hsl(0 80% 50%)" oninput={(event) => setColorAnswer(item.id, i, 'backgroundColor', /** @type {HTMLInputElement} */ (event.currentTarget).value)} disabled={item.status === 'saved' || saving} />
													{:else}
														<input class="admin-input admin-option-answer" type="text" value={item.draft.correct_answers_json[i]} placeholder="Correct answer" oninput={(event) => setAnswer(item.id, i, /** @type {HTMLInputElement} */ (event.currentTarget).value)} disabled={item.status === 'saved' || saving} />
													{/if}
												</div>
											{/each}
										</div>
									</div>

									{#if item.errors.length > 0}
										<ul class="admin-import-errors">
											{#each item.errors as validationError}
												<li>{validationError}</li>
											{/each}
										</ul>
									{/if}

									<div class="admin-form-actions">
										<button class="admin-btn admin-btn--primary" type="button" onclick={() => saveItem(item)} disabled={item.status === 'saved' || saving}>
											{item.status === 'saved' ? 'Saved' : 'Save question'}
										</button>
										{#if item.status === 'saved'}
											<button class="admin-btn" type="button" onclick={() => toggleCollapsed(item.id)}>Collapse</button>
										{/if}
										<button class="admin-btn admin-btn--danger" type="button" onclick={() => removeItem(item.id)} disabled={saving}>Discard</button>
									</div>
								{/if}
							</div>
						</article>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
