# SILICON EMPIRE — Build Plan

**Status:** plan / pre-code. Nothing here is implemented yet.
**Branch:** `arena/1cf6c425-silicon-empire`
**Source research:** `SILICON_EMPIRE_COMPLETE.md` (8k words of real 1990–2026 specs, fab economics, market math, rival profiles). The game runs to **2055**; everything after 2026 is authored speculation, not researched history.
**Run length:** January 1990 → December 2055, then it stops. 66 years, 3,432 ticks, ~25–30 product generations.

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
| Visual language | **Neo-Brutalism, dark by default** — 3px ink borders, zero-blur offset shadows, saturated lime/coral/sky blocks, heavy lowercase type. Geometric fills (dots, hatch, blueprint grid, pinstripe) only in dead space that is big enough to hold them. | See `src/styles/`. Restyles the existing shell in place — no new screens, no new flow. |

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
├── NLP-LITE-SMALLHOURS.js     # the text engine, vendored verbatim. NEVER edited.
├── tools/
│   └── pip-smoke.mjs          # headless PIP checks: intents, determinism, read-gating
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
│   │   ├── process-nodes.json # 1990→2055 nodes, D0 curves, capex
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
│   │       ├── sections.js    # primary rail + drawer destinations
│   │       └── pip/panel.js   # PIP transcript, suggested questions, track record
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

## 3b. Gameplay loop

**The loop is one sentence: read the market, commit silicon to a bet, live with it.**
The heartbeat is the product generation, not the week — design → tape-out → ramp →
launch → harvest → obsolete, two to three years each, twelve to fifteen of them
between 1990 and 2055.

Two clocks run at once. **Money is weekly. Silicon is 6–18 months.** The gap between
them — spending today for revenue that may arrive after the window has shut — is the
whole game.

### 3b.1 Act 0 — the bedroom, January 1990

You are 18. Savings are **7,000–18,000, seeded** (the same seed always gives the same
number). You own one thing: a **salvaged 1988 stereolithography rig** — an industrial
machine bought at auction, prints resin, jams often. (The catalogue's *3D printer*,
E42, stays a 2008 sellable product; this is a tool, not a product.)

No staff, no credit, no suppliers. The rig prints **geometry only** — cases, keycaps,
mouse shells. Switches, PCB, MCU and cable are bought at list price from a hobby
catalogue: MOQ 1, no credit, 2-week lead time. Assembly is your hands.

**You can make four things, and they are the tutorial.** Every input is a real
catalogue row, so the containment graph is exercised from tick one.

| SKU | Built from | Print slots | BOM | Price | Margin |
|---|---|---|---|---|---|
| keyboard | E30 ← D58 switches, D60 PCB, B1 MCU, E36 cable, D54 case* | 2 | ~45 | ~89 | ~44 |
| mouse | E31 ← sensor, B1 MCU, D58 buttons, E36 cable, D54 shell* | 1 | ~15 | ~39 | ~24 |
| keycap set | D54* | 1 | ~5 | ~19 | ~14 |
| case | D54* | 1 | ~8 | ~25 | ~17 |

\* printed on the rig. **16 slots/week**, **12% scrap** (a failed print eats the resin,
not the bought parts). **Living costs 150/week**, which is the pressure that makes the
rig run every week and teaches the runway battery before any other screen does.

**Demand is the binding constraint, not capacity.** Weekly orders start at 2 and grow
with cumulative units sold and review score — sell out and the queue grows, overbuild
and cash sits in a cupboard. **Reviews (0–100)** come from defect escape rate, price
against comparable, and delivery speed; they are the only marketing you have.

Interrupts, roughly eight in the act: resin runs out mid-week · rig jams (loses a week
or pay for a service) · a computer fair wants 20 units by Friday · a defect return ·
a magazine ad costs 200 for a week · a hobbyist asks for a custom run · a brand emails
asking who you are · the gate.

**Pacing:** 40–70 weeks of game time at good play, never fewer than 25. The act is
decision-paced, not clock-paced — at 4× the whole thing is twenty seconds of clock and
six to ten minutes of play. Balance gate: median policy reaches the gate in 40–70
weeks; no policy goes bankrupt after 1991.

### 3b.2 The gate — credit standing

The rule is exact and visible: **cash in hand ≥ starting savings + 10,000.** Cash, not
net worth — stock and tools do not buy you a meeting, and a player should not be able
to corner the gate by hoarding filament.

This is not a level. Nothing is announced. What changes is that **people answer the
phone**: nine suppliers send quotes and three brands open an OEM conversation, because
you can now put down a deposit. The desk shows one line — `capital raised 3,400 / 10,000`.

*Starting cash is therefore difficulty, not progress:* 7k means thin buffer and no bulk
buying; 18k means you can buy switches in hundreds and survive a bad month. The gate is
the same distance for both.

### 3b.3 Act 1 — suppliers and contracts

Twelve suppliers exist at the gate: **three fabs, three factories, three PCB houses**, and
**three carriers** (fadex, velmo, shipper — the last is a freight consolidator). Each has a
personality that shows up in the terms rather than in a stat block; the carriers' terms are
in §3e.2 stage 11.

| House | Personality | Shows up as |
|---|---|---|
| fab A | shuttle broker, cheapest | long lead, fixed dates, no reschedule |
| fab B | fast, expensive | 4-week faster, 40% dearer, strict quality clause |
| fab C | old node, forgiving | older process only, generous yield clause |
| factory A/B/C | box-build · SMT · flex | MOQ vs price vs penalty, one does no rework |
| pcb A/B/C | 2-layer cheap · 4-layer · quick-turn | MOQ 5/50/500, lead 3/8/15 days |

**The first fab deal is a seat on a shared wafer shuttle** — a MOSIS-style multi-project
run, historically right for 1990: a few dies for 3,000–8,000, ten to fourteen weeks.
That is how a nineteen-year-old with 20k gets into silicon without a fab.

**Every contract is one page, generated, and has to be read.** Six to nine clauses drawn
from a pool, values scaled by supplier personality and seed:

price tiers · MOQ · lead time · NRE/tooling · payment terms (net 15/30/60) ·
late-delivery penalty · quality clause (max defect rate) · exclusivity (region/term) ·
volume commitment · price review window · cancellation · rescheduling.

There are **no risk flags**. The number on the sign button is the binding one; whether it
is a good number is your reading. Later, hiring a contracts lawyer annotates the sheet —
reading is the early-game mechanic, staff is the late-game convenience. One counter-offer
per contract, costs a week, may be refused.

Signed contracts live in the drawer's **contracts** screen and bind you: obligations are
checked every tick, and a miss costs cash and reputation. Brands work the same way —
a regional PC maker wants 500 keyboards with their badge, at a price that makes you
do the arithmetic.

### 3b.4 The week — fixed resolution order

Cause must precede effect or the numbers stop being learnable.

| # | Step | Produces |
|---|---|---|
| 1 | R&D | RP → project progress |
| 2 | Fab / rig | wafers or prints started this week land in 6–8 |
| 3 | Assembly | printed parts + bought parts → finished goods |
| 4 | Inventory | holding cost, obsolescence clock |
| 5 | Demand | segment size × share (price, review, brand, rival price) |
| 6 | Sales | units, revenue, backorders |
| 7 | Costs | salaries, upkeep, interest, marketing, freight, tariffs, penalties |
| 8 | Cash | runway; the number that decides the run |
| 9 | Rivals | quarterly only — weeks 13/26/39/52 |
| 10 | Events | seeded or triggered, some with choices |
| 11 | Log | 0–4 news items, chart appends |

### 3b.5 Defaults, interrupts, speed

- **Routine decisions default.** Ignore pricing and it holds; ignore capacity and last
  week's plan repeats; a finished project waits in the lab. Ignoring is suboptimal,
  never fatal.
- **Decisions stop the clock; notices never do.** Recall, takeover offer, yield crisis,
  contract bid — a modal, a decision, a consequence. 15–25 per decade. The full pause
  table is in §3d.2.
- **Policies absorb the routine** — target margin, headcount, reinvestment share — so
  that 16× is honest rather than a blur.
- Net effect: one real decision every 4–8 game weeks, two to four minutes of play per
  generation at 4×.

### 3b.6 The late game, and the stop

The game **ends at 2055** — it does not run forever, and it does not fade out. Two
mechanical reasons, both stated so they can be tuned rather than discovered late:

- **Each node costs more than the last.** Capex, NRE and R&D per generation climb
  super-linearly, so a single product is a bet the size of a company by the 2040s. The
  endgame is capital allocation under scarcity, not a victory lap.
- **Generations get slower.** Lead times lengthen as processes get harder, so 25–30
  generations become 12–15 decisions by the end.

**The stop is a scorecard, not a fade.** At week 3,432 the run closes on: final
valuation, peak valuation, share by segment, generations shipped, best-selling product,
reviews mean, survival weeks, and the full log. No endless mode — the date is the point,
because "tech is expensive and unfun after 2055" is a design judgement worth defending
in the UI rather than a wall the player hits by accident.

**Post-2026 is speculative content.** Real history runs out at the research boundary, so
2027–2055 draws on authored tech trajectories, and its events are generated from a
plausible pool rather than seeded from dated fact. Brands with `gate.year > 2026` are
fictional only — no real company is projected into a future it has not had.

### 3b.7 What this changes

§6's vertical slice currently starts at a fabless CPU designer. It should start at the
bedroom, run act 0 → gate → shuttle → first fabbed product, and reach CPUs as act 2.
The slice gets longer but the first ten minutes teach BOM, yield, reviews, runway and
contract reading instead of dropping the player into a fab they cannot afford.

**Open:** nothing on events — see §3d for the sources and the pause table.

---

## 3c. PIP — the assistant

**PIP does nothing. It only talks.** It cannot sign, price, hire, buy capacity or open a
screen for you; every answer ends in a pointer to where *you* would do the thing. That
restriction is the feature — an assistant that acts removes the game.

**PIP is not a piece of the timeline.** It is not a 1990 product, not a shareware disk,
not an artefact that ages with the calendar — it is the player's assistant, on screen
from tick one of an 18-year-old's bedroom and identical in 2054. It sits outside the
fiction's history so it can be useful in all of it.

**Its job is to help.** The player should come away better informed after every
conversation: a number they did not know, a consequence they had not considered, a
risk worth checking. What it must never do is *decide* — advice is its ceiling.

**It knows only what is public:** segment sizes, prices, your own books, the news feed,
the catalogue. Rival cash, roadmaps and margins are invisible until the browser screen
buys intel — so "who is about to cut prices" is inference, not data.

### 3c.1 Answers are a function of the tick

`pip.ask(question, world)` must be **deterministic**: same tick, same question, same
state ⇒ same answer. Asking again is not a reroll, so a player cannot fish for a better
forecast. Asking next week gives a different answer because the world moved, which is
the correct behaviour and reads as "it thought about it".

Predictions draw from a **separate rng stream (`rngPip`)**, exactly like rival AI. PIP
can therefore never perturb the sim, and a golden-file test can pin its answers.

### 3c.2 Four kinds of answer

| Kind | Example | Behaviour |
|---|---|---|
| **Recall** | "what did I spend on resin in march" | exact, from your books |
| **Advise** | "should I buy a second rig" | lays out the arithmetic and the risk, recommends nothing outright |
| **Explain** | "why did reviews drop" | cites the 2–3 biggest contributions, no single opaque score |
| **Predict** | "will dram prices rise this quarter" | always ships a confidence and a basis |
| **Opinion** | "what do you think of fab b" | **PIP's own view, in the first person**, labelled as a read and not a calculation — no confidence number, because a stance is not a forecast |
| **Summary** | "summarise the fab a contract" | only for a sheet you have already read |
| **Compare** | "compare fab a and fab b" | two read sheets, field by field, naming which side wins and by how much |
| **Refuse** | "sign the fab deal for me" | declines in character, points at the screen |

### 3c.3 Being wrong on purpose

Every prediction carries a **confidence (0.55–0.95)**, and the game resolves it later:

```
accuracy(c) = c - drift
drift = 0.00 short (≤4 weeks) · 0.10 seasonal (≤1 quarter) · 0.20 structural (years)
shock (war, flood, recall, rate move) marks live predictions stale, -0.10
```

Horizon and subject matter move it, not mood: supply-chain calls are worse than your own
P&L. A prediction is stored with its claim; at resolution it is scored hit or miss.

**Track record is visible** in the PIP panel: `calls 23/31 · overconfident on supply`.
That is the trust minigame — by act 2 you know to believe its cost estimates and ignore
its market timing, and that knowledge is earned, not granted.

### 3c.4 What it refuses to do

- **Contracts.** Three levels, and the line between them is the whole point:
  1. **Unread** — PIP will not summarise it, quote it, or leak a number from it. *"open it
     and read it — i will summarise it after, but i will not read it for you."* The read
     flag flips when the sheet has actually been opened.
  2. **Read** — PIP summarises the clauses, translates jargon (NRE, net-60, MOQ), and
     compares two read sheets field by field: which is cheaper per unit, faster, smaller
     MOQ, longer to pay, stronger penalty, dearer tooling.
  3. **Judgement** — it will give an opinion if asked, and it is a *read*, not a verdict.
     Whether to sign stays with you, which is where the mechanic lives.
  A hired contracts lawyer annotates the page itself, so the clauses stop needing
  translation and the summaries get shorter.
- **Actions.** No auto-pricing, no auto-hiring, no "fix it" button.
- **Hidden state.** No rival internals, ever.
- **Guarantees.** No answer phrased as certainty, even when it is right.

### 3c.5 Where it lives

The drawer's `pip` entry opens a panel: a transcript, a row of suggested questions (so
the player never has to guess syntax), and the track record. It also puts one line on
event modals — never in place of the decision.

**Availability never gates progress.** If the player never opens PIP, every screen is
still fully playable; PIP is the difference between a good decision and a lucky one.

### 3c.6 Integration seam

The engine is `NLP-LITE-SMALLHOURS.js` at the repo root — the user's own bundled
Small Hours NLP, vendored verbatim and **never edited**.

**What it is.** 636 lines / 63 KB, one UMD file: `require()` in Node, a plain
`<script>` in the browser setting `window.NLP_SH`. No dependencies, no DOM, no
`fetch`, no worker. `analyze()` is pure and stable — verified by calling it twice.

**API:** `normalize · analyze · reflect · cap · pick · fill · fuzzy · clean · claims ·
splitClauses · qfix · isFiller · isGreeting · PEOPLE · dayOffset · weekday`.
`analyze(raw)` returns `{ raw, t, I, words, sent, shout, q, loc, honest, len, empty,
negated, clauses, qtype, people, pron, facts, memq, opq, short, topics, tset, meta,
about, greet, claims, nums, money, nights, ref }` — `qtype` and `opq` are what drive
opinion detection, and `isFiller`/`isGreeting` keep the transcript from answering "ok".

**Two things it does not do for us.** It is a *narrative* engine: "why did my reviews
drop" parses as `qtype: "why"` with no topics, and there are no game intents. And its
`pick()` draws from `Math.random`, so the adapter never calls it — variety comes from a
mulberry32 stream seeded on `(seed, tick, question)`.

**Adapter** — `src/pip/adapter.js`, the only place the game talks to the engine:

```js
createPip({ engine, seed, world }) -> {
  ask(text, ctx) -> { kind, text, confidence?, basis, refs, claim?, resolvesOnTick? }
  settle(prediction, actual) -> { ...prediction, hit, settledOnTick }
  classify(text) -> { topic, wantsOpinion, wantsSummary, wantsCompare, wantsPredict,
                      wantsAction, wantsAdvice, names }
}
```

It adds the game lexicon (cash, contract, capacity, reviews, demand, price, rivals,
marketing, staff), six answer kinds plus refuse, and byte-stable answers per tick.
`tools/pip-smoke.mjs` runs 13 assertions headless — load, ten intents, determinism
within a tick, change across ticks, and that an unread sheet never leaks its numbers.

**Still to come:** the panel UI (`src/ui/pip/panel.js`) — transcript, suggested
questions, track record. The adapter is engine-complete without it.

---

## 3d. Events — real history for real-analogue firms, procedural for fictional

Two sources, one rule: **an event's source is decided by who it happens to.**

| Who | Source | Because |
|---|---|---|
| a real-analogue brand (Imtel, AMB, Nivida, Pomelo, Snapmo) | **dated history** — authored, year-pinned, from the research bible | the real thing happened; inventing a different fate for a thinly-veiled Intel is worse than borrowing the true one |
| a fictional brand (Voltaic Works, and any `gate.year > 2026`) | **procedural** — rolled from `rng` against its personality | there is no history to be faithful to, so a generator can be as nasty as its dice allow |
| the player's company | **procedural** | same reason |
| a *market-wide* event (DRAM price, a flood, a rate move) | **dated history** when dated, procedural otherwise | it hits everyone, so it must be authored once and shared |

**Nothing crosses over.** A fictional firm cannot be handed the FDIV bug; Imtel cannot be
given a procedurally generated lawsuit. This is enforced by data, not by taste:
`source: 'history'` events must name a brand whose roster row is `real-analogue` and carry
a `year` the roster's `gate.year` allows; `source: 'procedural'` events may only draw from
brands marked `fictional` or from the player. `tools/lint-events.mjs` fails the build on
any event that breaks the pairing.

**After 2026 everything is procedural.** The research boundary is the end of authored
history, so 2027–2055 has no dated pool — market-wide events there are rolled from a
plausible set rather than referenced.

### 3d.1 Three shapes

| Shape | Needs the player? | Examples | Where it goes |
|---|---|---|---|
| **Notice** | no | imtel ships a 486; a rival cuts price; DRAM firms; a magazine reviews your keyboard; lead times extend | news grid, next tick |
| **Decision** | yes, 2–3 choices | a recall notice on *your* batch; a brand offers 500 units OEM; a yield crisis on a new node; a takeover approach; a 48-hour bid; resin held at customs | modal |
| **Interrupt** (act 0) | yes, small stakes | the rig jams; a fair wants 20 units by friday; a defect return; a custom-order request | modal, brief |

Notices are what the desk's fixed four-card news grid already shows — `market`, `launch`,
`scandal`, `supply`, `presentation` map to those instances.

### 3d.2 The pause rule

| | 1× | 4× | 16× |
|---|---|---|---|
| Notice | no pause | no pause | no pause |
| Decision | pauses | pauses | **queues** — banner + count, waits indefinitely |
| Interrupt | pauses | pauses | queues |
| Game over / gate | pauses | pauses | pauses |

Fast-forward must never silently eat a choice, and a player at 16× must never be trapped
in a modal every thirty seconds. The queue is the compromise: the clock keeps running, the
decision waits, and the banner says how many are waiting.

### 3d.3 Data shape

```js
{
  id: 'fdiv-1994',
  source: 'history',            // 'history' | 'procedural'
  year: 1994, week: 43,         // history only; procedural uses weighted triggers
  shape: 'decision',            // 'notice' | 'decision' | 'interrupt'
  actor: 'imtel',               // roster id
  requires: { segment: 'cpu', minShare: 0 },   // trigger conditions
  chains: 'fdiv-1994-lawsuit',  // cascades: FDIV -> lawsuit -> stock hit -> layoffs
  choices: [
    { label: 'recall', cash: -0.08, narrative: -6, reputation: +8 },
    { label: 'deny it', cash: 0, reputation: -22, andThen: 'fdiv-1994-lawsuit' },
  ],
  text: 'floating-point bug found in the fpu. a teacher found it with a spreadsheet.'
}
```

Procedural events take the same shape with `source: 'procedural'` and no `year`: they are
drawn when their trigger fires, and their actor is a fictional brand or the player.

**Counts:** ~120 authored history events for 1990–2026 (25 in the M1 slice), plus ~80
procedural templates across the seven categories — market, supply, scandal, geopolitical,
cycle, corporate, positive.



---

## 3e. Product design loop

The generation loop of §3b in detail. One screen serves all 175 products because the
designer is generated from the catalogue's `specs` — a new category gets a working design
sheet for free (`§4a`).

```
pick a thing → choose its guts → decide make-or-buy → read the four numbers
   → commit (tooling + weeks) → ramp → launch → harvest → retire
```

### 3e.1 The four numbers

Every design decision moves these four, and they are pinned in the rail for the whole
wizard. Nothing else is a headline, because four is what a player can hold in their head.

| Number | Means | Comes from |
|---|---|---|
| **unit cost** | what one unit costs the day it ships — becomes **landed cost** at stage 11, once freight and tariff are known | BOM at *current* yield + contract unit prices + freight + tariff |
| **perf** | how it compares to the segment's expectation *this year* | weighted specs vs segment curve — not a raw score |
| **defect risk** | chance per hundred units of a return, and of a recall-class flaw | underspec vs node maturity, thermal headroom, supplier `maxDefect`, board score, carrier damage |
| **time to market** | weeks from release to first sellable unit | tape-out or pcb lead + assembly lead + transit + certification |

The tension between them is the game: perf costs unit cost, unit cost buys demand, defect
risk is where cheap becomes expensive, and time to market is where perfection becomes
irrelevant.

**Margin is the fifth number, and it only appears at stage 12**, because until you pick a
price there is no margin to show — and showing an estimate earlier would let the player
tune the design to a number they have not chosen yet.

### 3e.2 The wizard — twelve stages, one screen

One flow, left to right. **Nothing is spent and nothing locks until stage 9.** Stages
10–12 are launch configuration: the product exists and is being built, but it is not on
sale until it has a place, a carrier and a price.

| # | Stage | What the player does | What it moves |
|---|---|---|---|
| 1 | **product selection** | pick the catalogue row. Era-gated, and an unavailable row says why (`needs 16-bit core · research 1993`) instead of vanishing | — |
| 2 | **name & series** | name the model, file it under a series | brand, series equity |
| 3 | **components** | every input, **stacked vertically and grouped by its own category** — one scroll, not a stage per part. Contracts attach here | unit cost, perf, defect risk |
| 4 | **pcb puzzle** | lay the parts out and route them | board cost, defect risk, size |
| 5 | **enclosure** | material, finish, volume, wall thickness | cost, thermal, perceived quality |
| 6 | **features** | toggles — backlight, wireless, hot-swap, extras | BOM, appeal, defect risk |
| 7 | **intended use** | who it is for: segment and channel | which expectations the review grades against |
| 8 | **datasheet** | the sheet writes itself; add up to three lines of flourish | attention, expectations |
| 9 | **release** | **the irreversible act** — tooling and NRE are spent, the sheet locks, production starts, the clock runs | cash, ramp clock |
| 10 | **release place** | which territories: home first, others as they unlock. Certification per place costs money and weeks | tariff, demand size, review strictness |
| 11 | **shipping** | pick a carrier per place | landed cost, transit, damage rate |
| 12 | **price** | the slider, now against **landed** cost, with margin and the demand curve under it | margin, orders |

**Why the tail is ordered this way.** It is not a form — it is a ramp. Release starts
production; the first units are still weeks away. Stages 10–12 are what you do *while the
line is running*, and there is a real cost to dawdling: units accumulate in a warehouse
with nowhere to go. The wizard can be closed and resumed between 9 and 12, which is
exactly what a player at 16× will do.

**Stage 3 is where the design is won or lost.** Components are not a sequence of screens —
that would be twenty stages for a phone. They are **categories, each a section of one
scroll**:

```
compute     mcu ................. [ yours ] [ fab b ✓ ] [ spot ]
            memory .............. [ 512 kb ] [ 1 mb ▲ ]
power       battery ............. [ none ] [ aaa ] [ coin ]
io          switches ............ [ membrane ] [ mechanical ✓]
            cable ............... [ usb-a ] [ usb-c 1996 ]
mechanical  case ................ [ printed ✓ ] [ bought ]
```

Each row: the part, the options, a source chip, and its live effect on the four numbers.
A category with nothing in it collapses to one line.

**Contracts live on rows, not on a screen.** A contract is a *source chip*. If you have
signed `fab b`, the mcu row offers it, and attaching it swaps spot for contracted:

```
mcu    spot $4.20 · 2 wk   │  fab b contract $3.30 · 9 wk   ✓ attached
```

Cheaper per unit, longer to wait. The three contract kinds attach to different rows —
**fab** to dies, **factory** to assembly, **pcb** to the board — so a single product can
carry three separate deals, and its lead time is the **maximum** across inputs, not the
sum.

**Stage 5, the pcb puzzle.** Deterministic, thirty to ninety seconds:

- place the parts you selected onto a grid (8×6 for a keyboard, 12×8 for a device);
- route the connections — crossings are violations, long traces cost signal integrity;
- four constraints make it a puzzle rather than decoration: **board area** (cost),
  **layer count** (2 = cheap and hard, 4 = dear and easy), **heat** (power parts away from
  sensitive ones), **connector reach** (ports must touch an edge);
- the result scores into defect risk — a clean board is worth a few review points, a
  crossed one is a return rate;
- **auto-route** exists, costs money, and is never as good as a careful board.

Same parts, same board, every time — so a save round-trip is stable.

**Stage 8, the datasheet.** Generated in spec-sheet language — `5 V ±5%`, `pin 3: ground`,
`adapter: usb-a to ps/2`, `rated 20 ma`, `operating 0–40 °C` — plus up to three lines of
flourish the player writes or picks. Flourish is a **claim**: it buys attention at launch
and costs review if it oversells what the sheet actually says. It can never be false,
because the vocabulary only offers things this design can claim.

**Stage 9, release.** The only stage whose button does not say *next*. It spends the
tooling or NRE, locks every earlier stage, and starts the ramp clock.

**Stage 10, release place.** Home market first and cheap. Others unlock by year and cost
real money and weeks to certify — the model for the 1990s is a home territory plus
two or three export markets, not a global launch. Each place carries a tariff, a demand
multiplier, and its own strictness of expectation; a product that reviews well at home can
review poorly where the comparable is better.

**Stage 11, shipping.** Three fictional carriers, same shape as the fab/factory/pcb houses
— personality expressed in the numbers, never in a stat block:

| Carrier | Cost / unit | Transit | Damage | Note |
|---|---|---|---|---|
| **fadex** | high | 2–4 days | very low | tracking on every parcel; the default for a launch window |
| **velmo** | low | 10–18 days | spikes on fragile goods | fine for a cheap line, painful in december |
| **shipper** | lowest | 5–9 weeks | low | freight consolidator, minimum 200 units, per-pallet |
| *post* | pennies | 3–10 days | high, untracked | act 0 only — you walk to the counter |

Damage lands in defect escapes, so a cheap carrier quietly costs reviews. Transit is part
of time to market and part of the lead time between a price change and its effect.

**Stage 12, price.** Against landed cost now, with the demand curve drawn under the
slider and margin on the rail. A product left unpriced after release accrues inventory and
earns nothing — the desk says so rather than letting it drift.

### 3e.3 Series

A series is a name that outlives a model: `nova k1 → k2 → k3`. Filing a design under an
existing series carries its reviews forward at a fraction, which is why a good series is
worth more than a good product. It also constrains: one series holds at most four live
models, and a retired series decays.

### 3e.4 After release

4. **Ramp.** Yield starts low and climbs with cumulative units made (a learning curve, not
   a switch). A new node starts worse. The ramp is why the first thousand units are
   expensive and the ten-thousandth is not — and it is why stages 10–12 have slack in them.
5. **Launch.** When the first priced unit is sellable, the review is computed from weighted
   components — **all shown**: perf vs segment, defects escaped, price vs nearest
   alternative, delivery speed. Per-place: the same product grades differently in two
   territories.
6. **Harvest.** Price is a live slider per place, with the demand curve under it. Volume
   splits by the sell-or-consume ratio (§4a): sold units earn cash and arm rivals; consumed
   units make your own products cheaper. Switching carrier mid-life is allowed and has a
   week of transition where transit doubles.
7. **Refresh or retire.** A refresh is the same product with one variant bumped — half the
   tooling, half the time, resets the review decay. A retire stops support cost, frees the
   name, and — if it is still listed — takes four weeks to run out of stock.

### 3e.5 What a design costs, by act

| | Act 0 (rig) | Act 1 (suppliers) | Act 2+ (silicon) |
|---|---|---|---|
| To release | nothing — the rig prints this week | pcb tooling 200–2,000 | NRE + shuttle seat 3,000–8,000 |
| Time to first unit | 1 week | 3–8 weeks | 12–16 weeks |
| Certification | none, home only | 400–1,500 per export market | 2,000–15,000 per market |
| Carrier | post | fadex / velmo / shipper | all three, per place |
| What can go wrong | scrap (12%/print), post loses parcels | supplier miss, MOQ trap, certification delay | yield, mask respin, defect escape, tariff |

A **mask respin** (a defect found in the first silicon) is deliberately the most expensive
mistake in the game: it costs the NRE again and four months. Prototyping before committing
is the mitigation, and prototyping costs a week and 5% of the NRE — cheap enough to be
worth doing, expensive enough to skip when you are in a hurry.

**Exporting is what makes stage 10 expensive.** Home is nearly free; the second market is a
month of paperwork and a few hundred; the fourth is a lawyer and a testing house. That
keeps the 1990s feeling small — one market until you can afford two — without ever banning
a territory.

### 3e.6 Designs are assets

A released design is stored as a board row: specs, BOM and contract decisions, board
score, enclosure and features, **places, carrier per place, price per place**, yield curve
position, review history per place, units sold, cumulative profit (which is what the desk
chart plots per product). It survives refreshes. It can be **re-spun** onto a newer node later at reduced
NRE — the cheapest way to keep an old product alive, and usually a mistake for the same
reason it is cheap.

**Reverse engineering:** a design you have shipped for 26 weeks can be cloned by a rival
of sufficient size, at a cost to them. This is the counterweight to sitting on one good
product forever.

### 3e.7 Act 0's version of the loop

Deliberately thin: the same twelve stages, with half of them one field or empty.

```
1  product    keyboard | mouse | keycaps | case
2  name       one field; "series" is the model family name
3  components case ✓ printed · switches · cable · mcu · pcb   (no contracts yet)
4  pcb puzzle 4x3, three parts — fifteen seconds, winnable by luck
5  enclosure  printed: shape, wall thickness, profile
6  features   backlight (no), wireless (no — not until 1994)
7  intended   home office | bedroom | gift
8  datasheet  auto, plus one line of flourish
9  release    the rig starts printing this week; no tooling to spend
10 place      home market only — the export question has not been invented yet
11 shipping   post, or "hand it over at the fair". damage is real, tracking is not
12 price      your only real lever, and the one the act is teaching
```

No tooling, no ramp, no respin. The four numbers are all it has, and all four already
matter. The act teaches the sheet while nothing is irrevocable, and teaches the puzzle
while the stakes are a day's resin.

The **pcb puzzle in act 0 is 4×3 with three parts**; act 1 is 8×6; act 2 is 12×8 with
layer pressure. One mechanic taught by growing it rather than a new one per act.

**Open:** whether prototypes are in the M1 slice or act 0 only; how many refresh cycles
before a product's demand curve is dead regardless of review.

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

### 5a. Design language — **Neo-Brutalism, dark by default**

> Superseded text below is the original editorial direction and is kept only for the token
> table's history. **The live language is Neo-Brutalism** (`src/styles/tokens.css`): 3px ink
> borders, zero-blur offset shadows, saturated accent blocks, heavy lowercase type, ice-blue
> accent `#6FD0FF`. The serif/editorial palette described here is not what ships.


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
- Middle: **four** nav icons — design, lab, fab, marketing — at 24px with a 10px label under each, then a **double-arrow** button. Active item fills with the accent.
- The double arrow opens a **sections drawer** (252px) that slides out from under the rail: market, browser, employee, contracts, pip, finance, news, company. Closed it sits a full width to the left of its open position, hidden behind the rail; opening translates it right in, closing translates it back, 260ms, same easing both ways. Escape and any click outside close it, and picking a section closes it.
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

**Built: outbound contracts** (`src/app/outbound.js`, `src/ui/offer.js`, `src/styles/offer.css`). The other half of the loop — contracts *you* write and send to an OEM or brand, rather than sheets you sign. Ten counterparties from the roster (pomelo, dello, lenova, asux, acre, nokio, bramble, kyoto toys, sego, hewlin packard), each with a weight vector over the eight axes a buyer reads. Six sections, **two boxes each**: what you supply, exclusivity, price basis, volume, payment terms, late delivery. Verdicts are seeded from (save, buyer, tick, choices), so a reload cannot reroll a negotiation. Consequence of the balance check: all-A and all-B sheets almost never land — the accepted sheets are the mixed ones, which is the intended lesson. Every buyer is winnable (2–4 of 64 combinations accepted outright, 4–10 countered).

**Built: the suppliers screen** (`src/ui/contracts.js`, `src/styles/contracts.css`). The drawer's `contracts` entry now opens a real screen: four tabs (fab / factory / pcb / shipping), three houses each, one page per sheet, and a commitments readout in the header (signed, up-front, slowest lead). Opening a sheet is reading it — an unread sheet cannot be signed, countered, summarised or compared. One counter-offer per contract, permanently spent once used. Offers are seeded from the save id, so a reload cannot reroll a deal.

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

**Entry screens have no chrome.** The main menu and the founding form are the only two screens without a sidebar or HUD. Before a company exists there is no clock, no runway and no section to navigate to, so a column of disabled icons is noise on what is really a login screen. The menu is one column of rows on ink rules — wordmark, the company (or "no company yet"), then the list — with lime spent only on a 26px mark and a 4px edge on the row that is actually next. The sidebar arrives with the desk.

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
1. **Design** a CPU: die area, cache, clock, pipeline depth, node choice. Live perf + BOM + thermal estimate. (Designer UI generated from the category schema, so the next category needs no new screen — loop in §3e.)
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

## 9. Open questions

Everything below is still undecided. Answered questions have been removed and their
answers live in the sections that own them.

1. **Act 0's constants.** Rig slots (16/week), scrap (12%), living costs (150/week) and the
   four SKUs' BOM are my proposals, not your numbers. They set the pace of the whole first act.
2. **Difficulty.** Fixed, or selectable — and if selectable, does it scale starting savings,
   rival aggression, or both?
3. **Mobile.** The brief says browser *and* mobile. The desk is a fixed viewport at 100vh with
   a three-column body; phones need a decision about what the desk becomes, not a media query.
4. **Audio.** Never designed. Decide whether the game has sound at all before UI hooks get built.
5. **Prototypes.** A week and 5% of NRE buys a prototype that de-risks a mask respin. Is that in
   the M1 slice, or act 0 only?
6. **Refresh lifetime.** How many refresh cycles before a product's demand curve dies regardless
   of review?

## 10. Planning backlog — what is still undesigned

Ordered by what blocks the most work. Everything in §3–§3e is specified; this is the rest.

### 10a. Blocks the first playable act (the bedroom)

| # | Missing | Why it blocks | Rough scope |
|---|---|---|---|
| 1 | **Act 0 economy numbers** — rig slots, scrap rate, resin cost, living costs, the four SKUs' BOM/price | the sim cannot start without constants | one table, tuned by the balance harness |
| 2 | **Demand & review model** — how orders arrive, what a review grades, how price moves volume | every act uses it; act 0 is where it must be legible | segments, price elasticity, review components |
| 3 | **The rig / production model** — slots, queue, scrap, lead time on bought parts | the only factory the player has in act 0 | weekly pipeline, same shape as fabs so act 2 reuses it |
| 4 | **Save format & versioning** — schema, migration, what happens when the sim changes | saves exist already but only carry stubs | version field, migration table, round-trip test |
| 5 | **The scorecard** — what 2055 grades | now that the stop is decided, the shape of the whole run is undefined | 8–10 figures, shown at the end |

### 10b. Blocks act 1 (suppliers)

| # | Missing | Why |
|---|---|---|
| 6 | **R&D / lab** — how RP accrues, project slots, tree shape, date gates | the garage sells nothing new without it |
| 7 | **Rival AI** — personalities exist in `BRANDS.md`, no decision rules | the market is static without it |
| 8 | **Finance** — debt facility terms, valuation formula, taxes | the gate hands you suppliers; the bank hands you rope |
| 9 | **Employees** — hiring, morale, attrition, review | the state shape has them; nothing gives them behaviour |
| 10 | **Marketing** — campaigns, segment reach, decay | the rail has the drawer entry and no mechanic behind it |
| 11 | **Browser / intel** — what money buys, how PIP is gated by it | PIP's answers depend on it |

### 10c. Blocks act 2+ (silicon)

| # | Missing | Why |
|---|---|---|
| 12 | **Fab ownership** — capex, capacity, wafer starts, multi-product allocation | buying your own line is the act's whole promise |
| 13 | **Patents & litigation** — filing, defence, countersuit | mentioned three times, designed zero |
| 14 | **Stock market / IPO** — when, at what price, and what it changes | late-game capital formation |
| 15 | **M&A / takeover** — buying a rival, being bought | the exit |

### 10d. Screens with no spec

The rail is built; the destinations are not. Each needs a one-page contract: what is on it, what
changes weekly, what the player can do — then it is a data view over sim state.

`market` · `browser` · `employee` · `fab` · `finance` · `news` · `company` · `lab` · `pip panel`

### 10e. Cross-cutting

| # | Missing | Note |
|---|---|---|
| 16 | **Difficulty** — fixed, or scaling rival aggression and starting capital | cheapest before the sim exists |
| 17 | **Onboarding** — act 0 is the tutorial; is there also help text or a codex? | affects copy volume, not systems |
| 18 | **Mobile / touch** — the original brief said browser and mobile | the desk is a fixed viewport; phones need a decision, not a media query |
| 19 | **Audio** — never designed | decide whether there is any before building UI hooks |
| 20 | **Balance targets** — the harness exists in principle, no pass/fail numbers beyond bankruptcy and share | needs the act-0 constants first |

### 10f. What I would do next

1. **Act 0 economy table** and **demand/review model** — together they make the bedroom playable, which is the first thing worth looking at.
2. **Save versioning** — cheap now, expensive after a hundred saves exist.
3. **One screen spec** (`market`) as the template for the other eight.
4. Everything else waits for a playable act 0.
