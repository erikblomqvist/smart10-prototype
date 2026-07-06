import { describe, it, expect } from 'vitest';
import {
	getSeatRotationTurns,
	playersShareSeatPosition,
	buildIntroPlayerPath,
} from './useRoundIntro.svelte.js';

/** @returns {{ id: string, seatPosition: number, turnOrder: number, status: string }} */
function makePlayer(id, seatPosition, turnOrder, status = 'active') {
	return { id, seatPosition, turnOrder, status };
}

describe('getSeatRotationTurns', () => {
	it('maps seat position 4 (bottom) to no rotation', () => {
		expect(getSeatRotationTurns(4)).toBe(0);
	});

	it('maps seat position 0 (top) to a half turn', () => {
		expect(getSeatRotationTurns(0)).toBe(0.5);
	});

	it('gives every seat a distinct rotation', () => {
		const rotations = Array.from({ length: 8 }, (_, seat) =>
			getSeatRotationTurns(seat),
		);
		expect(new Set(rotations).size).toBe(8);
	});
});

describe('playersShareSeatPosition', () => {
	it('is true when every player sits in the same seat', () => {
		const players = [
			{ seatPosition: 2 },
			{ seatPosition: 2 },
			{ seatPosition: 2 },
		];
		expect(playersShareSeatPosition(players)).toBe(true);
	});

	it('is false when players occupy different seats', () => {
		const players = [
			{ seatPosition: 0 },
			{ seatPosition: 2 },
			{ seatPosition: 0 },
		];
		expect(playersShareSeatPosition(players)).toBe(false);
	});

	it('is false when only some players share a seat', () => {
		const players = [
			{ seatPosition: 3 },
			{ seatPosition: 3 },
			{ seatPosition: 5 },
		];
		expect(playersShareSeatPosition(players)).toBe(false);
	});

	it('is true for a single player', () => {
		expect(playersShareSeatPosition([{ seatPosition: 1 }])).toBe(true);
	});

	it('is false for an empty path', () => {
		expect(playersShareSeatPosition([])).toBe(false);
	});
});

describe('buildIntroPlayerPath', () => {
	it('orders players clockwise from the starter and lands back on them', () => {
		const players = [
			makePlayer('a', 0, 0),
			makePlayer('b', 1, 1),
			makePlayer('c', 2, 2),
		];
		const path = buildIntroPlayerPath(players, players[1]);
		expect(path.map((p) => p.id)).toEqual(['b', 'c', 'a', 'b']);
	});

	it('excludes removed players from the path', () => {
		const players = [
			makePlayer('a', 0, 0),
			makePlayer('b', -1, 1, 'removed'),
			makePlayer('c', 2, 2),
		];
		const path = buildIntroPlayerPath(players, players[0]);
		expect(path.map((p) => p.id)).toEqual(['a', 'c', 'a']);
	});

	it('reports a shared seat once a removed player is excluded', () => {
		// Everyone still in the game sits in seat 3; a removed player keeps the
		// seat -1 sentinel but must not force the intro to spin.
		const starter = makePlayer('a', 3, 0);
		const players = [
			starter,
			makePlayer('b', 3, 1),
			makePlayer('c', -1, 2, 'removed'),
		];
		const path = buildIntroPlayerPath(players, starter);
		expect(playersShareSeatPosition(path)).toBe(true);
	});

	it('returns an empty path when only the starter remains active', () => {
		const starter = makePlayer('a', 0, 0);
		const players = [starter, makePlayer('b', -1, 1, 'removed')];
		expect(buildIntroPlayerPath(players, starter)).toEqual([]);
	});

	it('returns an empty path when the starter is not among the players', () => {
		const players = [makePlayer('a', 0, 0), makePlayer('b', 1, 1)];
		expect(buildIntroPlayerPath(players, makePlayer('z', 2, 2))).toEqual(
			[],
		);
	});
});
