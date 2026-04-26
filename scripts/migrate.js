/**
 * Smart10 v1 → v2 data migration
 *
 * Usage: bun --env-file=.env.migrate run scripts/migrate.js
 *
 * Required env vars (copy .env.migrate.example to .env.migrate and fill in):
 *   OLD_SUPABASE_URL
 *   OLD_SUPABASE_SECRET_KEY
 *   NEW_SUPABASE_URL
 *   NEW_SUPABASE_SECRET_KEY
 */

import { createClient } from '@supabase/supabase-js';

// ─── Config ──────────────────────────────────────────────────────────────────

const OLD_URL = process.env.OLD_SUPABASE_URL;
const OLD_KEY = process.env.OLD_SUPABASE_SECRET_KEY;
const NEW_URL = process.env.NEW_SUPABASE_URL;
const NEW_KEY = process.env.NEW_SUPABASE_SECRET_KEY;

if (!OLD_URL || !OLD_KEY || !NEW_URL || !NEW_KEY) {
	console.error('Missing env vars. See .env.migrate.example.');
	process.exit(1);
}

const oldDb = createClient(OLD_URL, OLD_KEY);
const newDb = createClient(NEW_URL, NEW_KEY);

// ─── Type mapping ─────────────────────────────────────────────────────────────

const TYPE_MAP = {
	blue: 'standard',
	orange: 'boolean',
	green: 'rank',
	red: 'chooseBetween',
	pink: 'colors',
	yellow: 'numbers',
	purple: 'centuryDecade',
};

// ─── Color name → HSL lookup ─────────────────────────────────────────────────

const COLOR_HSL = {
	// Swedish
	röd: 'hsl(0 80% 50%)',
	orange: 'hsl(25 90% 55%)',
	gul: 'hsl(50 90% 50%)',
	grön: 'hsl(120 60% 40%)',
	turkos: 'hsl(175 70% 45%)',
	blå: 'hsl(220 80% 50%)',
	lila: 'hsl(280 60% 50%)',
	rosa: 'hsl(340 80% 70%)',
	vit: 'hsl(0 0% 95%)',
	svart: 'hsl(0 0% 10%)',
	grå: 'hsl(0 0% 60%)',
	brun: 'hsl(25 50% 35%)',
	beige: 'hsl(40 40% 75%)',
	silver: 'hsl(0 0% 75%)',
	guld: 'hsl(43 90% 55%)',
	// Norwegian
	rød: 'hsl(0 80% 50%)',
	grønn: 'hsl(120 60% 40%)',
	// English
	red: 'hsl(0 80% 50%)',
	yellow: 'hsl(50 90% 50%)',
	green: 'hsl(120 60% 40%)',
	cyan: 'hsl(190 80% 50%)',
	blue: 'hsl(220 80% 50%)',
	purple: 'hsl(280 60% 50%)',
	pink: 'hsl(340 80% 70%)',
	white: 'hsl(0 0% 95%)',
	black: 'hsl(0 0% 10%)',
	gray: 'hsl(0 0% 60%)',
	grey: 'hsl(0 0% 60%)',
	brown: 'hsl(25 50% 35%)',
	gold: 'hsl(43 90% 55%)',
};

function colorNameToHsl(name) {
	return COLOR_HSL[name?.toLowerCase?.().trim()] ?? 'hsl(0 0% 60%)';
}

// ─── Transform helpers ────────────────────────────────────────────────────────

function transformCorrectAnswers(oldType, correctAnswers, answerUrls) {
	const answers = correctAnswers ?? Array(10).fill('');

	if (oldType === 'pink') {
		// answerUrls holds the human-readable label for colors questions
		const labels = answerUrls ?? [];
		return answers.map((colorId, i) => ({
			text: labels[i] || colorId || '',
			backgroundColor: colorNameToHsl(colorId),
		}));
	}

	return answers;
}

function transformMedia(oldType, answerUrls) {
	if (oldType === 'pink') {
		// answer_urls_json stores color labels for pink, not actual URLs — skip it
		return Array(10).fill({});
	}

	const urls = answerUrls ?? [];
	return Array(10).fill(null).map((_, i) => {
		const url = (urls[i] ?? '').trim();
		if (!url) return {};
		if (url.includes('open.spotify.com')) return { spotify_url: url };
		if (url.includes('youtube.com') || url.includes('youtu.be')) return { youtube_url: url };
		return { url };
	});
}

// ─── Migration ────────────────────────────────────────────────────────────────

async function migrateDecks() {
	console.log('Fetching decks from v1…');
	const { data: decks, error } = await oldDb
		.from('decks')
		.select('id, name, description, image_url')
		.order('created_at');
	if (error) throw new Error(`Failed to fetch decks: ${error.message}`);

	console.log(`  Found ${decks.length} decks`);
	if (decks.length === 0) return;

	const rows = decks.map((d) => ({
		id: d.id,
		name: d.name,
		description: d.description ?? null,
		image_url: d.image_url ?? null,
		icon: null,
	}));

	const { error: insertErr } = await newDb.from('decks').upsert(rows, { onConflict: 'id' });
	if (insertErr) throw new Error(`Failed to insert decks: ${insertErr.message}`);
	console.log(`  ✓ Migrated ${rows.length} decks`);
}

async function migrateQuestions() {
	console.log('Fetching questions from v1…');
	const { data: questions, error } = await oldDb
		.from('questions')
		.select('id, deck_id, type, question_text, question_number, options_json, correct_answers_json, answer_urls_json')
		.order('created_at');
	if (error) throw new Error(`Failed to fetch questions: ${error.message}`);

	console.log(`  Found ${questions.length} questions`);
	if (questions.length === 0) return;

	let skipped = 0;
	const rows = [];

	for (const q of questions) {
		const newType = TYPE_MAP[q.type];
		if (!newType) {
			console.warn(`  Skipping question ${q.id}: unknown type "${q.type}"`);
			skipped++;
			continue;
		}

		rows.push({
			id: q.id,
			deck_id: q.deck_id,
			type: newType,
			question_text: q.question_text,
			question_number: q.question_number ?? null,
			options_json: q.options_json ?? [],
			correct_answers_json: transformCorrectAnswers(q.type, q.correct_answers_json, q.answer_urls_json),
			answer_media_json: transformMedia(q.type, q.answer_urls_json),
		});
	}

	// Insert in batches of 100 to stay well within request limits
	const BATCH = 100;
	for (let i = 0; i < rows.length; i += BATCH) {
		const batch = rows.slice(i, i + BATCH);
		const { error: insertErr } = await newDb
			.from('questions')
			.upsert(batch, { onConflict: 'id' });
		if (insertErr) throw new Error(`Failed to insert questions (batch ${i / BATCH + 1}): ${insertErr.message}`);
		process.stdout.write(`\r  ✓ ${Math.min(i + BATCH, rows.length)} / ${rows.length} questions`);
	}
	console.log();

	if (skipped > 0) console.warn(`  ⚠ Skipped ${skipped} questions with unknown types`);
	console.log(`  ✓ Migrated ${rows.length} questions`);
}

async function run() {
	console.log('Smart10 v1 → v2 migration\n');
	try {
		await migrateDecks();
		await migrateQuestions();
		console.log('\nDone!');
	} catch (err) {
		console.error('\nMigration failed:', err.message);
		process.exit(1);
	}
}

run();
