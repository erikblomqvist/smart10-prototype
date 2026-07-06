// Minimal Supabase REST stub for driving the game entirely offline.
//
// Serves one deck + 150 standard questions and echoes every insert back with a
// generated id, so the full game loop runs against a real production build with
// zero writes to the real database. The URL below is baked into the client
// bundle at build time (PUBLIC_SUPABASE_URL), so the port must stay fixed and
// match run.sh's STUB_PORT.
//
// Run with Bun: `bun stub-supabase.mjs` (uses Bun.serve).

const PORT = 54321;
const QUESTION_COUNT = 150;

const deck = {
	id: 'deck-1',
	name: 'Stub Deck',
	description: 'Load test deck',
	icon: null,
	css: null,
};

const questions = Array.from({ length: QUESTION_COUNT }, (_, i) => ({
	id: `q-${i + 1}`,
	deck_id: 'deck-1',
	type: 'standard',
	question_text: `Stub question number ${i + 1} — which club plays here?`,
	options_json: Array.from(
		{ length: 10 },
		(_, j) => `Option ${i + 1}.${j + 1} with some realistic text`,
	),
	correct_answers_json: Array.from(
		{ length: 10 },
		(_, j) => `Answer ${i + 1}.${j + 1}`,
	),
	answer_media_json: Array.from({ length: 10 }, () => ({})),
	mileage: 0,
	archived_at: null,
	decks: { name: deck.name, icon: null },
}));

let idCounter = 0;
const nextId = () => `stub-${++idCounter}`;

const CORS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
	'Access-Control-Allow-Headers':
		'apikey, authorization, content-type, prefer, x-client-info, accept-profile, content-profile, x-supabase-api-version',
};

const json = (body, status = 200) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json', ...CORS },
	});

Bun.serve({
	port: PORT,
	async fetch(req) {
		const url = new URL(req.url);
		if (req.method === 'OPTIONS')
			return new Response(null, { status: 204, headers: CORS });

		const table = url.pathname.replace(/^\/rest\/v1\//, '');
		// PostgREST asks for a single object via the Accept header when the
		// client calls `.single()`/`.maybeSingle()`.
		const wantsObject = (req.headers.get('accept') ?? '').includes(
			'pgrst.object',
		);

		if (req.method === 'GET') {
			if (table === 'decks') return json([deck]);
			if (table === 'questions') return json(questions);
			return json(wantsObject ? {} : []);
		}
		if (req.method === 'POST') {
			const body = await req.json().catch(() => ({}));
			const withId = (row) => ({ id: nextId(), ...row });
			const result = Array.isArray(body)
				? body.map(withId)
				: withId(body);
			return json(Array.isArray(result) ? result : [result]);
		}
		// PATCH / DELETE / upsert — acknowledge without persisting.
		return json(wantsObject ? {} : []);
	},
});

console.log(`stub supabase listening on http://127.0.0.1:${PORT}`);
