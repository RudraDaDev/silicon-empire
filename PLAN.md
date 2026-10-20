# SILICON EMPIRE — Build Plan

**Status:** plan / pre-code. Nothing here is implemented yet.
**Branch:** `arena/1cf6c425-silicon-empire`
**Source research:** `SILICON_EMPIRE_COMPLETE.md` (8k words of real 1990–2026 specs, fab economics, market math, rival profiles)

---

## 0. Decisions locked

| Decision | Choice | Why |
|---|---|---|
| Render target | Browser, desktop-first, keyboard+mouse | Dense dashboards. Mobile later, not now. |
| Language | **Plain JS + ES modules. No build step.** | Serves from any static host; `file://` breaks module imports, so a static server is required. |
| UI kit | **csui.js (vendored, pinned)** | Zero deps, 3,406 lines, has Table/Tabs/Slider/Modal/Toast/Svg/Canvas. Removes ~2,000 lines of chrome from our critical path. |
| Sim | **Pure JS, zero DOM imports** | Runs in Node for balance testing. This is the most valuable property in the repo. |
| Charts | SVG for the tech tree, Canvas 2D for wafer map + time series | csui ships both. |
| Save | `localStorage`, versioned, with export/import to file | Survives tab close; export protects against cleared storage. |
| Naming | **~132 brands, 85% real-analogue off-names (Imtel, AMB, Nivida, Pomelo, Snapmo), 15% fictional.** Real dated tech events. | See `design/BRANDS.md`. Trademark-safer than real names, still historically legible. |
| Scope | **Every tech product except medical and AI** — **175 products, 174 sellable** — variants are gated specs, not catalogue entries. Each designable, manufacturable and sellable, *and* consumable as an input to anything that contains it | See `design/DOMAINS.md`. Flat catalogue + containment graph + per-product **sell-or-consume** split. No tiers, no ladder. |
| Visual language | **Warm dark, informal/editorial** — serif + mono, 2px rules, hard shadows. Blueprint layer for technical surfaces. | See `design/styleguide.html`. Distinctive, cheap to build, no art assets. |

**Rejected:** JSX, htm, Preact, React, Phaser, Pixi, Three. None are needed by a text-and-tables game, and the sim/view split means any of them can be added later behind one module boundary if a surface actually demands it.

---

## 1. Non-negotiables

These four rules prevent 90% of the ways this project could go wrong. They are not style preferences.

**R1 — `src/sim/**` never imports `src/ui/**` or `vendor/csui.js`.**
csui throws `ReferenceError: window is not defined` in Node (top-level `window.addEventListener` at line 1557), and more importantly, the sim must be runnable headless. Enforced by a `npm test` check that greps sim files for forbidden imports.

**R2 — Build the DOM once; mutate on tick.**
csui has no diffing: every class creates its node in the constructor. Rebuilding a screen every tick would reset scroll, drop input focus, and re-create canvases. So: screens are built once at mount, return a bag of element references, and each tick writes into them.

**R3 — One screen owns one root, and `destroy()` actually tears down.**
csui's `element.destroy()` only fires registered callbacks — it does **not** remove the node. Screens get an explicit teardown that removes the root element, drops listeners, and clears the named-container registry (`containersByName` warns and overwrites when a name is reused across screens).

**R4 — Sim state is serializable plain data.**
No class instances, no DOM handles, no functions in state. Every save is `JSON.stringify(state)`. This keeps saves portable and makes state diffs readable during debugging.

---

## 2. Folder layout

```
silicon-empire/
├── index.html                 # single page, loads src/main.js as a module
├── PLAN.md                    # this file
├── README.md
├── VENDOR.md                  # csui commit SHA + local patches, listed explicitly
├── vendor/
│   └── csui.js                # pinned copy. NEVER edited except for the log-gate patch below.
├── design/                    # reference docs (not shipped)
│   ├── styleguide.html        # visual reference: tokens, parts, designer mock
│   ├── DOMAINS.md             # product graph, OS, channels (narrative taxonomy)
│   ├── PRODUCTS.md            # 175 products, each with its variant axis + era
│   └── BRANDS.md              # naming rules + 132-brand roster
├── src/
│   ├── main.js                # boot: create app shell, load save, start clock
│   ├── sim/
│   │   ├── rng.js             # mulberry32 seeded PRNG, state-carrying
│   │   ├── state.js           # newGame(seed) -> state; nothing mutates globals
│   │   ├── tick.js            # advance(state, weeks) -> {state, log[]}
│   │   ├── market.js          # demand, share, S-curves, price sensitivity
│   │   ├── product.js         # generic product instance: inputs → specs → cost → quality
│   │   ├── design.js          # die area, perf score, BOM, thermal risk
│   │   ├── interfaces.js      # slot/interface compatibility checks
│   │   ├── os.js              # licence models, ecosystem network effect
│   │   ├── fab.js             # yield curves, wafer capacity, unit cost
│   │   ├── finance.js         # P&L, cash, debt, valuation
│   │   ├── rivals.js          # personality-driven quarterly decisions
│   │   ├── events.js          # date-gated historical + procedural event bus
│   │   └── reviews.js         # transparent review scoring with breakdown
│   ├── data/
│   │   ├── schema/            # one JSON Schema for all products — boot refuses invalid data
│   │   ├── catalog/           # 109 product definitions (DOMAINS.md §2–3)
│   │   ├── process-nodes.json # 1990→2026 nodes, D0 curves, capex
│   │   ├── tech-tree.json     # nodes: cost, prereqs, earliestYear, effects
│   │   ├── brands.json        # ~132 brands, personalities, traits, gates
│   │   ├── interfaces.json    # DDR/PCIe/USB-PD/socket generations
│   │   ├── os.json            # OS products, licence models, ecosystems
│   │   ├── events.json        # seeded historical events with conditions
│   │   └── market-segments.json
│   ├── ui/
│   │   ├── shell.js           # header, global HUD (cash/RP), toast host
│   │   ├── hud.js             # persistent cash + research-point readouts (§5d)
│   │   ├── binder.js          # ~60-line build-once/mutate helper (§5)
│   │   ├── fmt.js             # money/short-number/percent/delta formatting
│   │   ├── csui-ext.js        # our additions: tooltip, sparkline, sortable table
│   │   └── screens/
│   │       ├── home.js        # MAIN SCREEN / SPIKE — built first (§5d)
│   │       ├── diorama.js     # centre illustration states + fill animation
│   │       ├── sidebar.js     # device taskbar: clock, battery, nav
│   │       ├── catalog.js     # product-category picker, generated from data
│   │       ├── design.js
│   │       ├── lab.js         # tech tree (SVG)
│   │       ├── fab.js         # includes wafer map (Canvas)
│   │       ├── market.js
│   │       ├── finance.js
│   │       └── news.js
│   ├── styles/
│   │   ├── tokens.css         # CSS custom properties (design/styleguide.html §01)
│   │   ├── base.css           # reset, type scale, utilities
│   │   └── components.css     # card, pill, tab, stat, table, blueprint
│   └── persist/
│       ├── save.js            # versioned localStorage, migrate(), export/import
│       └── log.js             # event log ring buffer for the News screen
├── tools/
│   └── balance.mjs            # node tools/balance.mjs --runs 500 --years 40
└── tests/
    ├── sim.test.mjs           # determinism, invariants, regression snapshots
    └── no-dom-leak.test.mjs   # enforces R1
```

No `package.json` needed to run. Add one only for `npm test` convenience (`node --test`) — no bundler, no dependencies.

---

## 3. Simulation contract

### Time
- **1 tick = 1 week.** 52 ticks/year. Quarter boundaries at weeks 13/26/39/52 for financials and rival decisions.
- The clock is *not* in the UI. `main.js` owns a `setInterval` that calls `advance(state, 1)` and passes the result to the view. Speed controls change the interval; they never change tick semantics.
- Pause is a UI concept. The sim has no concept of "running".

### Entry points (the entire public API)
```js
newGame({ seed, startYear: 1990, playerName })   // -> state
advance(state, weeks)                            // -> { state, log }   pure; input untouched
serialize(state) / deserialize(json)              // -> string / state
```

`advance` must be pure: deep-clone or structurally share, never mutate the argument. Tests assert `JSON.stringify(before) === JSON.stringify(after)` for the input.

### Determinism
- Single `rng` object carried in state: `{ s: uint32 }`. Advance via mulberry32, mutating only the *new* state's copy.
- Every random draw goes through `rng(state)`. **No `Math.random()` anywhere in `src/sim/`** (test-enforced by grep).
- Same seed + same player actions ⇒ byte-identical state after N ticks. There is a golden-file test for this.
- Rival AI draws from a *separate* stream (`rngAI`) so a player UI change can't perturb rival behaviour.

### State shape (abridged)
```js
{
  meta: { version: 1, seed: 1234567, tick: 0, startYear: 1990 },
  rng: { s: 1234567 }, rngAI: { s: 998877 },
  player: {
    name, cash, debt, valuation, brand, prestige,
    reputation: { consumer: 50, enterprise: 50, enthusiast: 50 },
    staff: { engineers, designers, marketers, morale },
    stock: { ipo: false, price: 0, shares: 0 },
    lapsed: 0   // reputation decay counter
  },
  products: [ /* instances of designs, with lifecycle stage */ ],
  projects: [ /* in-flight R&D with progress, team, spend */ ],
  fabs: [ /* node, capacityWafers, yield, age */ ],
  research: { points, unlocked: [], active: [] },
  rivals: [ /* id, personality, cash, portfolio, share */ ],
  market: { segments: [ /* size, growth, priceSensitivity, shareByCompany */ ] },
  log: [ /* { tick, kind, text, severity } */ ]
}
```

### Formulas — sourced from the research doc
| System | Formula | Notes |
|---|---|---|
| Yield | `Y = exp(-D0 × A_cm2)` | D0 from node + `age` ramp table, not a constant |
| Good dies/wafer | `floor(70690 / die_mm2) × Y × 0.92` | 300 mm wafer, 8% edge loss |
| Unit cost | `wafer_cost / good_dies + packaging + test` | Makes yield visible in the BOM |
| Adoption | `max / (1 + exp(-k(t - t0)))` | Per technology, seeded at unlock |
| Attrition | `0.05 × (1 - morale/100)^2` monthly | From doc §7 |
| Salary | `3000 + 2 × Σskill²` | Skill scale 0–1000 |
| Review | 4 weighted components, each shown to the player | Never show one opaque number |
| Stock | `eps_yield + growth + sentiment + noise` | Noise `normal(0, 0.02)` daily, weekly in sim |

### Balance tool
`node tools/balance.mjs --runs 500 --years 40` runs headless games with a scripted "reasonable player" policy and prints distributions: cash at year 10/20/30, bankruptcies, market share spread, time-to-first-profitable-product. **Gate: no policy should go bankrupt before 1995, and none should own >60% share by 2010.** That's the guard against the "1993 is unwinnable" failure mode.

---

## 4. Data layer

Everything date-gated. Hard rule: **no component may appear before `earliestYear`**, and the UI shows `Available 2004` instead of hiding it — the research doc calls anachronism the #1 complaint against PC Tycoon 2.

`process-nodes.json` entry:
```json
{
  "id": "n250", "year": 1997, "label": "250 nm",
  "nodeClass": "planar",
  "d0Mature": 0.06, "d0Ramp": 0.22, "d0ImprovePerYear": 0.30,
  "waferCost": 1800,
  "fabCapex": 1.8e9, "fabBuildMonths": 18,
  "maxWafersPerMonth": 30000,
  "requires": [],
  "lithography": "DUV"
}
```

`tech-tree.json` entry:
```json
{
  "id": "x86_ooo_2", "branch": "cpu", "name": "Out-of-Order Execution II",
  "year": 1995, "costRP": 1800, "months": 6,
  "requires": ["x86_ooo_1"],
  "effects": { "ipc": 0.12, "dieAreaPenalty": 0.05 },
  "flavor": "Deeper reorder buffer; more IPC, more transistors, more heat."
}
```

### 4a. Generic product model (the load-bearing decision)

There are **175 products** (`design/PRODUCTS.md`), 174 of them sellable. **There will not be 175 code paths.** A product is a JSON row in one catalogue, and the catalogue is a directed graph:

```json
{
  "id": "battery_cell_pouch", "name": "Pouch Cell", "era": 1999,
  "contains":  ["cathode_mat", "anode_mat", "electrolyte", "laminate_film"],
  "sellsTo":   ["b2b", "diy"],
  "specs": [
    { "id": "chemistry", "type": "enum", "options": ["LiCoO2", "NMC", "LFP"] },
    { "id": "capacity",  "type": "number", "unit": "mAh", "min": 300, "max": 6000 },
    { "id": "thickness", "type": "number", "unit": "mm",  "min": 2,   "max": 12 }
  ],
  "derived": { "energyWh": "capacity * nominalVoltage / 1000" },
  "marketSegments": ["consumer_devices", "power_tools"]
}
```

Consequences, all of which we rely on:
- **Any product may contain any product.** No tier decides legality; the recipe does. Validation catches cycles, orphaned references, and children with a later `era` than their parent.
- `sellsTo: []` means internal-only. Everything else is shippable — dies, modules, devices, OS licences, even services.
- The **designer UI is generated from `specs`** — a new category gets a working design screen for free.
- `marketSegments` decouples "what it is" from "who wants it".
- Review/quality logic is generic: `quality = f(specs vs segment expectation, brand, price, channel)`.
- Adding a product later = one JSON + one test row.

**Product vs variant vs SKU.** A *product* has a designer. A *variant* is a gated value of one of its specs (`bitWidth: 16`). A *SKU* is a product with every spec decided and a price. **Never** add a catalogue entry that differs from another only by capability level or technology — that's a spec with `levels[]` (`PRODUCTS.md` §"Data model change"), each level carrying a `year` and a `requires` tech id. The designer always shows locked levels with their unlock reason, never hides them.

**The sell-or-consume split** is the mechanic that ties the graph together (`DOMAINS.md` §3a). Every product line carries a runtime ratio: 60% to market, 40% into your own assembly. Consumed inputs are valued at *your* marginal cost — that's the entire margin advantage of integration — while sold units earn revenue but arm competitors and give you no brand credit. Both endpoints (sell-only, consume-only) are legal strategies.

**Interfaces are first-class** (`DOMAINS.md` §4): a device has slots, a component has interfaces. Mismatches are blocked with plain language ("this board takes DDR2; this module is DDR4"). Interface transitions double as free market drama.

**OS is a shippable product** (confirmed, `DOMAINS.md` §6) — it sits in the same catalogue as everything else: no physical `contains`, but it is contained by devices and can be sold four ways (per-unit proprietary / open source + support / vertically locked / licensed out). Devices without an OS are unusable; an OS without hardware earns nothing. Ecosystem is a network effect: apps follow share, share follows apps.

**Validation is mandatory.** One JSON Schema for all products + `tools/validate-data.mjs` that refuses to boot on a malformed product, a duplicate id, a dependency cycle (A contains B contains A), or an orphaned `contains` reference. Without it 109 products become 109 silent bugs.

### 4b. Slice data scope

**M1 slice (unchanged in ambition, wider in schema):** 8 active categories (CPU die, process nodes, memory module, motherboard, PC, basic OS licence, package, PCBA), **~60–80 tech nodes**, **8 process nodes** (1990–2001), **8 active rivals + the rest dormant with `gate.year`**, **25 seeded events**.

All 109 products and 132 brands are authored as data from the start, but only ~8 are *activated* in M1. Market has rivals selling things you can't build yet — that's the point (`DOMAINS.md` §9).

---

## 5. UI layer

### 5a. Design language — **informal editorial, dark**

Live reference: **`design/styleguide.html`** (served at `/design/styleguide.html`). That file is the source of truth for tokens, parts, and the designer layout; this section is the reasoning.

**The inversion.** The light reference is warm paper (`#EDE9DE`) with near-black ink (`#17170F`). Dark mode is *not* a black terminal: paper cream becomes the text colour and the surfaces become warm near-blacks with the same yellow-brown cast. Nothing goes blue-grey or clinical.

| Token | Value | Use |
|---|---|---|
| `--paper-0` | `#12110E` | page |
| `--paper-1` | `#1A1815` | surface / header |
| `--paper-2` | `#201D19` | card |
| `--paper-3` | `#2A2620` | raised, hover |
| `--ink-0` | `#F0EBDF` | primary text |
| `--ink-1` | `#B9B2A3` | secondary |
| `--ink-2` | `#8C8577` | meta only, ≥12px |
| `--rule` / `--rule-strong` | `#332E26` / `#4A443A` | borders |
| `--green` | `#5C9E85` | profit, positive |
| `--red` | `#E2604A` | loss, recall |
| `--yellow` | `#F7CE46` | action, attention |
| `--bp` | `#6FD3F2` | blueprint cyan, technical only |

Both themes live in `tokens.css` behind `[data-theme]`, so a light mode is one attribute away and costs nothing to keep alive.

**Two voices.**
- **Serif** — headings, body, event copy, product names. System stack (Iowan/Palatino/Georgia) so there's no font file to ship. Self-hosting a webfont later is a drop-in change.
- **Mono** — every number, unit, label, status, ID. Tabular figures, right-aligned in tables.

**The character is the rules, not the colour.** Carry these over exactly from the reference:
- 2px borders everywhere; 14–18px radii on cards, 999px on pills.
- **Hard offset shadows, zero blur** (`0 2px 0 #000`). Press states translate into the shadow instead of dimming.
- Active tab **inverts** (cream fill, dark text) rather than glowing.
- 4px accent spine down the left of attention cards (yellow).
- Dashed 2px dividers between content groups; dashed 1px between table rows.
- Mono micro-labels: 10.5px, uppercase, `letter-spacing: .14em`.

**Blueprint layer.** Cyan `#6FD3F2` hairlines on `#0C1418`, a 10px/50px double grid, L-shaped registration corners, dimension lines with tick ends, and `FIG.` / `SCALE` / `SHEET` annotations.

Scope it strictly — this is the rule that keeps it from becoming noise:

| Blueprint | Paper |
|---|---|
| Die floorplan (designer) | Financials, P&L |
| Wafer map (fab) | News, events |
| Tech tree (lab) | Market tables |
| Process/lithography diagrams | Company, staff |

The designer screen is the showcase: floorplan drawn as `FIG. 1` on the left with dimension callouts and block labels (L1, FPU, decode, pad ring), spec sliders and a BOM table on the right in paper styling. Blueprint on the left, paper on the right — the machine on one side, the money on the other. That contrast is the whole screen.

**Implementation notes.** Blueprint surfaces are plain CSS (`repeating-linear-gradient` grid) plus inline SVG for the floorplan — no canvas needed, no assets. csui doesn't style anything, so all of this is our CSS passed through `class` and `style` props on `Box`/`Card`.

### 5b. Icons — hand-drawn, zero emoji

**Hard rule: no emoji anywhere.** Not in the UI, not in sim event text, not in data JSON, not in toasts. Emoji render differently on every OS, break the visual voice, can't be themed, can't be sized, and read as filler. Every glyph is an SVG we author.

**Drawing rules (applies to every icon):**
- 24×24 viewBox, artwork inside a 20×20 optical box (2px padding).
- Single stroke weight: **1.6 units** at 24px → reads as 1.5px at usage size. `stroke-linecap="round"`, `stroke-linejoin="round"`.
- `fill="none"` by default, sparse `fill="currentColor"` at 0.12 opacity for weight where a solid mass helps (wafer, die). Exactly one accent fill allowed on status icons.
- No gradients, no drop shadows inside icons. The hard offset shadow is a container property, not an icon property.
- Geometry snapped to half-units; diagonals at 45° prefer true diagonals over 1:2 slopes. Circles radius 4/7/9 only, so the set shares rhythm.
- Colour inherits `currentColor`. Accent variants (`--green`/`--red`/`--yellow`/`--bp`) are for status, never decoration.

**Themes to draw from** — icons should look like they belong to 1990–2026 silicon, not a generic SaaS set: die/wafer with flats, DIP and PGA pin outlines, board trace corners, VLSI bus lines, oscilloscope traces, gauge needles, oscillators, lead frames, mask plates, reel-to-reel tape, punch-card, floppy, callout arrows. Blueprint-derivation is fine for the technical half.

**Delivery:**
- One `<svg><defs>` sprite (`src/ui/icons.svg`) injected once at boot; `icon(name, size)` returns `<svg class="i"><use href="#i-…"/></svg>`.
- Sizes used: **16** (table cells, inline meta), **20** (buttons, pills), **24** (headers, tabs). Never below 16 — sub-pixel strokes go muddy.
- Themed via `currentColor`, so one file serves both themes.
- Icon-only controls require `aria-label` **and** a tooltip. Decorative icons get `aria-hidden="true"`.
- Icon never carries meaning alone: pair with text, or with shape/position. Reinforces Rule 03 (colour never alone).

**Handmade marks, not just utility icons:** each of the six rivals gets a monochrome wordmark + a simple geometric glyph (Inteq: nested square; AND-X: chevron pair; Nivida: eye/triangle; Pomelo: leaf-cut circle; Snapmo: wave; Yexynos: stacked bars). Drawn to the same stroke rules so the leaderboard reads as a set. Product codenames get a small "plate" treatment (mono type on a bordered chip), not a logo.

**Inventory for the slice** (~54 icons, all authored by hand):
- *Nav (7):* overview/gauge, design/ruler, lab/beaker, fab/wafer, market/scale, finance/ledger, news/dispatch.
- *Status (9):* up, down, flat, warning-triangle, check, cross, clock, pause, lock.
- *Company (8):* cash, revenue, burn, staff, morale, brand, share, reputation.
- *Design (10):* clock/speed, cache, pipeline, diesize, transistor, thermal, power, node, cost, ship.
- *Fab (8):* wafer, die, yield, capacity, queue, defect, bin, maintenance.
- *Research (6):* tech node, project, RP, patent stub, breakthrough, prerequisite.
- *Event (6):* market, supply, scandal, geopolitical, cycle, corporate.

**Definition of done:** an icon sheet in the styleguide (§06) showing every icon at 16/20/24 in both themes, plus a "wrong" row — the same icons with mixed stroke weights — so the consistency standard is visible, not asserted.

### 5c. Home screen — "the desk"

The main screen is not a dashboard of panels; it's a **personal device** running a company. That conceit gives the sidebar, clock and battery a reason to exist and makes the whole thing feel like an object rather than a web app.

```
┌──────┬───────────────────────────────────────────────────────────────────┐
│      │  S I L I C O N  E M P I R E        $4.28M ▲310k   1,240 RP +96/wk │
│  ●   │                                                ┌───────────────┐ │
│ nav  │  Company Name                                  │ PROFIT · MO   │ │
│      │  founded 1990 · by <player>                    │ PROFIT · YR   │ │
│  ◐   │                                                └───────────────┘ │
│  ⬒   │        ┌───────────────────────────┐       ┌───────────────────┐ │
│  ◫   │        │                           │       │  earnings graph   │ │
│  ▤   │        │     C E N T R E   A R T   │       │  stacked by prod  │ │
│  ⊞   │        │   (diorama fills as tank) │       │  52 wk trailing   │ │
│  ✦   │        │                           │       │                   │ │
│      │        └───────────────────────────┘       └───────────────────┘ │
│      │           Researching L3 Cache   62% · 9 wk left                 │
│      ├───────────────────────────────────────────────────────────────────┤
│ 12:4 │  RECENT ── news ── presentations ── (horizontal scroller)         │
│  ▮   │                                                                   │
└──────┴───────────────────────────────────────────────────────────────────┘
  84px                            flexible                            360px
```

**Sidebar (84px, full height, fixed).** Device taskbar, vertical.
- Top: a small "home" glyph — returns here from any sub-screen.
- Middle: seven nav icons (design, lab, fab, market, finance, news, company), icon-only at 24px with a 9px mono label under each. Active item inverts to cream block, matching the tab rule.
- Bottom: **game clock** — `1990 · W41` as a mono readout, with a tiny drawn calendar glyph; and **battery**. Battery is the device metaphor doing real work: it shows **cash runway** — full when solvent and long-lived, draining red below 12 months. Legible in a glance, no numbers needed.
- Also bottom: play/pause + speed (`1× 4× 16×`) since the sim is weekly.

**Header (top-left of main).**
- `S I L I C O N   E M P I R E` — spaced small caps, mono, 10.5px, tracking `.34em`, `--ink-2`. Decorative, `aria-hidden` in the visual sense but present in the DOM once for screen readers as plain text.
- `Company Name` — the biggest type on the screen, serif bold, 34px, tracking `-.02em`.
- `founded 1990 · by <player>` — mono, 10.5px, uppercase, `--ink-2`, with a hand-drawn hairline rule above it.

> **On the fancy unicode.** The mockup notation `𝗖𝗼𝗺𝗽𝗮𝗻𝘆 𝗡𝗮𝗺𝗲` / `𝖿𝗈𝗎𝗇𝖽𝖾𝖽` describes *styling*, and we implement it with CSS — never with literal mathematical-alphanumeric or fraktur codepoints. Literal `𝗠`/`𝖿` breaks screen readers (read glyph by glyph), breaks copy-paste, breaks search, and depends on fonts that aren't on every machine. The "blackletter" flavour, if you want it for real, comes from a self-hosted display font applied to that one line only — ask and I'll spec it rather than fake it with codepoints.

**Centre: the diorama.** The one piece of real illustration on the screen, and the emotional centre of the game.
- Drawing: a large single-colour ink illustration of the current activity at ~360–420px — a CPU die, a wafer, a fab line, a handshake/briefcase, a podium for a launch.
- **Fill mechanic (the "pouring water" idea):** two stacked copies of the same artwork. Base layer at 22% opacity in `--ink-1` (the empty vessel). Fill layer in the activity's accent colour, revealed by a `clip-path` rectangle whose height is driven by one CSS variable:
  ```css
  #diorama .fill { clip-path: inset(calc(100% - var(--fill)) 0 0 0); }
  ```
  A `--fill: 62%` write per tick is the entire animation cost. A second, slightly offset `<path>` with a 2–3px amplitude wave rides the seam so it reads as liquid rather than a bar.
- Motion: the liquid level *eases*, it doesn't step. A subtle vertical bob and 6–8 bubbles (small circles at low opacity) sell it. All CSS keyframes, all gated behind `prefers-reduced-motion` (static level, no bob).
- Caption under it: activity verb + subject in serif (`Researching L3 Cache`), then a mono line `62% · 9 wk left · W41`.
- States to author: **idle** (no activity — dim die with a slow pulse, caption "Nothing in the lab"), **research**, **design**, **fabricate**, **launch**, **negotiate**. Six illustrations, same drawing rules as §5b but illustration scale (1.6 stroke at 24px scales to ~3px at 400px — so these are redrawn at their own weight, not upscaled icons).
- Empty/failure states matter: a defective batch should show the vessel draining with a crack, not just a red number.

**Right rail (360px).**
- Top: **profit** block — two mono figures, `THIS MONTH` and `THIS YEAR`, each with signed delta and ▲▼, on `--paper-2` with a 2px rule. Negative years get the red spine.
- Below: **earnings graph** — stacked area by released product, weekly, trailing 52 weeks. SVG (not canvas: 52 points, crisp labels, and it must be keyboard/hover inspectable). Legend is product codenames as plates, with hatch patterns or distinct line styles alongside colour so it survives colourblind mode. A dashed marker at the current week; hover gives that week's per-product split.
- Rail collapses below 1080px into a two-up row above the bottom strip.

**Bottom strip: recent.**
- Horizontal scroller: **news** (event spine cards, compact — date, one-line headline, delta) then **presentations** (product launches, with a podium glyph, date and audience rating).
- Each item is 260px wide, 2px border, no shadow, hover lifts. Clicking opens the full card in a centred modal, not a new screen — news shouldn't navigate away from the desk.
- Max 12 items shown, newest first, unread marked with a yellow dot (shape + colour, per Rule 03).

**Data the sim must expose for this screen** (all derived, none new mechanics):
`cash`, `cashDeltaWeek`, `cashHistory[8]`, `rp`, `rpRatePerWeek`, `cashRunwayMonths`, `profitMonth`, `profitYear`, `revenueByProduct[52][n]`, `activity {kind, subject, progress, weeksLeft}`, `recentNews[]`, `recentPresentations[]`, `week`, `year`.

The HUD consumes `cash`, `cashDeltaWeek`, `rp`, `rpRatePerWeek` on **every** screen; the rest are desk-only.

**Performance contract.** The desk is always mounted and updates every tick: target **< 2ms** per tick for the whole screen. Achieved by: one CSS-var write for the diorama, one `text` write per figure, and an SVG path `d` swap only when the week advances. No re-layout on tick, no element creation.

### 5d. Global HUD — cash & research points

Both are **persistent, global, top-right, same position on every screen**. Not per-screen, not duplicated, not in a modal. The player's eye should learn one coordinate in the first thirty seconds and never hunt again.

```
                    $4.28M ▲310k        1,240 RP +96/wk
                    ─────────────        ──────────────
                    cash · spendable     RP · banked
```

**Cash.** The primary resource — it gates everything, and it's the one number a player checks reflexively.
- Mono, tabular, 17px, `--ink-0`. Short form always: `$4.28M`, `$940k`, never `$4,281,000`.
- Signed weekly delta beside it in 11px mono, ▲/▼ + colour (green/red) — this is the number that answers "am I dying", not the balance.
- Negative cash: value turns `--red`, card gets the red spine, and a `RUNWAY 6 WK` pill appears. Insolvency must never be discoverable by arithmetic.
- Hover: tooltip with the last 8 weeks of cash and the biggest weekly outflow line.

**Research points.** Secondary, but must be glanceable because it's the currency of the Lab and Design screens.
- Mono, 15px, `--ink-1` — deliberately one step quieter than cash so the hierarchy is obvious.
- Glyph (hand-drawn beaker or die) at 16px to the left, so it's identifiable in peripheral vision without reading.
- Shows `+96/wk` accrual rate in 10.5px mono, dimmed. Rate matters more than balance for planning: "how long until I can afford that node".
- On the **Lab** screen the HUD gains a third state — RP stays top-right, but each tech node also shows its own cost, and a sticky sub-line reads `1,240 RP · 13 wk to next tier at current rate`. Costs are shown where they're spent, never only in the HUD.

**Why not the sidebar.** The 84px column is already carrying nav, clock, battery and speed controls. Cramming money into it would force the most important number in the game into a 10px font in a corner. The sidebar is the *device*; the HUD is the *company*. Keep them separate.

**Why not the right rail.** The rail scrolls, collapses below 1080px, and is home-only. Cash must survive every one of those states. So the HUD lives in the header, which is the one element that is always present — and on sub-screens the header persists in compact form (back glyph + screen title + the same two readouts).

**The other resource-ish numbers stay where they are**, to avoid clutter: profit month/year lives in the rail (it's a scoreboard, not a currency), and burn lives on the battery (it's a warning, not a decision input).

**Rule for future resources.** Any new currency (premium, patents, fab slots, influence) either joins this HUD with a fixed slot, or doesn't ship. Six pills is the ceiling — past that, the bar becomes wallpaper. If a sixth is ever added, cash and RP keep their positions and the newcomer appends right.

**Acceptance:**
- [ ] Cash and RP appear at identical pixel coordinates on all seven screens (± nothing), verified by a DOM-rect test.
- [ ] Cash delta is correct for the tick just completed, not the previous one.
- [ ] HUD never reflows when numbers change length (`$9.99M` → `$10.0M` must not shift neighbours) — fixed min-width per slot.
- [ ] Negative cash is announceable: `aria-live="polite"` fires once on crossing below zero, not every tick.

### 5e. The binder (R2 in practice)
csui's idiom is named containers: `new Box('overview')` registers a container, children attach by passing that name. We build the whole screen once, then hold references.

```js
// src/ui/screens/home.js
import { Box, Text, Table, TableRow, TableCell, clearContainers } from '../../../vendor/csui.js';
import { money, pct, delta } from '../binder.js';

export function mountOverview(root) {
  const panel = new Box('overview');       // named container (does not self-attach)
  root.addChild(panel);

  const head = new Box('overviewHead', { style: 'display:flex;gap:12px' });
  panel.addChild(head);

  const refs = {};
  for (const [key, label] of [['cash','Cash'],['revenue','Revenue'],['share','Share'],['burn','Net/wk']]) {
    const card = new Box('overviewCard', { class: 'stat-card' });
    head.addChild(card);
    new Text('overviewCard', { class: 'stat-label', text: label }).el && null; // see note
    refs[key] = new Text('overviewCard', { class: 'stat-value' });
  }

  return {
    update(state) {                       // called every tick — no DOM creation
      refs.cash.text = money(state.player.cash);
      refs.revenue.text = money(state.player.revenueWeekly);
      refs.share.text = pct(state.player.share);
      refs.burn.text = delta(state.player.netWeekly);
    },
    destroy() { panel.el.remove(); clearContainers(); }
  };
}
```

Notes that matter, all verified against the source:
- `Box` constructor: if the first arg is an object it's treated as props; a **string** registers a named container and does **not** auto-attach — hence the `root.addChild(panel)`.
- Children attach to the **most recently registered** container with that name. Unique container names per screen are therefore a real requirement, not a convention. Prefix them (`overview*`, `design*`).
- `Text`/`TableCell` expose a `text` setter and getter — that's the whole mutation API for numbers.
- `el.style` is the escape hatch for layout; csui has no layout system. We define utility classes in `index.css` (`stat-card`, `row`, `grid-3`) and pass them via `class`.
- **Plot twist to verify in the spike:** `BaseElement` logs `console.debug` on every constructor call. A 400-element screen emits 400 lines and pollutes profiling. If the spike confirms it's noisy, the only local patch allowed is gating that one line in `vendor/csui.js`, recorded in `VENDOR.md`.

### Screen lifecycle
```
mount(root) -> { update(state), destroy() }
```
- Tabs: mount lazily on first visit, keep mounted afterwards (cheap, preserves scroll), `destroy()` only on new game / load.
- One central `render(state)` in `main.js` fans out to the active screen's `update`. Inactive screens get `update` too, but only if they're cheap; otherwise they catch up on re-show.

### Formatting rules (`fmt.js`)
- Short money: `$1.24B`, `$940M`, `$12.4k` — never raw digits above 6 figures.
- Deltas always signed and colored: `+2.1%`. Never color-only; pair with a glyph for colorblind safety.
- Percentages: one decimal max. Never `0.30000000000000004` on screen — round in the formatter, not the sim.
- Every number that has a breakdown gets a tooltip with the breakdown. This is the Game Dev Tycoon lesson from the doc: no opaque 7.5 stars.

### Accessibility floor (cheap if designed in, expensive later)
Keyboard reachability for every control, visible focus ring, `prefers-reduced-motion` respected, minimum 14px body text with a text-size setting (125%), colorblind-safe palette chosen up front, no meaning conveyed by color alone.

---

## 6. Vertical slice — scope and acceptance

**One playable decade: January 1990 → December 2001.** CPU design only, one product line, six rivals, real dated events.

In scope:
1. **Design** a CPU: die area, cache, clock, pipeline depth, node choice. Live perf + BOM + thermal estimate. (Designer UI generated from the category schema, so the next category needs no new screen.)
2. **Fab**: buy capacity or own one fab; yield ramps with node age; launches on a new node hurt.
3. **Price**: slider with live demand curve and margin readout.
4. **Launch**: review with a visible 4-part breakdown.
5. **Market**: weekly share movement across 3 segments (consumer, enthusiast, enterprise), rivals respond quarterly.
6. **R&D**: 80-node tree, RP spend, 6-month projects, date gates.
7. **Finance**: weekly P&L, cash, one debt facility, valuation.
8. **News**: seeded real events (FDIV-class recall, DRAM price swing, HDD flood) with 2–3 choices each.
9. **Save/load**, pause + 1×/4×/16× speed, restart with new seed.
10. **Layer economics**: buy inputs at market price or make them; sell to OEM (B2B) or retail (B2C); interfaces enforce compatibility with plain-language errors.
11. **One OS licence decision** (license a rival's OS vs. build your own stub) to prove the coupling works before M4.
12. **Sell-or-consume split** on at least two chained products (memory module → your PC), including the case where you sell the module to a rival.

Acceptance (testable, not vibes):
- [ ] Determinism: same seed + same input log ⇒ identical state hash after 624 ticks.
- [ ] `src/sim/` contains no DOM/csui imports and no `Math.random()` (automated).
- [ ] Balance: 500-run headless sweep — zero bankruptcies before 1995; max share by 2010 < 60%.
- [ ] Every screen updates at 16× speed with no layout thrash and no scroll reset.
- [ ] **Desk tick cost < 2ms** (diorama CSS-var write, figure writes, SVG path swap only on week change).
- [ ] **Diorama fill reads correctly at a glance** at 0/25/50/75/100%, and the caption always names the activity in plain words.
- [ ] Battery never drops below 20% without a visible warning state **and** a text fallback (`runway 4 mo`).
- [ ] Cash + RP sit at identical coordinates on all seven screens; HUD slots don't reflow as digits change length.
- [ ] No product category is unreachable: every catalogue row is designable, and every `contains` edge is resolvable to a real product or raw input.
- [ ] Sell-or-consume split produces a measurably cheaper device (integration advantage) **and** a measurably stronger rival when you sell to them — both directions verified in the balance sweep.
- [ ] Any product can be sold: no product is silently internal-only unless its `sellsTo` is explicitly empty.
- [ ] Reviews always show the component breakdown that produced the total.
- [ ] Save round-trip: save → reload → state hash identical.
- [ ] 10 minutes of play with no console errors, no unhandled promise rejections.
- [ ] Sim core is < 60 KB unminified and updates 624 ticks in < 50 ms headless.

**Excluded forever (user decision):** medical devices, and any AI product line — no NPUs/TPUs/accelerators, no AI assistants, no AI market modifiers. Enforced by `tools/lint-domains.mjs`, which fails if a category is tagged `medical` or `ai`. Rationale in `DOMAINS.md` §8: an AI accelerator race would dominate 2018–2026 and flatten the late game into a single race.

Explicitly **out of the M1 slice**: GPUs, phones, batteries, panels, cameras, audio, cooling, SBCs, consoles, OS beyond one licence decision, stock market/IPO, employees beyond headcount+morale, takeovers, patents, modding, mobile layout, 3D office. All are authored as data and activated per `DOMAINS.md` §9 — none gate the first playtest.

**The architectural commitment:** the schema supports all 7 layers and 132 brands on day one; only the M1 tier is *activated*. That way M2–M5 are data authoring plus one new screen each, not a rewrite.

---

## 7. Build order

| Step | Deliverable | Prove |
|---|---|---|
| 1 | Vendor csui + `VENDOR.md`; `index.html` + static server | It runs, it's pinned |
| 1b | `styles/tokens.css` + `base.css` + `components.css`, lifted from `design/styleguide.html` | The styleguide becomes real CSS before any screen exists |
| 1c | Icon sprite: the 20 icons needed by Overview + Design first, then the rest | Sets the drawing standard early; cheap to redraw now, expensive after 6 screens |
| 2 | `sim/rng.js`, `sim/state.js`, `sim/tick.js` with cash-only | Determinism test passes |
| 2b | `data/schema/` + `tools/validate-data.mjs`; author the 8 M1 products + 8 active brands | The full catalogue is data-safe before any of it is built |
| 2c | `sim/product.js` + `sim/interfaces.js` — generic inputs→specs→cost→quality | Proves a second category needs no new code |
| 3 | **Spike: Home desk** — sidebar, header + global HUD, diorama, profit block, earnings graph, recent strip, at 16× speed | Build-once/mutate holds up *and* the desk tick budget is met — this decides the whole UI approach |
| 3b | Diorama: all six activity states + idle, with reduced-motion variants | The screen's centrepiece works before six more screens depend on it |
| 4 | Design → Fab → Launch loop, headless first, UI second | A product goes from idea to sale |
| 5 | Rivals + market share + reviews | Competition feels alive |
| 6 | Tech tree (SVG) + R&D projects | Progression |
| 7 | Finance + News/events + save/load | A full decade is playable |
| 8 | Balance sweep, tuning pass | Numbers aren't broken |
| 9 | Polish: keyboard, reduced motion, text size, empty states | Ship-quality slice |

Step 3 is the risk gate. If the binder fights us across that one screen, we stop and reconsider the view layer before building six more screens — not after.

---

## 8. Known risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Build-once/mutate gets unwieldy past ~6 screens | Medium | Spike at step 3; escape hatches: per-panel micro-rebuild, or swap view layer behind `ui/` boundary |
| csui's global container registry collides across screens | High if ignored | Unique name prefixes + `clearContainers()` on teardown (R3) |
| csui logs on every constructor | Certain | Gate in vendor patch, document in `VENDOR.md` |
| 80-node tree extrapolates badly to 3,000 | Medium | Tree data is inert JSON; renderer only ever draws visible viewport nodes |
| Balance is unfun (grind or trivial) | High on first pass | Headless sweep before any UI polish; tune economy against distributions |
| Historical anachronism slips in | Medium | `earliestYear` enforced in sim, not UI; test asserts no unlocked tech predates its year |
| Icon set drifts into inconsistency | High | Fixed stroke weight + 24px grid + radius set; §06 icon sheet shows a deliberately "wrong" row for comparison |
| Emoji sneaks into event text or a shortcut | Medium | `tools/lint-emoji.mjs` greps `src/` for emoji ranges in CI/test, same mechanism as the `Math.random` check |
| **109 products becomes 109 code paths** | Very high | One catalogue schema (§4a) + generated designer + JSON Schema validation. Any PR adding a `switch (productId)` is wrong by definition |
| Data volume unmaintainable by M3 (~3–5k rows) | High | Schema validation, product templates, `tools/validate-data.mjs` in the test run |
| Per-product balance drift | High | Shared margin bands per channel; `balance.mjs` flags any product outside ±1σ of its channel norm |
| Brand names too close to real trademarks | Medium | Edit-distance check in `tools/lint-brands.mjs`; `realAnalog` never shipped; trademark search before any public release |
| Scope creep to GPUs/phones | Very high | Slice list in §6 is closed; additions go to a `NEXT.md` backlog file, not into the build |
| Diorama art becomes a time sink (6 full illustrations) | High | Draw them as line work reusing the icon grammar; 1 die + 1 wafer + 1 bench cover 90% of playtime, others can ship as flat silhouettes first |
| Desk is always mounted, so a slow update taxes every tick | Medium | Enforced <2ms budget with a timing assertion in the spike; cheap fix is throttling the graph to redraw on week change only |
| Battery/clock read as gimmicks | Low | Battery is tied to runway (real signal), clock is the sim date (real state). If either becomes pure decoration, cut it |

---

## 9. Open questions for you

1. **Start year 1990 confirmed?** It makes the first ~6 years deliberately slow (386/486 era, small market). Starting 1993 with 1990–93 as a scripted prologue is the alternative.
2. **Player company** — invented name, or pick from 2–3 presets (a scrappy fabless startup, a vertically integrated giant, a Japanese electronics conglomerate)?
3. **Difficulty model** — fixed, or selectable (casual / realistic / brutal) by scaling rival aggression and capital?
4. **The 3,000-node ambition** — expand the tree after the slice ships, or cut to ~400 well-chosen nodes permanently? I'd cut.
5. **Battery = cash runway, or literal device battery?** I recommend runway — a draining battery is the most legible insolvency warning in games. Literal battery is flavour only and will feel like dead UI.
6. **Does the desk ever scroll, or is it a fixed viewport?** I'd make it fixed at 100vh (no page scroll) so it reads as a device; sub-screens scroll internally. That's a real constraint on future screen design, so worth deciding now.
7. **Blackletter line** — keep `founded 1990 · by <player>` as clean spaced mono, or self-host one display font for that single line? I lean mono; fraktur on a 10px line is unreadable.
8. **Starting position** — a fabless designer, a module maker, an IDM with one old fab, or a blank-slate startup with cash only? Each teaches a different part of the chain; the module maker is the gentlest tutorial.
9. **Can the player operate at several layers at once** (sell cells *and* phones), or is multi-layer integration gated behind a "vertically integrated" milestone? I lean: allowed from M2, because that's the actual fantasy.
10. **Do OS and software count as products the player ships**, or only as enablers? `DOMAINS.md` §6 assumes the former — confirm, since it roughly doubles the M4 scope.

Answer those and I'll start at step 1–3: vendor csui, stand up the sim skeleton with the determinism test, and build the Home desk spike so we can judge the UI approach — and the diorama fill — on a running screen.
