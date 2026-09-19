# Wardrobe configurator — prompt for a separate implementation (paste whole)

Build a standalone wardrobe configurator page that copies the interaction model of
https://tylko.com/pl-pl/furniture/komoda/9281730,j and https://de.mycs.com/regal/XbA8HBdFr ,
driven by the parametric furniture model that already exists in this repo.

## Hard rules

1. **Create only new files under `konfigurator/`.** Never edit an existing file (no `vite.config.ts`,
   no editor sources, no workflows). Reverting the work = deleting that one folder. Say so in your final report.
2. **No build step.** One HTML file + ES modules from pinned CDNs. It must open from a static server at repo root.
3. **Library-first.** Own JavaScript: ≤ 300 lines at stage C, ≤ 450 lines total at stage D. If a feature needs
   more, take a library from the allowlist or drop the feature and say which.
4. **Icons: Lucide only** (the set the editor already uses via `@lucide/vue`), pinned CDN build.
5. Units mm. Code identifiers Polish, UI labels English — same convention as the rest of the repo.
6. Output of the configurator must be **valid furniture JSON v2** (`schemaVersion: 2` with a `parametric` block),
   so the result can later be merged into the editor without a rewrite.

## Facts — do not research these, they are verified

- Repo `stefankot/mieszkanie-meble`, branch `main`. Pages root `https://stefankot.github.io/mieszkanie-meble/`
  serves the whole repo and sends `access-control-allow-origin: *`, so fetching and `import`ing from it works
  from a local page. Raw files: `https://raw.githubusercontent.com/stefankot/mieszkanie-meble/main/<path>`.
- **Take the renderer from GitHub, not from disk.** Renderer page: `renderery/webgpu/mieszkanie-webgpu-v1.html`
  (three.js r185 WebGPU via importmap from jsdelivr; exposes `window.__silnik` with `scene`, `camera`,
  `renderer`, `THREE`, `biblioteka`, `nawigacja`, `oznaczZmiane()`).
- **`renderery/webgpu/parametryczne.js` is the whole engine you need — 172 lines, zero dependencies,
  importable straight into the browser.** Exports:
  - `rozwinParametryczny(p, nadpisania)` → `{parts, mechanics}` in mm, ready for the renderer,
  - `sprawdzParametryczny(p)` → throws on an invalid model (use it as your validator),
  - `rozloz(wnetrze, grubosc, n, opcje)` → shelf/column distribution.
  Overrides shape: `{rows:{count,distribution}, columns:{count,distribution}, instances:{<id>:{count}}}`.
  Distributions: `equal | fibonacci | random | custom` (custom = `"60+40+20"`).
- Example model to start from: `meble/regal-salon/wersje/v0008-parametric.json`. Its `parametric` block:
  `carcass{sizeMm:[3074,2430,423], boardMm:18, backMm:8, material, shelfMaterial}`,
  `layout{rows:{count,distribution}, columns:{count,distribution}}`,
  `definitions{drzwi:{parts:[…], joint:{type:"hinge",…}}}`, `instances[{definition, cells:{count, order}}]`.
  Part sizes may reference a cell: `{"cell":"w","mul":1,"addMm":-4}`.
- Schema reference: `FORMAT-MEBLA-V2.md` (106 lines), validator `renderery/webgpu/furniture-schema-v2.js` (122 lines).
- Run locally with any static server at repo root (e.g. `python3 -m http.server 8000`), open
  `http://localhost:8000/konfigurator/szafa.html`. Do not start the Vite dev server for this.

## Library allowlist (pin every version)

| Need | Use | Why |
|---|---|---|
| Reactivity/state | Alpine.js 3 (CDN) | no build, `x-model` binds every control for free |
| Controls: sliders, tabs, segmented buttons, popover, dialog, color picker, tooltip | Shoelace 2 (web components, CDN) | ready-made and themeable; do not hand-roll these |
| Icons | Lucide (CDN) | same set as the editor |
| Parametric geometry | `parametryczne.js` from Pages | already written and tested |
| 3D (stage D only) | the repo renderer from Pages | already written |

Anything outside this table: ask first in one line, then wait.

## Scope — take these from the two references

Implement (all of it exists in the libraries above or in `parametryczne.js`):

- size: width / height / depth sliders with cm readout, min–max clamped to the model's limits, snapping;
- layout: column count, row count, distribution switch (equal / fibonacci / custom string);
- fronts: per-cell state none / door / drawer, set by clicking a cell in the 2D view (Shoelace popover);
- backs on/off, plinth on/off;
- material swatches read from the model's `materials.definitions` (no texture loading at stage C);
- live price — one visible formula, e.g. board area × rate + per-front rate (put the rates in one object);
- undo / redo / reset (keep a plain array of states — that is the whole undo implementation);
- view switch: **Front** (SVG elevation generated from `rozwinParametryczny` parts) and **3D** (stage D);
- mycs-style step wizard: Size → Layout → Fronts → Material → Summary, plus tylko-style always-visible side panel;
- summary panel: dimensions, cell count, front count, price, **Export JSON** button producing the v2 file.

Out of scope, do not build: cart, checkout, accounts, delivery, AR, PDF, photoreal materials, animations,
shadows, lighting effects. Keep it visually as flat and plain as tylko.com.

## Stages — stop after B and after C and wait for my go

**A. Research — budget: max 10 tool calls, nothing else.**
Read exactly these four: `FORMAT-MEBLA-V2.md`, `renderery/webgpu/parametryczne.js`,
`meble/regal-salon/wersje/v0008-parametric.json`, `renderery/webgpu/furniture-schema-v2.js`.
Open each reference URL at most once and write down only the inventory of controls you see.
If a page does not load, use the scope table above as the spec and move on.
Do not search the repo, do not open other files, do not read `node_modules`.
Output: ≤ 25 lines — control inventory per site, and what maps onto `parametryczne.js` overrides.

**B. Plan — ≤ 30 lines.** A table of files to create (expect exactly one HTML, optionally one JSON preset),
a table of libraries with pinned versions, the control → override mapping, the price formula,
and the list of features you are dropping with the reason. Then stop.

**C. Interactive mockup — one file, runs without the renderer.**
Mock the model as a local constant, real controls, real SVG front view, real state/undo, real export.
No 3D, no network calls to Pages except the CDN libraries and `parametryczne.js`.
Report: what works, what is faked, own line count. Then stop.

**D. Implementation.** Swap the mocked model for the fetched `v0008-parametric.json`, add the 3D view
(renderer in an iframe from Pages, feed it the expanded parts), keep everything else from C.

**E. Verification.** Run through this checklist and report pass/fail per line, with the numbers:
1. `git status` shows changes only inside `konfigurator/`;
2. every slider/toggle changes the front view, and the change is visible in the exported JSON;
3. exported JSON passes `sprawdzParametryczny` and keeps `schemaVersion: 2`;
4. 3D view shows the same column/row/front counts as the front view;
5. own JS line count ≤ 450 (state the number);
6. every icon comes from Lucide;
7. page works after a hard reload with an empty cache;
8. one sentence on how to revert (delete the folder).

## Token discipline

- Code first, prose second. No summaries of what you just read, no repeating the task back to me.
- Never re-read a file you already read; keep the facts in your notes.
- No repo-wide grep, no directory walks, no reading build output.
- Per stage: at most the tool calls listed. If you hit the limit, say so in one line and continue with what you have.
- If something is ambiguous, pick the simpler option, note it in one line, and keep going — ask only if
  proceeding would waste the whole stage.
