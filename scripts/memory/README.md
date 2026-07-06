# Memory-measurement harness

Drives a real production build of Clever 11 through many rounds and measures
renderer memory each round, to tell a genuine leak apart from normal cache
warm-up. Built to investigate the intermittent white-flash reloads on iPad,
which turned out to be iOS killing the web-app process — **not** an app leak
(see the baseline below).

Nothing here is part of the app. It has its own `package.json`; its
dependencies (Playwright) are installed on demand into `scripts/memory/node_modules`
and never touch the app's dependency graph.

## The trap this harness is designed around

A Playwright `Locator` or `ElementHandle` is a live reference into the page.
**Holding one across rounds pins that element — and its entire detached subtree —
in the renderer heap.** A completely leak-free app then looks like it leaks: DOM
nodes and listeners climb every round, and a heap snapshot shows each round's
old surface tree still retained. In the snapshot those retained nodes hang off a
**`DevTools console`** retainer — that is the tell-tale sign it's the harness,
not the app.

The fix, applied throughout `drive.mjs`: never keep a handle. Every interaction
goes through `page.evaluate(...)` that returns **plain values** (coordinates,
text, booleans), followed by a coordinate-based `page.mouse.click(x, y)`. The
first, handle-based version of this harness reported a ~290-node-per-round
"leak" that vanished entirely once rewritten this way.

## Usage

```bash
cd scripts/memory
bun install                      # first time only; also installs browsers
./run.sh                         # chromium, 15 rounds → CSV on stdout
ENGINE=webkit ROUNDS=20 ./run.sh # the engine that matters for iPad
SKIP_BUILD=1 ./run.sh            # reuse the last build for faster iterations
```

`run.sh` starts the Supabase stub, builds the production bundle with the stub's
URL baked in, serves it with `vite preview`, plays the rounds, and tears
everything down. Env knobs: `ENGINE` (`chromium`|`webkit`), `ROUNDS`, `REVEALS`
(blobs revealed per round, default 3), `APP_PORT`, `SKIP_BUILD`.

> **Node ≥ 26 build note:** `bun run build`'s Vercel-adapter packaging step
> fails on Node 26, but that runs _after_ Vite has written the client bundle,
> which is all `vite preview` serves. `run.sh` tolerates the non-zero exit and
> checks for `.svelte-kit/output/client/_app` instead. On Node 20/22/24 the
> build succeeds outright.

## Files

| File                | Role                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------- |
| `run.sh`            | Orchestrator: stub → build → preview → drive → teardown. Start here.                                    |
| `stub-supabase.mjs` | Bun REST stub. One deck + 150 questions; echoes inserts with ids. Zero writes to the real DB.           |
| `drive.mjs`         | Shared **handle-free** driving: setup state machine + round loop. The trap-avoidance lives here.        |
| `gameloop.mjs`      | The metrics tool. Plays N rounds, prints per-round CSV, ends with a detached-element census (Chromium). |
| `heapchain.mjs`     | Deeper tool: heap-snapshot retainer chains for suspected leaks. Reach for it only if `gameloop` grows.  |

## Reading the output

**Chromium** (`tag,heapUsedMB,nodes,listeners,documents`) reports JS heap and
live counts via CDP. A leak-free run is **flat** — values oscillate within a
narrow band and show no upward trend. The final census lists detached
`HTMLElement`s by tag/class; a healthy run leaves only a small **bounded** set
(Svelte 5 retains exactly one previous surface tree via its internal
`last_propagated_event`, a deliberate Firefox GC workaround — harmless).

**WebKit** (`tag,webProcMB,allProcsMB,domNodes`) has no CDP, so it samples the
WebKit processes' **RSS** via `ps` — closer to what iOS jetsam actually
measures. Expect RSS to **climb then plateau** (cache warm-up), not grow
without bound. A true leak keeps climbing past the plateau.

## Baseline (recorded 2026-07-06)

Production build, viewport 1180×820, DPR 1, revealing 3 blobs/round.

- **Chromium, 15 rounds:** JS heap flat at ~5.1–6.0 MB; nodes oscillate
  ~740–990; listeners steady ~41–43; documents constant at 2. No trend.
- **WebKit, 20 rounds:** content-process RSS rises from ~211 MB and **plateaus
  at ~335 MB** by round ~13 (all processes ~460 → ~570 MB); DOM-node count
  constant at 169. No leak.

Verdict: **no unbounded leak on either engine.** The reloads are iOS process
eviction/jetsam, mitigated app-side by the reload-resilience layer (localStorage
setup draft + pending-reveal restore), not by chasing a leak that isn't there.
Use these numbers as the regression reference: a future run that climbs past the
WebKit plateau or trends upward on Chromium is a real regression.

## Maintenance notes

- **English UI strings.** `drive.mjs`'s step detection matches on English text
  ("Winning score", "Where are you seated?", "Start game", "Next round", "End
  round", "Pass") and the stub deck name "Stub Deck". Playwright defaults to the
  `en-US` locale so the app renders English; if these strings change in
  `src/lib/i18n/en.json`, update the matchers.
- **Fixed stub port.** `PUBLIC_SUPABASE_URL` is baked into the client bundle at
  build time, so the stub port (54321) is fixed in both `stub-supabase.mjs` and
  `run.sh`. Change one, change both, and rebuild.

```

```
