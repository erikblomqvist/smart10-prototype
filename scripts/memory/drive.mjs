// Shared, HANDLE-FREE driving logic for the memory harness.
//
// THE TRAP THIS AVOIDS: a Playwright `Locator`/`ElementHandle` is a live
// reference into the page. Holding one across rounds pins that element — and
// its whole detached subtree — in the renderer heap, so a leak-free app looks
// like it leaks (the retained nodes show up under a "DevTools console"
// retainer in a heap snapshot). Everything here drives the page through
// `page.evaluate` returning PLAIN VALUES plus coordinate-based `page.mouse`
// clicks, so the harness never keeps a handle to a DOM node.
//
// The setup flow uses view transitions that swallow clicks fired mid-animation,
// so `runSetup` is a state machine: it re-reads the current step every
// iteration and retries until a game surface appears.
//
// FRAGILITY: the step detection matches on English UI strings (from
// src/lib/i18n/en.json — "Winning score", "Where are you seated?", "Start
// game", "Next round", "End round", "Pass") and the stub deck name "Stub Deck".
// Playwright defaults to the en-US locale, so the app renders English. If those
// strings change, update the matchers here.

const asSel = (sel) => (typeof sel === 'string' ? { css: sel } : sel);

/**
 * Build handle-free interaction helpers bound to a page.
 * @param {import('playwright').Page} page
 */
export function makeHelpers(page) {
	// Resolve a selector to a click point IN THE PAGE and return plain numbers.
	// { css } — first match; { css, text } — exact trimmed textContent;
	// { css, contains } — smallest element whose textContent includes the text.
	function locate(sel) {
		return page.evaluate((s) => {
			const els = [...document.querySelectorAll(s.css)];
			let el;
			if (s.text) {
				el = els.find((e) => e.textContent.trim() === s.text);
			} else if (s.contains) {
				const matches = els.filter((e) =>
					e.textContent.includes(s.contains),
				);
				el = matches.sort(
					(a, b) => a.textContent.length - b.textContent.length,
				)[0];
			} else {
				el = els[0];
			}
			if (!el) return null;
			const r = el.getBoundingClientRect();
			if (r.width === 0 && r.height === 0) return null;
			return {
				x: r.x + r.width / 2,
				y: r.y + r.height / 2,
				disabled: el.disabled === true,
			};
		}, asSel(sel));
	}

	async function waitFor(sel, timeout = 12000) {
		const t0 = Date.now();
		while (Date.now() - t0 < timeout) {
			const p = await locate(sel);
			if (p && !p.disabled) return p;
			await page.waitForTimeout(150);
		}
		return null;
	}

	async function click(sel, timeout = 12000) {
		const p = await waitFor(sel, timeout);
		if (!p) {
			await page.screenshot({ path: 'stuck.png' });
			const text = await page.evaluate(() =>
				document.body.innerText.slice(0, 600),
			);
			console.error('# stuck — page text:\n' + text);
			throw new Error('not found: ' + JSON.stringify(sel));
		}
		await page.mouse.click(p.x, p.y);
		return true;
	}

	// Click by coordinates computed in-page, without a persisted handle.
	async function clickComputed(fn) {
		const point = await page.evaluate(fn);
		if (point) await page.mouse.click(point.x, point.y);
		return !!point;
	}

	const dialogOpen = () =>
		page.evaluate(
			() => !!document.querySelector('dialog.answer-dialog')?.open,
		);

	return { locate, waitFor, click, clickComputed, dialogOpen };
}

/**
 * Drive Setup end-to-end for a 2-player game with a win score of 1000 (so the
 * game never finishes mid-run), stopping once the first round's wheel appears.
 * @param {import('playwright').Page} page
 * @param {ReturnType<typeof makeHelpers>} h
 */
export async function runSetup(page, h) {
	await page.goto((process.env.BASE ?? 'http://localhost:5299') + '/setup');
	await page.waitForLoadState('networkidle');
	await page.waitForTimeout(1500);

	for (let tries = 0; tries < 60; tries++) {
		const state = await page.evaluate(() => {
			if (location.pathname.startsWith('/game/')) return { step: 'game' };
			const text = document.body.innerText;
			const names = [
				...document.querySelectorAll("input:not([type='number'])"),
			].map((i) => i.value);
			if (text.includes('Start game')) return { step: 'starting' };
			if (text.includes('Winning score')) {
				const input = document.querySelector('input[type="number"]');
				return { step: 'rules', winScore: input?.value };
			}
			if (text.includes('Stub Deck')) return { step: 'decks' };
			if (text.includes('Where are you seated?'))
				return { step: 'seating' };
			if (document.querySelector('input[placeholder="Player name"]'))
				return { step: 'players', names };
			return { step: 'unknown' };
		});

		if (state.step === 'game') break;

		if (state.step === 'players') {
			const have = state.names.filter(Boolean);
			if (have.includes('Ava') && have.includes('Bo')) {
				await h
					.click({ css: 'button', text: 'Continue' }, 3000)
					.catch(() => {});
			} else {
				const name = have.includes('Ava') ? 'Bo' : 'Ava';
				await h
					.click('input[placeholder="Player name"]', 3000)
					.catch(() => {});
				await page.keyboard.type(name, { delay: 20 });
				await page.waitForTimeout(200);
				await h.clickComputed(() => {
					const btns = [
						...document.querySelectorAll(
							'[aria-label="Add player"]',
						),
					];
					const el = btns[btns.length - 1];
					if (!el || el.disabled) return null;
					const r = el.getBoundingClientRect();
					return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
				});
			}
		} else if (state.step === 'seating') {
			await h.clickComputed(() => {
				const btns = [
					...document.querySelectorAll(
						'.seat-map__btn:not(.seat-map__btn--claimed)',
					),
				];
				const el = btns[btns.length - 1];
				if (!el) return null;
				const r = el.getBoundingClientRect();
				return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
			});
		} else if (state.step === 'decks') {
			await h
				.click(
					{
						css: "button, [role='button'], label, article, li, div",
						contains: 'Stub Deck',
					},
					3000,
				)
				.catch(() => {});
			await page.waitForTimeout(300);
			await h
				.click({ css: 'button', text: 'Continue' }, 3000)
				.catch(() => {});
		} else if (state.step === 'rules') {
			if (state.winScore !== '1000') {
				// Set via the native value setter so Svelte's bind picks it up.
				await page.evaluate(() => {
					const input = document.querySelector(
						'input[type="number"]',
					);
					const setter = Object.getOwnPropertyDescriptor(
						HTMLInputElement.prototype,
						'value',
					).set;
					setter.call(input, '1000');
					input.dispatchEvent(new Event('input', { bubbles: true }));
				});
				await page.waitForTimeout(200);
			}
			await h
				.click({ css: 'button', text: 'Continue' }, 3000)
				.catch(() => {});
		} else if (state.step === 'starting') {
			await h
				.click({ css: 'button', text: 'Start game' }, 3000)
				.catch(() => {});
		}
		await page.waitForTimeout(700);
	}

	if (!(await h.waitFor('.blob[data-answered="false"]', 15000))) {
		await page.screenshot({ path: 'stuck.png' });
		throw new Error('never reached the game');
	}
}

/**
 * Reveal up to `reveals` blobs (answering each correct), then pass both
 * players, leaving the game on Round Review with "Next round" available.
 * @param {import('playwright').Page} page
 * @param {ReturnType<typeof makeHelpers>} h
 */
export async function playToReview(page, h, { reveals = 3 } = {}) {
	for (let i = 0; i < reveals; i++) {
		const blob = await h.locate('.blob[data-answered="false"]');
		if (!blob) break;
		await page.mouse.click(blob.x, blob.y);

		const t0 = Date.now();
		while (!(await h.dialogOpen()) && Date.now() - t0 < 2500)
			await page.waitForTimeout(150);
		if (!(await h.dialogOpen())) {
			// Click swallowed by a streak celebration / interaction lock; retry.
			await page.waitForTimeout(700);
			continue;
		}

		const reveal = await h.locate('.answer-dialog__reveal-btn');
		if (reveal) await page.mouse.click(reveal.x, reveal.y);
		await page.waitForTimeout(150);
		const correct = await h.locate('.answer-dialog__btn--correct');
		if (correct) await page.mouse.click(correct.x, correct.y);

		const t1 = Date.now();
		while ((await h.dialogOpen()) && Date.now() - t1 < 5000)
			await page.waitForTimeout(150);
		await page.waitForTimeout(1300); // ride out the streak celebration
	}

	for (let p = 0; p < 2; p++) {
		const pass = await h.locate({ css: 'button', text: 'Pass' });
		if (!pass) break;
		await page.mouse.click(pass.x, pass.y);
		await page.waitForTimeout(400);
	}

	for (let tries = 0; tries < 20; tries++) {
		if (await h.locate({ css: 'button', text: 'Next round' })) return;
		const end = await h.locate({ css: 'button', text: 'End round' });
		if (end) await page.mouse.click(end.x, end.y);
		await page.waitForTimeout(600);
	}
}

/**
 * Advance from Round Review into the next round's wheel.
 * @param {import('playwright').Page} page
 * @param {ReturnType<typeof makeHelpers>} h
 * @returns {Promise<boolean>} false if the next round never appeared
 */
export async function advanceRound(page, h) {
	await h.click({ css: 'button', text: 'Next round' });
	return !!(await h.waitFor('.blob[data-answered="false"]', 15000));
}
