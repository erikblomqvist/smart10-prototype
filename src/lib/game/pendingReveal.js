/**
 * Persists a blob reveal that is still awaiting its Correct/Wrong decision.
 *
 * The reveal is only written to Supabase once the group taps Correct or
 * Wrong, so if iOS kills and reloads the web app's WebKit process while the
 * answer dialog is open, resuming from Supabase would rewind to before the
 * blob was tapped. This localStorage record lets GameView reopen the answer
 * dialog on the same blob after such a reload.
 */

const KEY = 'clever11.pendingReveal';

/**
 * @param {object} pending
 * @param {string} pending.code
 * @param {number} pending.roundNumber
 * @param {number} pending.blobIndex
 */
export function savePendingReveal({ code, roundNumber, blobIndex }) {
	try {
		localStorage.setItem(
			KEY,
			JSON.stringify({ code, roundNumber, blobIndex }),
		);
	} catch {
		// Storage full or unavailable — resilience is best-effort.
	}
}

/**
 * Returns the pending blob index for the given game and round, or null when
 * there is no stored reveal or it belongs to another game/round.
 *
 * @param {object} current
 * @param {string} current.code
 * @param {number} current.roundNumber
 * @returns {number|null}
 */
export function loadPendingReveal({ code, roundNumber }) {
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return null;
		const stored = JSON.parse(raw);
		if (stored?.code !== code || stored?.roundNumber !== roundNumber)
			return null;
		if (typeof stored.blobIndex !== 'number') return null;
		return stored.blobIndex;
	} catch {
		return null;
	}
}

export function clearPendingReveal() {
	try {
		localStorage.removeItem(KEY);
	} catch {
		// Storage unavailable — nothing to clear.
	}
}
