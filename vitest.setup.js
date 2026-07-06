// happy-dom v20 exposes window.sessionStorage but not window.localStorage.
// Tests that exercise persistence-across-reload need a working localStorage,
// so install a minimal in-memory shim when it's missing.
if (!globalThis.localStorage) {
	const store = new Map();
	const shim = {
		getItem: (key) =>
			store.has(String(key)) ? store.get(String(key)) : null,
		setItem: (key, value) => void store.set(String(key), String(value)),
		removeItem: (key) => void store.delete(String(key)),
		clear: () => void store.clear(),
		key: (index) => [...store.keys()][index] ?? null,
		get length() {
			return store.size;
		},
	};
	Object.defineProperty(globalThis, 'localStorage', {
		value: shim,
		configurable: true,
	});
	if (typeof window !== 'undefined' && !window.localStorage) {
		Object.defineProperty(window, 'localStorage', {
			value: shim,
			configurable: true,
		});
	}
}
