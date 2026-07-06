// Memory loop: plays N rounds of Clever 11 and samples renderer memory once per
// round, so a leak shows up as monotonic growth that does not plateau. Prints
// CSV to stdout; a leak-free run is flat (Chromium) or plateaus (WebKit RSS).
//
// Usage (normally via run.sh, which builds + serves first):
//   BASE=http://localhost:5299 ENGINE=chromium ROUNDS=15 node gameloop.mjs
//   BASE=http://localhost:5299 ENGINE=webkit   ROUNDS=20 node gameloop.mjs
//
// Env: BASE (server URL), ENGINE (chromium|webkit), ROUNDS, REVEALS (blobs
// revealed per round, default 3).
//
// Chromium reports JS heap + live node/listener/document counts via CDP.
// WebKit has no CDP, so we sample the WebKit processes' RSS via `ps` instead
// (closer to what iOS jetsam actually measures) plus a live DOM-node count.
// The final detached-element census runs on Chromium only.

import { chromium, webkit } from 'playwright';
import { execSync } from 'node:child_process';
import { makeHelpers, runSetup, playToReview, advanceRound } from './drive.mjs';

const BASE = process.env.BASE ?? 'http://localhost:5299';
const ROUNDS = Number(process.env.ROUNDS ?? 15);
const REVEALS = Number(process.env.REVEALS ?? 3);
const ENGINE = process.env.ENGINE ?? 'chromium';

const browser = await (ENGINE === 'webkit' ? webkit : chromium).launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
let cdp = null;
if (ENGINE !== 'webkit') {
	cdp = await page.context().newCDPSession(page);
	await cdp.send('Performance.enable');
}

// Total RSS of the Playwright WebKit processes, split out for the content/web
// process (the one iOS evicts). RSS in MB.
function webkitRss() {
	const out = execSync(
		`ps ax -o rss=,command= | grep 'ms-playwright/webkit-' | grep -v grep || true`,
		{ encoding: 'utf8' },
	);
	const rows = out
		.trim()
		.split('\n')
		.filter(Boolean)
		.map((l) => {
			const m = l.trim().match(/^(\d+)\s+(.*)$/);
			return m ? { rss: Number(m[1]), cmd: m[2] } : null;
		})
		.filter(Boolean);
	const total = rows.reduce((a, r) => a + r.rss, 0);
	const web = rows
		.filter((r) => /WebProcess|WebContent/i.test(r.cmd))
		.reduce((a, r) => a + r.rss, 0);
	return { totalMB: total / 1024, webMB: web / 1024 };
}

async function sample(tag) {
	if (ENGINE === 'webkit') {
		const { totalMB, webMB } = webkitRss();
		const domNodes = await page.evaluate(
			() => document.getElementsByTagName('*').length,
		);
		console.log(
			[tag, webMB.toFixed(1), totalMB.toFixed(1), domNodes].join(','),
		);
		return;
	}
	const { metrics } = await cdp.send('Performance.getMetrics');
	const m = Object.fromEntries(metrics.map((x) => [x.name, x.value]));
	console.log(
		[
			tag,
			(m.JSHeapUsedSize / 1048576).toFixed(1),
			m.Nodes,
			m.JSEventListeners,
			m.Documents,
		].join(','),
	);
}

const h = makeHelpers(page);
await runSetup(page, h);

console.log(
	ENGINE === 'webkit'
		? 'tag,webProcMB,allProcsMB,domNodes'
		: 'tag,heapUsedMB,nodes,listeners,documents',
);
await sample('game-start');

for (let round = 1; round <= ROUNDS; round++) {
	await playToReview(page, h, { reveals: REVEALS });
	await sample('round-' + round);
	if (!(await advanceRound(page, h))) {
		console.error('# stuck after round', round);
		break;
	}
}

// Final detached-element census (Chromium only). This DOES create handles, but
// the run is over. Enumerates every HTMLElement instance in the heap and groups
// the disconnected ones by tag.firstClass — a leak-free run leaves only a small
// bounded set (Svelte 5 retains one previous surface tree via its internal
// last_propagated_event, a deliberate Firefox GC workaround).
if (!cdp) {
	await browser.close();
	process.exit(0);
}
await cdp.send('HeapProfiler.enable').catch(() => {});
await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
const { result: proto } = await cdp.send('Runtime.evaluate', {
	expression: 'HTMLElement.prototype',
});
const { objects } = await cdp.send('Runtime.queryObjects', {
	prototypeObjectId: proto.objectId,
});
const resp = await cdp.send('Runtime.callFunctionOn', {
	objectId: objects.objectId,
	functionDeclaration: `function () {
		const byKey = {}; let attached = 0, detached = 0;
		for (const el of this) {
			try {
				if (el.isConnected) { attached++; continue; }
				detached++;
				const key = el.tagName.toLowerCase() + "." + (el.classList[0] ?? "-");
				byKey[key] = (byKey[key] ?? 0) + 1;
			} catch { /* not a live element */ }
		}
		return JSON.stringify({ attached, detached, byKey });
	}`,
	returnByValue: true,
});
const data = JSON.parse(resp.result.value);
console.log(
	`\n=== final: attached=${data.attached} detached=${data.detached} ===`,
);
for (const [k, n] of Object.entries(data.byKey)
	.sort((a, b) => b[1] - a[1])
	.slice(0, 20))
	console.log(`  ${n}\t${k}`);

await browser.close();
