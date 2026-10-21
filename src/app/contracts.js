/**
 * Supplier contracts — nine houses and three carriers, generated once per save.
 *
 * Everything here is deterministic: the same save always sees the same twelve
 * offers with the same numbers, so a reload cannot reroll a deal and a player
 * cannot fish for a better sheet by refreshing. Terms are seeded from the save
 * id, not from Date.now or Math.random.
 */

const KEY = 'se.contracts.v1';

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

/* ── the roster ───────────────────────────────────────────────
   Personality lives in the numbers, never in a stat block. */

export const SUPPLIERS = [
  {
    id: 'fab-a', house: 'fab', service: 'shuttle broker', name: 'aurel semi',
    blurb: 'fills seats on shared wafer runs. cheap, and the dates are not yours to move.',
    bias: { price: 0.82, lead: 1.25, moq: 0.6, defect: 1.15, penalty: 0, nre: 0.7 },
  },
  {
    id: 'fab-b', house: 'fab', service: 'foundry', name: 'kestrel foundry',
    blurb: 'fast, and priced for people in a hurry. the quality clause is theirs to invoke.',
    bias: { price: 1.42, lead: 0.68, moq: 1.2, defect: 0.6, penalty: 1.6, nre: 1.25 },
  },
  {
    id: 'fab-c', house: 'fab', service: 'legacy foundry', name: 'northbridge',
    blurb: 'an older line with engineers who have seen every mistake twice. forgiving yield clause.',
    bias: { price: 1.05, lead: 1.0, moq: 1.0, defect: 1.35, penalty: 0.8, nre: 0.9 },
  },
  {
    id: 'fac-a', house: 'factory', service: 'box build', name: 'hollis assembly',
    blurb: 'assembles anything you can box. steady, unremarkable, will not surprise you.',
    bias: { price: 1.0, lead: 1.0, moq: 1.0, defect: 1.0, penalty: 1.0, nre: 0.8 },
  },
  {
    id: 'fac-b', house: 'factory', service: 'smt line', name: 'brightline',
    blurb: 'three smt lines and a queue. excellent boards, and they know what that is worth.',
    bias: { price: 1.3, lead: 0.75, moq: 1.4, defect: 0.55, penalty: 1.3, nre: 1.1 },
  },
  {
    id: 'fac-c', house: 'factory', service: 'flex build', name: 'padma flex',
    blurb: 'flexible runs, no rework clause. fine until the first bad batch, then very expensive.',
    bias: { price: 0.86, lead: 1.1, moq: 0.5, defect: 1.5, penalty: 0.4, nre: 0.6 },
  },
  {
    id: 'pcb-a', house: 'pcb', service: '2-layer', name: 'copperline',
    blurb: 'two layers, five hundred minimum, and a price nobody argues with.',
    bias: { price: 0.62, lead: 1.15, moq: 3.2, defect: 1.25, penalty: 0.9, nre: 0.5 },
  },
  {
    id: 'pcb-b', house: 'pcb', service: '4-layer', name: 'meridian pcb',
    blurb: 'four layers as standard. the board is easier, the sheet is dearer.',
    bias: { price: 1.35, lead: 0.95, moq: 0.9, defect: 0.7, penalty: 1.1, nre: 1.0 },
  },
  {
    id: 'pcb-c', house: 'pcb', service: 'quick-turn', name: 'quickturn',
    blurb: 'boards in a week. you pay for the week, and for the week after it too.',
    bias: { price: 1.9, lead: 0.3, moq: 0.7, defect: 0.85, penalty: 1.4, nre: 1.4 },
  },
  {
    id: 'ship-a', house: 'carrier', service: 'express', name: 'fadex',
    blurb: 'tracked on every parcel, and priced like it.',
    card: { rate: 3.4, transit: 3, damage: 0.002, minUnits: 1, paymentDays: 15 },
  },
  {
    id: 'ship-b', house: 'carrier', service: 'economy', name: 'velmo',
    blurb: 'slow and cheap. fragile goods arrive with stories.',
    card: { rate: 1.1, transit: 14, damage: 0.021, minUnits: 10, paymentDays: 30 },
  },
  {
    id: 'ship-c', house: 'carrier', service: 'freight', name: 'shipper',
    blurb: 'consolidated freight on pallets. cheap per unit, and you wait for the container.',
    card: { rate: 0.42, transit: 42, damage: 0.006, minUnits: 200, paymentDays: 45 },
  },
];

export const HOUSES = [
  { id: 'fab', label: 'fab', blurb: 'wafers and dies' },
  { id: 'factory', label: 'factory', blurb: 'assembly and box build' },
  { id: 'pcb', label: 'pcb', blurb: 'bare boards' },
  { id: 'carrier', label: 'shipping', blurb: 'getting it there' },
];

/* ── generation ───────────────────────────────────────────────── */

const round = (n, step) => Math.round(n / step) * step;
const pick = (rnd, lo, hi) => lo + rnd() * (hi - lo);

function generate(supplier, rnd) {
  if (supplier.house === 'carrier') {
    const c = supplier.card;
    return {
      id: supplier.id,
      house: supplier.house,
      name: supplier.name,
      service: supplier.service,
      blurb: supplier.blurb,
      read: false,
      signed: false,
      counterUsed: false,
      terms: {
        rate: round(c.rate * pick(rnd, 0.94, 1.06), 0.05),
        transit: Math.round(c.transit * pick(rnd, 0.9, 1.15)),
        damage: Number((c.damage * pick(rnd, 0.85, 1.3)).toFixed(4)),
        minUnits: c.minUnits,
        paymentDays: c.paymentDays,
      },
    };
  }

  const b = supplier.bias;
  const base = supplier.house === 'fab' ? 2.6 : supplier.house === 'factory' ? 3.1 : 0.85;
  const nreBase = supplier.house === 'fab' ? 4200 : supplier.house === 'factory' ? 1800 : 520;

  return {
    id: supplier.id,
    house: supplier.house,
    name: supplier.name,
    service: supplier.service,
    blurb: supplier.blurb,
    read: false,
    signed: false,
    counterUsed: false,
    terms: {
      unitPrice: Number((base * b.price * pick(rnd, 0.92, 1.08)).toFixed(2)),
      moq: round((supplier.house === 'pcb' ? 120 : 25) * b.moq * pick(rnd, 0.9, 1.2), 5),
      leadDays: Math.round(28 * b.lead * pick(rnd, 0.9, 1.15)),
      paymentDays: [15, 30, 45, 60][Math.floor(rnd() * 4)],
      latePenalty: Number((0.01 * b.penalty * pick(rnd, 0.8, 1.5)).toFixed(3)),
      maxDefect: Number((0.02 * b.defect * pick(rnd, 0.85, 1.25)).toFixed(3)),
      nre: round(nreBase * b.nre * pick(rnd, 0.85, 1.25), 50),
      priceReviewWeeks: [13, 26, 52][Math.floor(rnd() * 3)],
    },
  };
}

/* ── storage ──────────────────────────────────────────────────── */

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') ?? {};
  } catch {
    return {};
  }
}

function writeAll(all) {
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
    return true;
  } catch {
    return false;
  }
}

/** The twelve offers for one save. Generated once, then persisted. */
export function getContracts(saveId, seed = 1990) {
  if (!saveId) return [];
  const all = readAll();
  if (all[saveId]?.offers) return all[saveId].offers;

  const rnd = mulberry32(hash32(`${saveId}|${seed}|contracts`));
  const offers = SUPPLIERS.map((s) => generate(s, rnd));
  all[saveId] = { offers, signedAt: {} };
  writeAll(all);
  return offers;
}

function mutate(saveId, fn) {
  const all = readAll();
  const entry = all[saveId];
  if (!entry) return null;
  const next = fn(entry);
  all[saveId] = next;
  writeAll(all);
  return next;
}

/** Reading is the gate: an unread sheet cannot be summarised, compared or signed. */
export function markRead(saveId, id) {
  return mutate(saveId, (entry) => ({
    ...entry,
    offers: entry.offers.map((c) => (c.id === id ? { ...c, read: true } : c)),
  }));
}

export function sign(saveId, id, week = 1) {
  return mutate(saveId, (entry) => {
    const target = entry.offers.find((c) => c.id === id);
    if (!target || !target.read || target.signed) return entry;
    return {
      ...entry,
      signedAt: { ...entry.signedAt, [id]: week },
      offers: entry.offers.map((c) => (c.id === id ? { ...c, signed: true } : c)),
    };
  });
}

/** One counter per contract. It improves a single term and cannot be repeated. */
export function counter(saveId, id) {
  return mutate(saveId, (entry) => {
    const target = entry.offers.find((c) => c.id === id);
    if (!target || !target.read || target.signed || target.counterUsed) return entry;
    const rnd = mulberry32(hash32(`${saveId}|${id}|counter`));
    const t = { ...target.terms };
    if (target.house === 'carrier') {
      t.rate = Number((t.rate * (1 - pick(rnd, 0.05, 0.12))).toFixed(2));
    } else if (rnd() > 0.5) {
      t.unitPrice = Number((t.unitPrice * (1 - pick(rnd, 0.04, 0.1))).toFixed(2));
    } else {
      t.leadDays = Math.round(t.leadDays * (1 - pick(rnd, 0.08, 0.18)));
    }
    return {
      ...entry,
      offers: entry.offers.map((c) => (c.id === id
        ? { ...c, terms: t, counterUsed: true, countered: true }
        : c)),
    };
  });
}

export function resetContracts(saveId) {
  const all = readAll();
  delete all[saveId];
  writeAll(all);
}

/** What the signed sheets commit you to — shown in the header. */
export function commitments(offers) {
  const signed = offers.filter((c) => c.signed);
  return {
    count: signed.length,
    upFront: signed.reduce((sum, c) => sum + (c.terms.nre ?? 0), 0),
    slowestLead: signed.reduce((max, c) => Math.max(max, c.terms.leadDays ?? 0), 0),
    cheapest: signed.length
      ? signed.reduce((best, c) => ((c.terms.unitPrice ?? c.terms.rate) < (best.terms.unitPrice ?? best.terms.rate) ? c : best))
      : null,
  };
}
