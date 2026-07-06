import { describe, it, expect, beforeEach } from 'vitest';
import {
	savePendingReveal,
	loadPendingReveal,
	clearPendingReveal,
} from './pendingReveal.js';

const KEY = 'clever11.pendingReveal';

describe('pendingReveal', () => {
	beforeEach(() => localStorage.clear());

	it('round-trips for the same game and round', () => {
		savePendingReveal({ code: 'ABCDE', roundNumber: 3, blobIndex: 7 });
		expect(loadPendingReveal({ code: 'ABCDE', roundNumber: 3 })).toBe(7);
	});

	it('returns null when nothing is saved', () => {
		expect(loadPendingReveal({ code: 'ABCDE', roundNumber: 3 })).toBeNull();
	});

	it('returns null for a different game code', () => {
		savePendingReveal({ code: 'ABCDE', roundNumber: 3, blobIndex: 7 });
		expect(loadPendingReveal({ code: 'ZZZZZ', roundNumber: 3 })).toBeNull();
	});

	it('returns null for a different round', () => {
		savePendingReveal({ code: 'ABCDE', roundNumber: 3, blobIndex: 7 });
		expect(loadPendingReveal({ code: 'ABCDE', roundNumber: 4 })).toBeNull();
	});

	it('returns null for corrupt JSON', () => {
		localStorage.setItem(KEY, '{broken');
		expect(loadPendingReveal({ code: 'ABCDE', roundNumber: 3 })).toBeNull();
	});

	it('returns null for a non-numeric blob index', () => {
		localStorage.setItem(
			KEY,
			JSON.stringify({ code: 'ABCDE', roundNumber: 3, blobIndex: '7' }),
		);
		expect(loadPendingReveal({ code: 'ABCDE', roundNumber: 3 })).toBeNull();
	});

	it('clear removes the stored reveal', () => {
		savePendingReveal({ code: 'ABCDE', roundNumber: 3, blobIndex: 7 });
		clearPendingReveal();
		expect(loadPendingReveal({ code: 'ABCDE', roundNumber: 3 })).toBeNull();
	});
});
