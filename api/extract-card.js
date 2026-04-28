import sharp from 'sharp';

const QUESTION_TYPES = [
	'standard',
	'boolean',
	'rank',
	'chooseBetween',
	'colors',
	'numbers',
	'centuryDecade',
];

const OPTION_IMAGE_LAYOUT = [
	[0.472, 0.265],
	[0.607, 0.329],
	[0.691, 0.415],
	[0.69, 0.555],
	[0.606, 0.635],
	[0.474, 0.694],
	[0.332, 0.663],
	[0.272, 0.551],
	[0.262, 0.433],
	[0.341, 0.312],
];

const schema = {
	type: 'object',
	additionalProperties: false,
	propertyOrdering: [
		'type',
		'question_text',
		'question_number',
		'options_json',
		'correct_answers_json',
		'confidence',
		'warnings',
	],
	required: [
		'type',
		'question_text',
		'question_number',
		'options_json',
		'correct_answers_json',
		'confidence',
		'warnings',
	],
	properties: {
		type: {
			type: 'string',
			enum: QUESTION_TYPES,
			description: 'Detected Smart10 question type.',
		},
		question_text: {
			type: 'string',
			description: 'The main question text printed on the card.',
		},
		question_number: {
			type: ['integer', 'null'],
			description: 'The small printed card number, usually in the bottom-right corner.',
		},
		options_json: {
			type: 'array',
			description: 'The 10 visible answer prompts/options in printed order.',
			minItems: 10,
			maxItems: 10,
			items: { type: 'string' },
		},
		correct_answers_json: {
			type: 'array',
			description: 'The 10 correct answers, one for each option in options_json.',
			minItems: 10,
			maxItems: 10,
			items: {
				anyOf: [
					{ type: 'string' },
					{ type: 'number' },
					{ type: 'boolean' },
					{
						type: 'object',
						additionalProperties: false,
						required: ['text', 'backgroundColor'],
						properties: {
							text: { type: 'string' },
							backgroundColor: { type: 'string' },
						},
					},
				],
			},
		},
		confidence: {
			type: 'object',
			additionalProperties: false,
			propertyOrdering: ['type', 'question_text', 'question_number', 'options', 'correct_answers'],
			required: ['type', 'question_text', 'question_number', 'options', 'correct_answers'],
			properties: {
				type: { type: 'number', minimum: 0, maximum: 1 },
				question_text: { type: 'number', minimum: 0, maximum: 1 },
				question_number: { type: 'number', minimum: 0, maximum: 1 },
				options: { type: 'number', minimum: 0, maximum: 1 },
				correct_answers: { type: 'number', minimum: 0, maximum: 1 },
			},
		},
		warnings: {
			type: 'array',
			items: { type: 'string' },
		},
	},
};

export default async function handler(request, response) {
	if (request.method !== 'POST') {
		response.setHeader('Allow', 'POST');
		response.status(405).json({ error: 'Method not allowed' });
		return;
	}

	const apiKey = process.env.GEMINI_API_KEY;
	if (!apiKey) {
		response.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });
		return;
	}

	try {
		const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
		const image = body?.image;
		if (!isDataUrl(image)) {
			response.status(400).json({ error: 'Expected a JSON body with an image data URL.' });
			return;
		}

		const [draft, optionImages] = await Promise.all([
			extractCard(apiKey, image),
			extractOptionImages(image).catch((error) =>
				createFailedOptionImages(
					error instanceof Error
						? error.message
						: 'Could not extract option images.',
				),
			),
		]);
		response.status(200).json({ ...draft, option_images: optionImages });
	} catch (error) {
		console.error(error);
		response.status(500).json({ error: error instanceof Error ? error.message : 'Failed to extract card.' });
	}
}

/**
 * @param {string} image
 */
export async function extractOptionImages(image) {
	const { data } = parseDataUrl(image);
	const source = Buffer.from(data, 'base64');
	const rotated = await sharp(source).rotate().toBuffer();
	const metadata = await sharp(rotated).metadata();
	const width = metadata.width ?? 0;
	const height = metadata.height ?? 0;
	if (!width || !height) {
		return createFailedOptionImages('Could not read image dimensions.');
	}

	const size = Math.min(width, height);
	const cropWidth = Math.round(size * 0.15);
	const cropHeight = Math.round(size * 0.11);

	return Promise.all(
		Array.from({ length: 10 }, async (_, index) => {
			const [xRatio, yRatio] = OPTION_IMAGE_LAYOUT[index];
			const left = clamp(Math.round(width * xRatio - cropWidth / 2), 0, Math.max(0, width - cropWidth));
			const top = clamp(Math.round(height * yRatio - cropHeight / 2), 0, Math.max(0, height - cropHeight));

			try {
				const buffer = await sharp(rotated)
					.extract({ left, top, width: cropWidth, height: cropHeight })
					.resize({
						width: 384,
						height: 256,
						fit: 'inside',
						withoutEnlargement: true,
					})
					.normalize()
					.flatten({ background: '#ffffff' })
					.webp({ quality: 78, effort: 4 })
					.toBuffer();
				const out = await sharp(buffer).metadata();
				return {
					dataUrl: `data:image/webp;base64,${buffer.toString('base64')}`,
					width: out.width ?? 0,
					height: out.height ?? 0,
					warnings: [],
				};
			} catch (error) {
				return {
					dataUrl: '',
					width: 0,
					height: 0,
					warnings: [
						error instanceof Error
							? error.message
							: `Could not crop option ${index + 1}.`,
					],
				};
			}
		}),
	);
}

/** @param {string} message */
function createFailedOptionImages(message) {
	return Array.from({ length: 10 }, () => ({
		dataUrl: '',
		width: 0,
		height: 0,
		warnings: [message],
	}));
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
function clamp(value, min, max) {
	return Math.max(min, Math.min(max, value));
}

/**
 * @param {string} apiKey
 * @param {string} image
 */
async function extractCard(apiKey, image) {
	const model = process.env.GEMINI_CARD_IMPORT_MODEL || 'gemini-3-flash-preview';
	const { mimeType, data } = parseDataUrl(image);
	const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
		method: 'POST',
		headers: {
			'x-goog-api-key': apiKey,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			contents: [
				{
					role: 'user',
					parts: [
						{
							text: buildPrompt(),
						},
						{
							inlineData: {
								mimeType,
								data,
							},
						},
					],
				},
			],
			generationConfig: {
				temperature: 0.1,
				responseMimeType: 'application/json',
				responseJsonSchema: schema,
			},
		}),
	});

	const json = await geminiResponse.json();
	if (!geminiResponse.ok) {
		throw new Error(json?.error?.message || 'The extraction model request failed.');
	}

	const text = findOutputText(json);
	if (!text) throw new Error('Gemini did not return JSON.');
	return JSON.parse(text);
}

function buildPrompt() {
	return [
		'Extract one Smart10-style physical card into the exact JSON schema.',
		'The app stores every card as one question with exactly 10 option labels and exactly 10 corresponding correct answers.',
		'Detect the question type from the card layout and wording. Use only these type values: standard, boolean, rank, chooseBetween, colors, numbers, centuryDecade.',
		'Put the visible prompt in question_text. Put the small bottom-right card number in question_number, or null if unreadable.',
		'For options_json, return the 10 visible answer prompts in their printed order.',
		'For correct_answers_json, return one answer per option. Use booleans for boolean cards, numbers for rank and numbers cards, strings for standard, chooseBetween, and centuryDecade cards.',
		'For colors, return objects like {"text":"red","backgroundColor":"hsl(0 80% 50%)"}. Estimate HSL from the visible color if needed.',
		'If text is uncertain, make the best attempt and add a concise warning. Never invent extra options.',
	].join('\n');
}

/**
 * @param {unknown} value
 */
function isDataUrl(value) {
	return typeof value === 'string' && /^data:image\/(png|jpe?g|webp|heic|heif);base64,/i.test(value);
}

/**
 * @param {string} dataUrl
 */
function parseDataUrl(dataUrl) {
	const match = dataUrl.match(/^data:(image\/(?:png|jpe?g|webp|heic|heif));base64,(.+)$/i);
	if (!match) throw new Error('Invalid image data URL.');
	return {
		mimeType: match[1].toLowerCase(),
		data: match[2],
	};
}

/**
 * @param {any} json
 */
function findOutputText(json) {
	for (const candidate of json.candidates ?? []) {
		for (const part of candidate.content?.parts ?? []) {
			if (typeof part.text === 'string') return part.text;
		}
	}
	return '';
}
