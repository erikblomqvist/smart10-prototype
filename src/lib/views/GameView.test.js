import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';

// Mock svelte-i18n
vi.mock('svelte-i18n', () => ({
	_: {
		subscribe: (fn) => {
			fn((key) => key);
			return () => {};
		},
	},
}));

// Mock $lib/game
vi.mock('$lib/game', () => {
	const mockGame = {
		status: 'playing',
		code: 'ABCDE',
		players: [],
		currentPlayer: null,
		currentRound: {
			question: {
				options: [],
			},
		},
		blobStates: [],
		roundIsOver: false,
		undoIsAvailable: false,
		undoableBlobIndex: null,
		canSkipRound: false,
		turnTimerSeconds: null,
		loadGame: vi.fn(),
		passCurrentPlayer: vi.fn(),
		endRound: vi.fn(),
		revealBlob: vi.fn(),
	};
	return {
		game: mockGame,
	};
});

import GameView from './GameView.svelte';
import { game } from '$lib/game';
import { fireEvent } from '@testing-library/dom';

describe('GameView', () => {
	it('renders playing surface when status is playing', () => {
		game.status = 'playing';
		game.currentRound = {
			question: {
				id: 'q1',
				type: 'standard',
				text: 'Question Text',
				options: ['A', 'B'],
				correctAnswers: [true, false],
				answerMedia: [{}, {}],
			},
			answeredBlobs: [],
			lastPlayerId: null,
		};
		game.blobStates = [null, null];

		render(GameView);

		// Check if question text is rendered (part of QuestionWheel inside GamePlayingSurface)
		expect(screen.getByText('Question Text')).toBeTruthy();
	});

	it('calls passCurrentPlayer when pass button is clicked', async () => {
		game.status = 'playing';
		game.roundIsOver = false;
		game.currentRound = {
			question: {
				id: 'q1',
				type: 'standard',
				text: 'Question Text',
				options: ['A', 'B'],
				correctAnswers: [true, false],
				answerMedia: [{}, {}],
			},
			answeredBlobs: [],
			lastPlayerId: null,
		};
		game.blobStates = [null, null];

		render(GameView);

		const passButton = screen.getAllByText('game.pass')[0];

		await fireEvent.click(passButton);

		expect(game.passCurrentPlayer).toHaveBeenCalled();
	});

	it('renders review surface when status is round_review', () => {
		game.status = 'round_review';
		game.players = [
			{
				id: 'p1',
				name: 'Alice',
				roundScore: 5,
				totalScore: 10,
				color: 'player-color-1',
				status: 'active',
			},
		];
		game.currentRound = {
			roundNumber: 1,
			question: { options: [] },
			answeredBlobs: [],
			lastPlayerId: null,
		};

		render(GameView);

		// Check if "standings" is rendered (part of RoundReviewPanel)
		expect(screen.getByText('game.standings')).toBeTruthy();
	});
});

// The iPad kills and reloads the PWA's WebKit process under memory pressure;
// unmount + fresh mount is the component-seam equivalent of that reload.
describe('GameView — pending reveal survives a reload', () => {
	beforeEach(() => {
		cleanup();
		localStorage.clear();
		game.status = 'playing';
		game.code = 'ABCDE';
		game.currentPlayer = null;
		game.currentRound = {
			roundNumber: 3,
			question: {
				id: 'q1',
				type: 'standard',
				text: 'Question Text',
				options: ['Option A', 'Option B'],
				correctAnswers: ['Answer A', 'Answer B'],
				answerMedia: [{}, {}],
			},
			answeredBlobs: [],
			lastPlayerId: null,
		};
		game.blobStates = [null, null];
		game.revealBlob.mockClear();
	});

	function answerDialog() {
		return document.querySelector('dialog.answer-dialog');
	}

	it('reopens the answer dialog on the same blob after a remount', async () => {
		render(GameView);

		// Tap a blob — the reveal is now pending a Correct/Wrong decision
		await fireEvent.click(screen.getAllByLabelText('blob.reveal_aria')[0]);
		expect(answerDialog().open).toBe(true);

		// Simulated process kill + reload
		cleanup();
		render(GameView);

		const dialog = answerDialog();
		expect(dialog.open).toBe(true);
		expect(dialog.querySelector('.answer-dialog__label').textContent).toBe(
			'Option A',
		);
	});

	it('clears the stored reveal once the answer is resolved', async () => {
		render(GameView);
		await fireEvent.click(screen.getAllByLabelText('blob.reveal_aria')[0]);

		cleanup();
		render(GameView);

		await fireEvent.click(screen.getByText('answer_dialog.correct'));
		expect(game.revealBlob).toHaveBeenCalledWith(
			0,
			true,
			expect.anything(),
		);

		// A further remount must not resurrect the dialog
		cleanup();
		render(GameView);
		expect(answerDialog().open).toBe(false);
	});

	it('does not reopen the dialog for a different round', async () => {
		render(GameView);
		await fireEvent.click(screen.getAllByLabelText('blob.reveal_aria')[0]);

		cleanup();
		game.currentRound.roundNumber = 4;
		render(GameView);

		expect(answerDialog().open).toBe(false);
	});
});
