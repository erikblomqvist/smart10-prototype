// Deeper analysis, reach for this only when gameloop.mjs shows growth that
// does NOT plateau. Plays N rounds, takes a heap snapshot, and prints the
// shortest retainer chain (path from a GC root) for detached DOM nodes whose
// class/tag matches TARGET. That chain tells you WHAT is holding the node.
//
// This is the tool that proved the "leak" was the measurement harness itself:
// the chains for detached game-surface nodes led back through a
// "DevTools console" retainer — i.e. a Playwright locator handle, not app code.
// (The one genuine retainer it also surfaced is Svelte 5's internal
// `last_propagated_event`, which pins exactly one previous surface tree.)
//
// Chromium only (needs CDP heap snapshots). Run with extra heap for the parse:
//   BASE=http://localhost:5299 ROUNDS=3 TARGET=question--standard \
//     node --max-old-space-size=8192 heapchain.mjs

import { chromium } from 'playwright';
import { makeHelpers, runSetup, playToReview, advanceRound } from './drive.mjs';

const ROUNDS = Number(process.env.ROUNDS ?? 3);
const TARGET = process.env.TARGET ?? 'question--standard';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
const cdp = await page.context().newCDPSession(page);

const h = makeHelpers(page);
await runSetup(page, h);
for (let round = 1; round <= ROUNDS; round++) {
	await playToReview(page, h, { reveals: 2 });
	if (!(await advanceRound(page, h))) break;
}
console.error(`played ${ROUNDS} rounds, taking heap snapshot...`);

// ---- capture the snapshot (streamed as chunks over CDP) ------------------
await cdp.send('HeapProfiler.enable');
await cdp.send('HeapProfiler.collectGarbage');
const chunks = [];
cdp.on('HeapProfiler.addHeapSnapshotChunk', (e) => chunks.push(e.chunk));
await cdp.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false });
await browser.close();

// ---- parse the flat snapshot format --------------------------------------
const snap = JSON.parse(chunks.join(''));
const meta = snap.snapshot.meta;
const NF = meta.node_fields.length;
const EF = meta.edge_fields.length;
const nodes = snap.nodes;
const edges = snap.edges;
const strings = snap.strings;
const nodeTypes = meta.node_types[0];
const edgeTypes = meta.edge_types[0];
const fi = Object.fromEntries(meta.node_fields.map((f, i) => [f, i]));
const efi = Object.fromEntries(meta.edge_fields.map((f, i) => [f, i]));
const nodeCount = nodes.length / NF;
console.error(`nodes=${nodeCount} edges=${edges.length / EF}`);

// Cumulative first-edge offset per node (edges are stored contiguously).
const firstEdge = new Uint32Array(nodeCount + 1);
for (let i = 0, acc = 0; i < nodeCount; i++) {
	firstEdge[i] = acc;
	acc += nodes[i * NF + fi.edge_count];
	firstEdge[i + 1] = acc;
}

const nodeName = (i) => strings[nodes[i * NF + fi.name]] ?? '?';
const nodeType = (i) => nodeTypes[nodes[i * NF + fi.type]];
const detachedness =
	fi.detachedness != null ? (i) => nodes[i * NF + fi.detachedness] : () => 0;

// BFS from the root (node 0) over non-weak edges, recording each node's
// predecessor so we can reconstruct the shortest retainer chain.
const pred = new Int32Array(nodeCount).fill(-1);
const predEdge = new Int32Array(nodeCount).fill(-1);
const queue = new Uint32Array(nodeCount);
let qh = 0;
let qt = 0;
queue[qt++] = 0;
pred[0] = 0;
while (qh < qt) {
	const n = queue[qh++];
	for (let e = firstEdge[n]; e < firstEdge[n + 1]; e++) {
		const base = e * EF;
		if (edgeTypes[edges[base + efi.type]] === 'weak') continue;
		const to = edges[base + efi.to_node] / NF;
		if (pred[to] === -1) {
			pred[to] = n;
			predEdge[to] = e;
			queue[qt++] = to;
		}
	}
}

// Discovery: show what detached DOM nodes exist, so TARGET can be refined.
const byName = {};
for (let i = 0; i < nodeCount; i++) {
	if (detachedness(i) === 2 || nodeName(i).startsWith('Detached'))
		byName[nodeName(i)] = (byName[nodeName(i)] ?? 0) + 1;
}
console.log('detachedness field present:', fi.detachedness != null);
console.log(
	'top detached node names:',
	Object.entries(byName)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 15),
);

const targets = [];
for (let i = 0; i < nodeCount; i++) {
	if (nodeName(i).includes(TARGET) && detachedness(i) === 2 && pred[i] !== -1)
		targets.push(i);
}
console.log(`\nFound ${targets.length} detached+retained ${TARGET} nodes`);

function edgeLabel(e) {
	const base = e * EF;
	const type = edgeTypes[edges[base + efi.type]];
	const nameOrIndex = edges[base + efi.name_or_index];
	const label =
		type === 'element' || type === 'hidden'
			? `[${nameOrIndex}]`
			: strings[nameOrIndex];
	return `${type}:${label}`;
}

for (const t of targets.slice(0, 4)) {
	console.log(`\n--- retainer chain for ${TARGET} @node ${t} ---`);
	const path = [];
	let cur = t;
	let guard = 0;
	while (cur !== 0 && guard++ < 60) {
		path.push(cur);
		cur = pred[cur];
	}
	path.push(0);
	path.reverse();
	for (let i = 0; i < path.length; i++) {
		const via = i === 0 ? '' : `  --${edgeLabel(predEdge[path[i]])}-->  `;
		console.log(
			`${' '.repeat(i)}${via}${nodeType(path[i])} ${nodeName(path[i])}`,
		);
	}
}
