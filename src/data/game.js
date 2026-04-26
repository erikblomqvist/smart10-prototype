/**
 * null  = unanswered
 * true  = answered correctly
 * false = answered incorrectly
 * @typedef {boolean|null} BlobState
 */

/**
 * @typedef {{
 *   text: string,
 *   backgroundColor: string,
 * }} ColorAnswer
 */

/**
 * @typedef {boolean|string|number|ColorAnswer} CorrectAnswer
 */

/**
 * @typedef {{
 *   type: import('./questionTypes.js').QuestionType,
 *   text: string,
 *   deck: string,
 *   answers: string[],
 *   correctAnswers: CorrectAnswer[],
 *   blobs?: BlobState[],
 * }} Question
 */

/** @type {Record<string, Question>} */
export const questionsByType = {
	boolean: {
		type: 'boolean',
		text: 'Är en originalserie på Netflix?',
		deck: 'Original',
		answers: [
			'Grace and Frankie',
			'The Boys',
			'The Flash',
			'The Witcher',
			'Mad Men',
			'The Walking Dead',
			'The Big Bang Theory',
			'The Office',
			'The Simpsons',
			'Breaking Bad',
		],
		correctAnswers: [
			true,
			false,
			false,
			true,
			false,
			false,
			false,
			false,
			false,
			false,
		],
	},
	standard: {
		type: 'standard',
		text: 'Hemmaarena för vilket lag?',
		deck: 'Original',
		answers: [
			'Emirates Stadium',
			'Stamford Bridge',
			'Old Trafford',
			'Anfield',
			'Santiago Bernabéu',
			'Johan Cruijff Arena',
			'Camp Nou',
			'Parc des Princes',
			'Signal Iduna Park',
			'Stadio San Paolo',
		],
		correctAnswers: [
			'Arsenal',
			'Chelsea',
			'Manchester United',
			'Liverpool',
			'Real Madrid',
			'Ajax',
			'FC Barcelona',
			'Paris Saint-Germain',
			'Borussia Dortmund',
			'SSC Napoli',
		],
	},
	rank: {
		type: 'rank',
		text: 'Skådespelarna i längdordning (1 = längst)',
		deck: 'Original',
		answers: [
			'Will Ferrell',
			'Rowan Atkinson',
			'Danny DeVito',
			'Liam Neeson',
			'Daniel Radcliffe',
			'Robert Pattinson',
			'Leonardo DiCaprio',
			'Samuel L. Jackson',
			'Tom Hardy',
			'Tim Robbins',
		],
		correctAnswers: [3, 7, 10, 2, 9, 5, 6, 4, 8, 1],
	},
	chooseBetween: {
		type: 'chooseBetween',
		text: 'Ett historiskt mynt primärt i guld, silver eller brons?',
		deck: 'Original',
		answers: [
			'romersk as',
			'persisk siglos',
			'romersk follis',
			'florentinsk florin',
			'karolingisk denar',
			'venetiansk dukat',
			'romersk solidus',
			'persisk dareik',
			'atensk tetradrakhma',
			'romersk aureus',
		],
		correctAnswers: [
			'brons',
			'silver',
			'brons',
			'guld',
			'silver',
			'guld',
			'guld',
			'guld',
			'silver',
			'guld',
		],
	},
	colors: {
		type: 'colors',
		text: 'Signaturfärg för…',
		deck: 'Original',
		answers: [
			'Post-it',
			'Mitsubishi',
			'Starbucks',
			'Barbie',
			'ICA',
			'Tiffany & Co',
			'UPS',
			'Milka',
			'Caterpillar',
			'PostNord',
		],
		correctAnswers: [
			{ text: '(kanarie) gul', backgroundColor: 'hsl(52 100% 50%)' },
			{ text: 'röd', backgroundColor: 'hsl(358 86% 43%)' },
			{ text: 'grön', backgroundColor: 'hsl(158 100% 18%)' },
			{ text: 'rosa', backgroundColor: 'hsl(330 100% 71%)' },
			{ text: 'röd', backgroundColor: 'hsl(358 78% 49%)' },
			{ text: '(rödhakeäggs) blå', backgroundColor: 'hsl(174 55% 58%)' },
			{ text: 'brun', backgroundColor: 'hsl(31 48% 26%)' },
			{ text: 'lila', backgroundColor: 'hsl(266 47% 50%)' },
			{ text: 'gul', backgroundColor: 'hsl(48 100% 50%)' },
			{ text: 'blå', backgroundColor: 'hsl(217 100% 36%)' },
		],
	},
	numbers: {
		type: 'numbers',
		text: 'Antalet Oscar',
		deck: 'Original',
		answers: [
			'Titanic',
			'The Hurt Locker',
			'Forrest Gump',
			'Ben Hur',
			'Mitt Afrika',
			'West Side Story',
			'Slumdog Millionaire',
			'The King’s Speech',
			'Borta med vinden',
			'The Artist',
		],
		correctAnswers: [11, 6, 6, 11, 7, 10, 8, 4, 8, 5],
	},
	centuryDecade: {
		type: 'centuryDecade',
		text: 'Årtioendet TV-serien började sändas',
		deck: 'Original',
		answers: [
			'Pippi Långstrump',
			'Svensson, Svensson',
			'Hem till byn',
			'Goda Grannar',
			'Morran & Tobias',
			'Macken',
			'Labyrint',
			'Albert och Herbert',
			'Tre kronor',
			'Solsidan',
		],
		correctAnswers: [
			'1960',
			'1990',
			'1970',
			'1980',
			'2010',
			'1980',
			'2010',
			'1970',
			'1990',
			'2010',
		],
	},
};

/** @type {import('./questionTypes.js').QuestionType[]} */
export const availableQuestionTypes =
	/** @type {import('./questionTypes.js').QuestionType[]} */ (
		Object.keys(questionsByType)
	);

export const players = [
	{ name: 'Alex', state: 'active', score: 7, totalScore: 34 },
	{ name: 'Bea', state: 'passed', score: 4, totalScore: 28 },
	{ name: 'Chris', state: 'incorrect', score: 3, totalScore: 31 },
	{ name: 'Dana', state: 'waiting', score: 9, totalScore: 42 },
];

export const activePlayer = players.find((p) => p.state === 'active');
