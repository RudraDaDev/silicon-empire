/**
 * PIP's adapter — the only place the game talks to the language engine.
 *
 * The engine (NLP-LITE-SMALLHOURS.js) is a UMD bundle: it understands intent,
 * sentiment, questions, claims and clause splitting, but it is a *narrative*
 * engine — "why did my reviews drop" parses to qtype "why" with no topics.
 * This adapter adds the game lexicon and turns engine output into an answer.
 *
 * Rules this file exists to enforce:
 *   · PIP never acts. Every answer is text plus a pointer.
 *   · Answers are a function of (tick, question, world). No Math.random, no
 *     Date.now — the engine's own pick() is deliberately not used, because it
 *     draws from Math.random and would break determinism.
 *   · PIP can only summarise a contract the player has already read.
 */

/* ── deterministic noise: same question on the same tick gives one answer ── */

function hash32(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

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

/** A stable stream for one (tick, question) pair. Re-asking cannot reroll. */
function streamFor(seedSalt, tick, text) {
  return mulberry32(hash32(`${seedSalt}|${tick}|${text.toLowerCase().trim()}`));
}

function choose(rnd, options) {
  return options[Math.floor(rnd() * options.length)];
}

/* ── the game's lexicon, laid over the narrative engine's parse ─────────── */

const TOPICS = [
  ['contract', /\b(contracts?|deals?|terms|clauses?|agreements?|sign(ing)?|suppliers?|fabs?|factor(y|ies)|pcb house)\b/],
  ['price', /\b(prices?|pricing|margins?|markup|undercut|cheaper|expensive)\b/],
  ['cash', /\b(cash|money|runway|broke|afford|budget|savings|loan|debt|bank)\b/],
  ['reviews', /\b(reviews?|ratings?|reputation|quality|defects?|returns?)\b/],
  ['capacity', /\b(capacity|slots|rig|printer|wafer|throughput|output|idle)\b/],
  ['demand', /\b(demand|orders?|sell|sales|units|backlog|queues?)\b/],
  ['rivals', /\b(rival|competitor|competition|imtel|amb|nivida|market share)\b/],
  ['marketing', /\b(marketing|advert|campaign|promo|brand)\b/],
  ['staff', /\b(staff|hire|hiring|engineer|morale|employees?|salary)\b/],
];

const WANTS_OPINION = /\b(your opinion|your view|what do you think|yourself|do you think|your call|in your eyes|would you)\b/i;
const WANTS_SUMMARY = /\b(summari[sz]e|summary|run me through|run through|tl;?dr|explain|what does .* say)\b/i;
const WANTS_COMPARE = /\b(compare|versus|vs\.?|better than|which is better|which one)\b/i;
const WANTS_PREDICT = /\b(will|going to|predict|forecast|expect|next (week|month|quarter|year)|from now)\b/i;
const WANTS_ACTION = /\b(sign|buy|order|hire|fire|set|raise|lower|place|do)\b[^.?!]*\bfor me\b|\bdo it\b|\bgo ahead\b|\bhandle it\b|\bjust do\b/i;
const WANTS_ADVICE = /^(should|shall|is it worth|worth|do i|would it|can i afford|which)\b/i;

export function classify(engine, text) {
  const raw = String(text ?? '');
  const an = engine.analyze(raw);
  const low = ` ${an.t} `;

  let topic = null;
  for (const [id, re] of TOPICS) if (re.test(low)) { topic = id; break; }

  return {
    an,
    topic,
    // the engine already detects opinion questions — trust it where it fires
    wantsOpinion: Boolean(an.opq) || WANTS_OPINION.test(low) || an.qtype === 'why' && /\b(you|your)\b/.test(low),
    wantsSummary: WANTS_SUMMARY.test(low),
    wantsCompare: WANTS_COMPARE.test(low),
    wantsPredict: WANTS_PREDICT.test(low),
    wantsAction: WANTS_ACTION.test(low),
    wantsAdvice: WANTS_ADVICE.test(low.trim()) || an.qtype === 'yn',
    isGreeting: Boolean(an.greet) || engine.isGreeting(raw),
    isFiller: engine.isFiller(raw),
    names: contractNames(low),
  };
}

function contractNames(low) {
  const names = [];
  const m = low.match(/\b(fab|factory|pcb)\s*([abc])?\b/g) || [];
  for (const hit of m) {
    const parts = hit.trim().split(/\s+/);
    if (parts[1]) names.push(`${parts[0]} ${parts[1]}`);
    else names.push(parts[0]);
  }
  return [...new Set(names)];
}

/* ── answer shapes ──────────────────────────────────────────────────────── */

const money = (n) => (n >= 1e6 ? `$${(n / 1e6).toFixed(2)}m`
  : n >= 1e3 ? `$${(n / 1e3).toFixed(1)}k`
  : n >= 10 ? `$${Math.round(n)}` : `$${n.toFixed(2)}`);
const pct = (n) => `${Math.round(n * 100)}%`;

/** Contracts carry their clauses as data — either flat or under `terms`. */
const termsOf = (c) => c.terms ?? c;

function clauseLine(c) {
  const t = termsOf(c);
  const bits = [];
  if (t.unitPrice != null) bits.push(`${money(t.unitPrice)}/unit`);
  else if (t.rate != null) bits.push(`${money(t.rate)}/parcel`);
  if (t.moq != null) bits.push(`moq ${t.moq}`);
  else if (t.minUnits != null) bits.push(`min ${t.minUnits}`);
  if (t.leadDays != null) bits.push(`${t.leadDays} days`);
  else if (t.transit != null) bits.push(`${t.transit} day transit`);
  if (t.paymentDays != null) bits.push(`net ${t.paymentDays}`);
  if (t.latePenalty != null) bits.push(`${pct(t.latePenalty)}/week late`);
  if (t.maxDefect != null) bits.push(`max ${pct(t.maxDefect)} defects`);
  if (t.damage != null) bits.push(`${pct(t.damage)} damaged`);
  return bits.join(' · ');
}

const MEANING = {
  moq: 'the smallest order they will accept',
  leadDays: 'how long from your order to their dock',
  paymentDays: 'how long you keep the money before you must pay',
  latePenalty: 'what a late delivery costs them — check it is actually enforced',
  maxDefect: 'the defect rate they promise, and your only lever when a batch is bad',
  nre: 'a one-off tooling charge, paid whether or not you sell a single unit',
  exclusive: 'a promise not to sell this elsewhere — it narrows your options later',
};

const fmtContract = (c) => c.name ?? `${c.house} ${c.kind}`;
const contractKey = (c) => `${c.house} ${c.kind ?? ''}`.trim();

/** Find a contract by the name the player typed, falling back to house+letter. */
function findContract(all, name) {
  const n = String(name || '').toLowerCase();
  if (!n) return null;
  return all.find((c) => String(c.name || '').toLowerCase() === n)
    ?? all.find((c) => String(c.name || '').toLowerCase().startsWith(n))
    ?? all.find((c) => contractKey(c).startsWith(n))
    ?? null;
}

function summaryOf(c) {
  const t = termsOf(c);
  const lines = [`${fmtContract(c)} — ${clauseLine(c)}`];
  if (t.moq != null) lines.push(`moq means ${MEANING.moq}.`);
  if (t.paymentDays != null && t.paymentDays >= 60) lines.push(`net ${t.paymentDays} is generous on paper; it only helps if they actually pay on time.`);
  if (t.nre != null) lines.push(`there is ${money(t.nre)} of nre on top of the unit price.`);
  if (t.leadDays != null && t.leadDays >= 70) lines.push(`${t.leadDays} days is a long lead — order before you need it, not when you need it.`);
  if (c.exclusive) lines.push('there is an exclusivity clause.');
  return lines;
}

function compareOf(a, b) {
  const ta = termsOf(a);
  const tb = termsOf(b);
  const A = fmtContract(a);
  const B = fmtContract(b);
  const out = [`${A} vs ${B}:`];
  const row = (label, av, bv, better, fmt) => {
    if (av == null || bv == null || av === bv) return;
    const winner = (better === 'lower' ? av < bv : av > bv) ? A : B;
    out.push(`${label}: ${winner} — ${fmt(Math.abs(av - bv))}.`);
  };
  row('unit price', ta.unitPrice, tb.unitPrice, 'lower', (d) => `${money(d)} cheaper per unit`);
  row('rate', ta.rate, tb.rate, 'lower', (d) => `${money(d)} cheaper per parcel`);
  row('lead time', ta.leadDays, tb.leadDays, 'lower', (d) => `${d} days faster`);
  row('transit', ta.transit, tb.transit, 'lower', (d) => `${d} days faster`);
  row('moq', ta.moq, tb.moq, 'lower', (d) => `${d} units smaller`);
  row('payment terms', ta.paymentDays, tb.paymentDays, 'higher', (d) => `${d} days longer to pay`);
  row('late penalty', ta.latePenalty, tb.latePenalty, 'higher', (d) => `${pct(d)} a week stronger`);
  row('damage rate', ta.damage, tb.damage, 'lower', (d) => `${pct(d)} less breakage`);
  if (a.exclusive !== b.exclusive) out.push(`${a.exclusive ? A : B} wants exclusivity; the other does not.`);
  if (ta.nre != null && tb.nre != null && ta.nre !== tb.nre) {
    out.push(`tooling: ${ta.nre < tb.nre ? A : B} — ${money(Math.abs(ta.nre - tb.nre))} cheaper up front.`);
  }
  if (out.length === 1) out.push('on the numbers i can see, they are the same sheet.');
  return out;
}

/* ── world answers: recall, explain, predict, advise, opinion ───────────── */

function recall(ctx, topic, rnd) {
  const { world } = ctx;
  if (topic === 'cash') {
    return {
      kind: 'recall',
      text: `${money(world.cash)} in hand, ${world.runwayWeeks} weeks of runway at the current burn.`,
      basis: 'your books, this week',
      refs: ['finance'],
    };
  }
  if (topic === 'reviews') {
    return {
      kind: 'recall',
      text: `${Math.round(world.reviews)} out of 100. ${world.reviewNote || 'it moves with defects, price against the nearest alternative, and how fast you ship.'}`,
      basis: 'your review history',
      refs: ['market'],
    };
  }
  if (topic === 'demand') {
    return {
      kind: 'recall',
      text: `${world.unitsThisWeek} units this week against ${world.ordersQueued} waiting.`,
      basis: `week ${ctx.tick} of the order book`,
      refs: ['market', 'design'],
    };
  }
  if (topic === 'capacity') {
    return {
      kind: 'recall',
      text: `${world.slotsUsed} of ${world.slots} print slots used. ${world.slots - world.slotsUsed === 0 ? 'the rig is the bottleneck this week.' : 'you are leaving capacity on the floor.'}`,
      basis: 'rig schedule',
      refs: ['fab'],
    };
  }
  return {
    text: choose(rnd, [
      'i can look that up if you name a number — cash, reviews, orders, slots.',
      'that one is in your own books rather than mine. try "what is my runway".',
    ]),
    basis: 'no matching record',
    refs: [],
  };
}

function predict(ctx, topic, rnd) {
  const conf = 0.55 + rnd() * 0.4;
  const horizon = ctx.horizonWeeks ?? 4;
  const drift = horizon <= 4 ? 0 : horizon <= 13 ? 0.1 : 0.2;
  const claim = pickClaim(topic, ctx, rnd);
  return {
    kind: 'predict',
    text: claim.text,
    confidence: Number((conf - drift).toFixed(2)),
    basis: claim.basis,
    claim: claim.claim,
    resolvesOnTick: ctx.tick + horizon,
    refs: claim.refs || [],
  };
}

function pickClaim(topic, ctx, rnd) {
  const w = ctx.world;
  if (topic === 'cash') {
    const soon = w.cash / Math.max(1, w.burnPerWeek);
    return {
      claim: `cash lasts ${Math.round(soon)} weeks`,
      text: `at ${money(w.burnPerWeek)} a week and ${money(w.cash)} in the bank, i make it ${Math.round(soon)} weeks before you are out — that is before any order comes in.`,
      basis: 'burn rate over the last 8 weeks',
      refs: ['finance'],
    };
  }
  if (topic === 'demand') {
    const dir = rnd() > 0.45 ? 'firm' : 'soften';
    return {
      claim: `orders ${dir} over the next quarter`,
      text: `i expect orders to ${dir} over the next quarter. reviews are ${Math.round(w.reviews)} and you are ${w.priceVsMarket > 0 ? `${pct(w.priceVsMarket)} above` : `${pct(-w.priceVsMarket)} below`} the nearest alternative.`,
      basis: 'order trend and relative price',
      refs: ['market', 'design'],
    };
  }
  if (topic === 'contract' || topic === 'capacity') {
    return {
      claim: 'lead times extend over the next quarter',
      text: 'lead times usually stretch when everyone is buying at once. if you need parts in eight weeks, order before the quarter turns.',
      basis: 'supplier lead-time history',
      refs: ['contracts', 'fab'],
    };
  }
  return {
    claim: 'nothing dramatic in the next month',
    text: 'nothing in the next month looks dramatic from here. the things that would change that are a rival launch or a supply shock.',
    basis: 'public feed only',
    refs: ['news'],
  };
}

function advise(ctx, topic, cl) {
  const w = ctx.world;
  if (topic === 'capacity' || cl.names.length) {
    return {
      text: `a second rig is about ${money(ctx.rigPrice ?? 6500)} and roughly ${ctx.rigSlots ?? 16} more slots a week. at your current margin that pays back in about ${Math.max(6, Math.round((ctx.rigPrice ?? 6500) / Math.max(1, w.weeklyProfit || 90)))} weeks — but only if orders are still queued when it arrives. if you are selling out every week, it is arithmetic; if not, it is optimism.`,
      basis: 'your margin, current order queue',
      refs: ['fab'],
    };
  }
  if (topic === 'price') {
    return {
      text: `you are at ${money(w.price)} against a nearest alternative of ${money(w.marketPrice)}. every 10% you cut buys you roughly ${Math.round((ctx.elasticity ?? 1.6) * 10)}% more orders and costs you ${pct(0.1)} of margin. cheap only wins if your cost per unit is below theirs.`,
      basis: 'your price, nearest comparable',
      refs: ['design', 'market'],
    };
  }
  return {
    kind: 'advise',
    text: 'tell me which lever you are looking at — price, slots, a contract, hiring — and i will lay out the arithmetic.',
    basis: 'needs a subject',
    refs: [],
  };
}

function opinion(ctx, topic, rnd) {
  const lines = {
    contract: [
      'if you want my honest read: i would not sign the first page you are shown. the numbers are rarely the problem — the lead time is.',
      'in my opinion the cheap sheet is the expensive one. it always looks cheaper because the cost shows up in a quarter you have not planned for yet.',
    ],
    price: [
      'personally i think you are priced like a company twice your size. that is fine if the reviews back it up. they do not, yet.',
      'my view: hold the price and fix the defect rate first. discounting a bad product just tells more people it is bad.',
    ],
    capacity: [
      'i lean towards buying the capacity. sitting on an empty order queue costs more than an idle machine, and you cannot sell what you cannot print.',
      'honestly? not yet. wait until you have turned away orders two weeks running — that is the only honest signal.',
    ],
    cash: [
      'my opinion is boring: keep three months of costs in hand and ignore everything else. you cannot out-think a cash crunch.',
      'i would rather be small and solvent than big and interesting. that is a bias, not a calculation.',
    ],
  };
  const pool = lines[topic] || [
    'my honest read is that you are asking me to have a feeling about numbers. the numbers are in your favour, but i would not bet the company on my feeling.',
    'i think you already know. you are asking because the answer is uncomfortable, not because it is unclear.',
  ];
  return {
    kind: 'opinion',
    text: choose(rnd, pool),
    basis: 'my read, not a calculation',
    refs: [],
  };
}

/* ── the public surface ─────────────────────────────────────────────────── */

export function createPip({ engine, seed = 1990, world = () => ({}) } = {}) {
  if (!engine) throw new Error('createPip needs the NLP engine');

  const unread = (ctx, name) => ctx.contracts.filter((c) => !c.read && (!name || `${c.house} ${c.kind}`.includes(name)));

  function contractAnswer(ctx, cl, rnd) {
    const read = ctx.contracts.filter((c) => c.read);

    if (cl.wantsCompare) {
      const mentioned = (cl.mentioned || []).filter((c) => c.read);
      const picked = mentioned.length >= 2
        ? mentioned.slice(0, 2)
        : cl.names.length >= 2
          ? cl.names.map((n) => findContract(ctx.contracts, n)).filter((c) => c && c.read)
          : read.slice(0, 2);
      if (picked.length < 2) {
        return {
          kind: 'refuse',
          text: `you have read ${read.length} contract${read.length === 1 ? '' : 's'}. read two and i can put them side by side.`,
          basis: 'contracts you have opened',
          refs: ['contracts'],
        };
      }
      return { kind: 'compare', text: compareOf(picked[0], picked[1]).join('\n'), basis: 'the sheets you have read', refs: ['contracts'] };
    }

    const named = (cl.mentioned || [])[0] ?? (cl.names.length ? findContract(ctx.contracts, cl.names[0]) : null);
    if (named && !named.read) {
      return {
        kind: 'refuse',
        text: `${fmtContract(named)} is still unread. read it first — i will summarise it after, but i will not read it for you.`,
        basis: 'contract registry',
        refs: ['contracts'],
      };
    }
    const target = named || read[read.length - 1];

    if (!target) {
      const pending = unread(ctx, cl.names[0]);
      return {
        kind: 'refuse',
        text: pending.length
          ? `that one is still sitting unread. open it and read it — i will summarise it after, but i will not read it for you.`
          : 'i have no contract of yours on file yet.',
        basis: 'contract registry',
        refs: ['contracts'],
      };
    }

    if (cl.wantsOpinion) {
      return {
        kind: 'opinion',
        text: `on ${fmtContract(target)}? ${choose(rnd, [
          'i would take it, but i would ask for the penalty clause to be mutual.',
          'my read: the price is fine and the lead time is the thing that will hurt you.',
          'in my opinion it is a fair sheet for a first deal. fair is not the same as good.',
        ])}`,
        basis: 'my read, not a calculation',
        refs: ['contracts'],
      };
    }

    return { kind: 'summary', text: summaryOf(target).join('\n'), basis: 'the sheet you read', refs: ['contracts'] };
  }

  function ask(text, ctx) {
    const tick = ctx.tick ?? 0;
    const rnd = streamFor(seed, tick, text);
    const cl = classify(engine, text);
    const w = { ...world(), ...ctx.world };

    if (cl.isFiller) return { kind: 'filler', text: choose(rnd, ['go on.', 'i am listening.']), basis: '', refs: [] };
    if (cl.isGreeting) return { kind: 'greet', text: choose(rnd, ['morning. what are we looking at?', 'here. ask me something specific.']), basis: '', refs: [] };

    const full = { ...ctx, world: w, tick };

    // a house named in the sentence is a contract question, even without the word
    const lower = String(text || '').toLowerCase();
    cl.mentioned = (ctx.contracts ?? []).filter((c) => c.name && lower.includes(String(c.name).toLowerCase()));

    if (cl.wantsAction) {
      return {
        kind: 'refuse',
        text: choose(rnd, [
          'i do not sign, buy or set anything — that is yours to do. i can tell you what i make of the numbers first.',
          'not mine to do. put it in front of me as a question and i will give you the arithmetic.',
        ]),
        basis: 'scope: adviser only',
        refs: [],
      };
    }

    const aboutContract = cl.topic === 'contract'
      || cl.names.length > 0
      || cl.mentioned.length > 0;
    if (aboutContract && (cl.wantsSummary || cl.wantsCompare || cl.wantsOpinion || cl.names.length > 0 || cl.mentioned.length > 0 || cl.an.qtype === 'yn')) {
      return contractAnswer(full, cl, rnd);
    }

    const why = cl.an.qtype === 'why' && ['reviews', 'demand', 'cash'].includes(cl.topic);
    if (why) {
      const factors = (w.reviewFactors || []).slice(0, 3);
      return {
        kind: 'explain',
        text: factors.length
          ? `three things moved: ${factors.map((f) => `${f.label} (${f.effect > 0 ? '+' : ''}${f.effect})`).join(', ')}. the biggest is ${factors.slice().sort((x, y) => Math.abs(y.effect) - Math.abs(x.effect))[0].label}.`
          : `i can rank what changed if you let me record the components — reviews come from defects, price against the nearest alternative, and delivery speed. nothing single is to blame.`,
        basis: 'your own numbers, component by component',
        refs: ['market'],
      };
    }
    if (cl.wantsOpinion) return opinion(full, cl.topic, rnd);
    if (cl.wantsPredict) return predict(full, cl.topic, rnd);
    if (cl.wantsAdvice) return { kind: 'advise', ...advise(full, cl.topic, cl) };
    if (cl.topic === 'cash' || cl.topic === 'reviews' || cl.topic === 'demand' || cl.topic === 'capacity') {
      const base = recall(full, cl.topic, rnd);
      return { kind: 'recall', ...base };
    }
    if (cl.an.about && !cl.topic) {
      return { kind: 'chat', text: choose(rnd, ['still here. the clock is yours.', 'i am fine. ask me about your own numbers instead.']), basis: '', refs: [] };
    }
    return { kind: 'advise', ...advise(full, cl.topic, cl) };
  }

  /** Prediction bookkeeping: call when the tick passes resolvesOnTick. */
  function settle(prediction, actual) {
    const hit = prediction.claim && actual ? String(actual).includes(String(prediction.claim)) : null;
    return { ...prediction, hit, settledOnTick: actual?.tick ?? null };
  }

  return { ask, settle, classify: (text) => classify(engine, text) };
}
