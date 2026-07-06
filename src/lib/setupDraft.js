/**
 * Persists the in-progress Setup flow to localStorage so it survives the
 * page reload iOS forces when it kills the standalone web app's WebKit
 * process (e.g. under memory pressure on older iPads).
 *
 * The draft is cleared when a game is successfully created and when the
 * user backs out of setup; a stale draft expires after MAX_AGE_MS.
 */

const KEY = 'clever11.setupDraft';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * @typedef {{
 *   step: string,
 *   players: object[],
 *   newName: string,
 *   newIcon: string,
 *   newColor: string,
 *   currentSeatingIdx: number,
 *   selectedDeckIds: string[],
 *   timerEnabled: boolean,
 *   timerSeconds: number,
 *   volcanoRumble: boolean,
 *   winScore: number,
 *   startingPlayerIdx: number|null,
 * }} SetupDraft
 */

/** @returns {SetupDraft|null} */
export function loadSetupDraft() {
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return null;
		const draft = JSON.parse(raw);
		if (!draft || typeof draft !== 'object') return null;
		if (
			typeof draft.savedAt !== 'number' ||
			Date.now() - draft.savedAt > MAX_AGE_MS
		)
			return null;
		if (!Array.isArray(draft.players)) return null;
		return draft;
	} catch {
		return null;
	}
}

/** @param {SetupDraft} draft */
export function saveSetupDraft(draft) {
	try {
		localStorage.setItem(
			KEY,
			JSON.stringify({ ...draft, savedAt: Date.now() }),
		);
	} catch {
		// Storage full or unavailable — resilience is best-effort.
	}
}

export function clearSetupDraft() {
	try {
		localStorage.removeItem(KEY);
	} catch {
		// Storage unavailable — nothing to clear.
	}
}
