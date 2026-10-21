/**
 * Outbound contracts — the ones *you* write.
 *
 * Six sections, two boxes each. Every pick moves the offer along six axes, and
 * each buyer weighs those axes differently, so the same contract is generous to
 * one company and insulting to another. Nothing here is random at the point of
 * display: the verdict is seeded from (save, buyer, tick, choices), so a reload
 * cannot reroll a negotiation and re-sending the same offer gets the same answer.
 */

const KEY = 'se.offers.v1';

const hash32 = (str) => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
};

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ── who you can offer to ─────────────────────────────────────
   Weights are what they actually care about. A buyer with weight 0 on an axis
   does not read that clause at all, which is why the same sheet can be great
   for one and insulting to another. */

export const BUYERS = [
  {
    id: 'pomelo', name: 'pomelo', tier: 'P', region: 'US', year: 1990,
    wants: 'quality and exclusivity. they do not want your badge on a rival shelf.',
    weights: { price: 1, volume: 1, quality: 3, exclusivity: 3, payment: 0, penalty: 2, commitment: 1, flexibility: 0 },
  },
  {
    id: 'dello', name: 'dello', tier: 'P', region: 'US', year: 1990,
    wants: 'volume and price. direct sales, no patience for a story.',
    weights: { price: 3, volume: 3, quality: 1, exclusivity: 1, payment: 2, penalty: 1, commitment: 2, flexibility: 1 },
  },
  {
    id: 'lenova', name: 'lenova', tier: 'V', region: 'CN', year: 1990,
    wants: 'the lowest unit price you will write down, in volume.',
    weights: { price: 3, volume: 3, quality: 0, exclusivity: 0, payment: 2, penalty: 0, commitment: 1, flexibility: 1 },
  },
  {
    id: 'asux', name: 'asux', tier: 'P', region: 'TW', year: 1990,
    wants: 'variety and speed. a wide line-up means short runs, often.',
    weights: { price: 1, volume: 2, quality: 2, exclusivity: 0, payment: 1, penalty: 1, commitment: 0, flexibility: 3 },
  },
  {
    id: 'acre', name: 'acre', tier: 'V', region: 'TW', year: 1990,
    wants: 'price. that is the whole list.',
    weights: { price: 3, volume: 2, quality: 0, exclusivity: 0, payment: 1, penalty: 0, commitment: 0, flexibility: 2 },
  },
  {
    id: 'nokio', name: 'nokio', tier: 'P', region: 'FI', year: 1990,
    wants: 'a written penalty. they have been let down by suppliers before.',
    weights: { price: 1, volume: 2, quality: 2, exclusivity: 1, payment: 0, penalty: 3, commitment: 2, flexibility: 0 },
  },
  {
    id: 'bramble', name: 'bramble', tier: 'E', region: 'CA', year: 1992,
    wants: 'exclusivity and quality control. enterprise buyers hate surprises.',
    weights: { price: 1, volume: 1, quality: 3, exclusivity: 3, payment: 0, penalty: 2, commitment: 0, flexibility: 0 },
  },
  {
    id: 'kyoto-toys', name: 'kyoto toys', tier: 'P', region: 'JP', year: 1990,
    wants: 'quality first, and nobody else selling the same box.',
    weights: { price: 1, volume: 1, quality: 3, exclusivity: 2, payment: 0, penalty: 1, commitment: 1, flexibility: 1 },
  },
  {
    id: 'sego', name: 'sego', tier: 'V', region: 'JP', year: 1990,
    wants: 'speed to shelf. they would rather ship than polish.',
    weights: { price: 2, volume: 1, quality: 1, exclusivity: 0, payment: 1, penalty: 0, commitment: 0, flexibility: 3 },
  },
  {
    id: 'hewlin-packard', name: 'hewlin packard', tier: 'P', region: 'US', year: 1990,
    wants: 'scale and predictable terms. procurement runs the conversation.',
    weights: { price: 2, volume: 2, quality: 2, exclusivity: 1, payment: 2, penalty: 1, commitment: 2, flexibility: 1 },
  },
];

/* ── the six sections ─────────────────────────────────────────
   Each pick carries its effect on the five axes a buyer reads, plus what it
   costs *you*. `risk` is your exposure, not theirs. */

export const SECTIONS = [
  {
    id: 'supply',
    title: 'what you are supplying',
    question: 'is this a box with your name on it, or parts going into theirs?',
    options: [
      {
        id: 'finished',
        label: 'a finished product',
        blurb: 'you build the whole thing and ship it boxed. the buyer resells it.',
        effect: { quality: 2, volume: 1, price: -1, flexibility: -1 },
        risk: 1,
        note: 'your badge is on it, so their support calls are your support calls.',
      },
      {
        id: 'component',
        label: 'a component for their line',
        blurb: 'boards or assemblies into their factory. no box, no retail copy.',
        effect: { price: 2, quality: -1, flexibility: 1 },
        risk: 2,
        note: 'anonymous volume — but if they redesign, you are out with no warning.',
      },
    ],
  },
  {
    id: 'exclusivity',
    title: 'exclusivity',
    question: 'can you sell the same thing to their competitor?',
    options: [
      {
        id: 'exclusive',
        label: 'theirs alone',
        blurb: 'nobody else in their market gets this product for the term.',
        effect: { exclusivity: 2, quality: 1, price: -1, flexibility: -2 },
        risk: 3,
        note: 'one buyer, one order book. if they walk, you have no other shelf.',
      },
      {
        id: 'open',
        label: 'open to anyone',
        blurb: 'they get the same price as everyone else, and so does the rival.',
        effect: { exclusivity: -2, price: 1, volume: 1, flexibility: 2 },
        risk: 0,
        note: 'they will ask for a discount for the insult of being treated normally.',
      },
    ],
  },
  {
    id: 'price',
    title: 'price basis',
    question: 'is the number fixed, or does it move with your costs?',
    options: [
      {
        id: 'fixed',
        label: 'fixed for the term',
        blurb: 'one number, signed. your costs can do whatever they like.',
        effect: { price: 1, commitment: 2, flexibility: -1 },
        risk: 2,
        note: 'if a wafer price moves under you, the loss is yours.',
      },
      {
        id: 'cost-plus',
        label: 'cost plus, reviewed quarterly',
        blurb: 'your cost plus a stated margin, re-opened every thirteen weeks.',
        effect: { price: -2, commitment: -1, flexibility: 1 },
        risk: 0,
        note: 'fair, and buyers read it as "the price will go up".',
      },
    ],
  },
  {
    id: 'volume',
    title: 'volume',
    question: 'do they promise to take a number, or buy what they need?',
    options: [
      {
        id: 'commit',
        label: 'they commit to a minimum',
        blurb: 'a floor on the order book, take-or-pay for the term.',
        effect: { volume: 2, price: -1, commitment: 2, flexibility: -2 },
        risk: 1,
        note: 'you can build to it. if they go bust, you are a creditor.',
      },
      {
        id: 'open',
        label: 'no minimum',
        blurb: 'they buy as they need, no promises either way.',
        effect: { volume: -1, commitment: -1, flexibility: 2 },
        risk: 0,
        note: 'no floor means no reason to tool up for them.',
      },
    ],
  },
  {
    id: 'payment',
    title: 'payment terms',
    question: 'when do you get paid?',
    options: [
      {
        id: 'net-30',
        label: 'net 30',
        blurb: 'money arrives a month after the invoice.',
        effect: { payment: 1, price: 1 },
        risk: 0,
        note: 'tight for them, cheap for you.',
      },
      {
        id: 'net-60',
        label: 'net 60',
        blurb: 'two months of your cash sits in their account.',
        effect: { payment: -1, price: -1 },
        risk: 2,
        note: 'you are lending them working capital at no interest.',
      },
    ],
  },
  {
    id: 'penalty',
    title: 'late delivery',
    question: 'who carries the cost when the boat is late?',
    options: [
      {
        id: 'you',
        label: 'you take the penalty',
        blurb: 'a stated percentage of the order for every week you miss.',
        effect: { penalty: 2, quality: 1, price: -1 },
        risk: 2,
        note: 'their favourite clause, and the one you will pay.',
      },
      {
        id: 'none',
        label: 'no penalty either way',
        blurb: 'late is late, and nobody pays anybody.',
        effect: { penalty: -2, commitment: -1, flexibility: 1 },
        risk: 0,
        note: 'buyers read this as a warning about your lead times.',
      },
    ],
  },
];

const AXES = ['price', 'volume', 'quality', 'exclusivity', 'payment', 'penalty', 'commitment', 'flexibility'];

/* ── scoring ──────────────────────────────────────────────────── */

function totalsFor(choices) {
  const totals = Object.fromEntries(AXES.map((a) => [a, 0]));
  let risk = 0;
  let picked = 0;
  for (const section of SECTIONS) {
    const option = section.options.find((o) => o.id === choices[section.id]);
    if (!option) continue;
    picked += 1;
    for (const [axis, delta] of Object.entries(option.effect)) totals[axis] += delta;
    risk += option.risk;
  }
  return { totals, risk, picked };
}

function rawScore(buyer, totals) {
  let got = 0;
  for (const axis of AXES) got += (buyer.weights[axis] ?? 0) * totals[axis];
  return got;
}

/* The ceiling for each buyer: the best sheet that actually exists. Sections
   conflict — you cannot buy price and quality in the same box — so a naive
   per-axis maximum would mark winnable buyers unwinnable. 64 combinations is
   cheap enough to just enumerate once. */
const EVERY_THIRD = (() => {
  let combos = [{}];
  for (const section of SECTIONS) {
    combos = combos.flatMap((c) => section.options.map((o) => ({ ...c, [section.id]: o.id })));
  }
  return combos;
})();

const CEILING = new Map(
  BUYERS.map((b) => [b.id, Math.max(1, ...EVERY_THIRD.map((c) => rawScore(b, totalsFor(c).totals)))]),
);

function scoreOffer(buyer, choices) {
  const { totals, risk, picked } = totalsFor(choices);
  const ratio = Math.max(0, Math.min(1, rawScore(buyer, totals) / (CEILING.get(buyer.id) ?? 1)));
  return { ratio, risk, picked, totals };
}

export function evaluate(buyer, choices, { seed = 1990, tick = 1, id = 'd' } = {}) {
  const { ratio, risk, picked, totals } = scoreOffer(buyer, choices);
  const rnd = mulberry32(hash32(`${seed}|${buyer.id}|${tick}|${id}|${JSON.stringify(choices)}`));
  // a buyer's mood moves the line by a few points, never enough to flip a bad sheet
  const mood = (rnd() - 0.5) * 0.12;
  const verdictScore = ratio + mood;

  let verdict = 'declined';
  if (picked < SECTIONS.length) verdict = 'incomplete';
  else if (verdictScore >= 0.88) verdict = 'accepted';
  else if (verdictScore >= 0.66) verdict = 'countered';
  else verdict = 'declined';

  // what they would change: the single flip that helps them most
  let counter = null;
  if (verdict === 'countered') {
    let bestGain = -Infinity;
    for (const section of SECTIONS) {
      const current = section.options.find((o) => o.id === choices[section.id]);
      const other = section.options.find((o) => o.id !== choices[section.id]);
      if (!current || !other) continue;
      let gain = 0;
      for (const axis of AXES) gain += (buyer.weights[axis] ?? 0) * ((other.effect[axis] ?? 0) - (current.effect[axis] ?? 0));
      if (gain > bestGain) { bestGain = gain; counter = { section, option: other, gain }; }
    }
  }

  return {
    verdict,
    score: Number(Math.max(0, Math.min(1, verdictScore)).toFixed(3)),
    ratio: Number(ratio.toFixed(3)),
    risk,
    totals,
    counter: counter ? {
      sectionId: counter.section.id,
      sectionTitle: counter.section.title,
      optionId: counter.option.id,
      optionLabel: counter.option.label,
      blurb: counter.option.blurb,
    } : null,
  };
}

/* ── storage ──────────────────────────────────────────────────── */

function readAll() {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') ?? {}; } catch { return {}; }
}
function writeAll(all) {
  try { localStorage.setItem(KEY, JSON.stringify(all)); return true; } catch { return false; }
}

export function listOffers(saveId) {
  return readAll()[saveId] ?? [];
}

export function recordOffer(saveId, offer) {
  const all = readAll();
  const rows = all[saveId] ?? [];
  const next = { ...offer, id: offer.id ?? `o${rows.length + 1}`, week: offer.week ?? 1 };
  all[saveId] = [...rows.filter((r) => r.id !== next.id), next];
  writeAll(all);
  return next;
}

export function clearOffers(saveId) {
  const all = readAll();
  delete all[saveId];
  writeAll(all);
}

/** A short plain-language name for the offer, used in the list and in news. */
export function describeOffer(choices) {
  const find = (sid) => SECTIONS.find((s) => s.id === sid)?.options.find((o) => o.id === choices[sid]);
  const a = find('supply');
  const b = find('exclusivity');
  const c = find('volume');
  if (!a) return 'an unfinished offer';
  const bits = [a.label];
  if (b) bits.push(b.id === 'exclusive' ? 'theirs alone' : 'open');
  if (c) bits.push(c.id === 'commit' ? 'with a minimum' : 'no minimum');
  return bits.join(' · ');
}

export function defaultChoices() {
  return Object.fromEntries(SECTIONS.map((s) => [s.id, null]));
}
