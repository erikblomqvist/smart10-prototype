import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
	loadSetupDraft,
	saveSetupDraft,
	clearSetupDraft,
} from './setupDraft.js';

const KEY = 'clever11.setupDraft';

const draft = {
	step: 'seating',
	players: [{ id: 'p1', name: 'Alice' }],
	newName: '',
	newIcon: 'Rocket',
	newColor: 'player-color-1',
	currentSeatingIdx: 1,
	selectedDeckIds: ['d1'],
	timerEnabled: true,
	timerSeconds: 30,
	volcanoRumble: false,
	winScore: 50,
	startingPlayerIdx: null,
};

describe('setupDraft', () => {
	beforeEach(() => localStorage.clear());
	afterEach(() => vi.useRealTimers());

	it('round-trips a saved draft', () => {
		saveSetupDraft(draft);
		expect(loadSetupDraft()).toMatchObject(draft);
	});

	it('returns null when nothing is saved', () => {
		expect(loadSetupDraft()).toBeNull();
	});

	it('returns null for corrupt JSON', () => {
		localStorage.setItem(KEY, 'not json{');
		expect(loadSetupDraft()).toBeNull();
	});

	it('returns null for a draft without players', () => {
		localStorage.setItem(
			KEY,
			JSON.stringify({ step: 'players', savedAt: Date.now() }),
		);
		expect(loadSetupDraft()).toBeNull();
	});

	it('expires drafts older than 24 hours', () => {
		vi.useFakeTimers();
		saveSetupDraft(draft);
		vi.advanceTimersByTime(25 * 60 * 60 * 1000);
		expect(loadSetupDraft()).toBeNull();
	});

	it('keeps drafts younger than 24 hours', () => {
		vi.useFakeTimers();
		saveSetupDraft(draft);
		vi.advanceTimersByTime(23 * 60 * 60 * 1000);
		expect(loadSetupDraft()).toMatchObject(draft);
	});

	it('clear removes the draft', () => {
		saveSetupDraft(draft);
		clearSetupDraft();
		expect(loadSetupDraft()).toBeNull();
	});
});
