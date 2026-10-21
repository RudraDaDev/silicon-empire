/**
 * PIP smoke test. Proves the engine loads headless, that answers are stable
 * within a tick, and that the refusal rules hold. Run: node tools/pip-smoke.mjs
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const require = createRequire(import.meta.url);
const engine = require(path.join(root, 'NLP-LITE-SMALLHOURS.js'));
const { createPip } = await import(path.join(root, 'src/pip/adapter.js'));

const world = {
  cash: 8400, runwayWeeks: 21, burnPerWeek: 400, reviews: 62,
  unitsThisWeek: 11, ordersQueued: 4, slots: 16, slotsUsed: 13,
  price: 89, marketPrice: 79, priceVsMarket: 0.126, weeklyProfit: 210,
};

const contracts = [
  { id: 'c1', house: 'fab', kind: 'a', read: true, unitPrice: 2.4, moq: 25, leadDays: 90, paymentDays: 30, latePenalty: 0.01, maxDefect: 0.04, nre: 3000 },
  { id: 'c2', house: 'fab', kind: 'b', read: true, unitPrice: 3.3, moq: 25, leadDays: 62, paymentDays: 15, latePenalty: 0.02, maxDefect: 0.02, nre: 4800 },
  { id: 'c3', house: 'pcb', kind: 'a', read: false, unitPrice: 0.9, moq: 500, leadDays: 15, paymentDays: 30 },
];

const pip = createPip({ engine, seed: 1990, world: () => world });
const ask = (q, tick = 41) => pip.ask(q, { tick, contracts });

const cases = [
  ['what is my runway?', 'recall'],
  ['why did my reviews drop?', 'explain'],
  ['will my orders grow next quarter?', 'predict'],
  ['what do you think about the fab b contract?', 'opinion'],
  ['summarise the fab a contract', 'summary'],
  ['compare fab a and fab b', 'compare'],
  ['summarise the pcb a contract', 'refuse'],   // unread: must not be summarised
  ['sign the fab deal for me', 'refuse'],       // actions out of scope
  ['should i buy a second rig?', 'advise'],
  ['hello', 'greet'],
];

let fail = 0;
for (const [q, want] of cases) {
  const a = ask(q);
  const ok = a.kind === want && typeof a.text === 'string' && a.text.length > 0;
  if (!ok) fail += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${q.padEnd(44)} -> ${a.kind}${a.kind === want ? '' : ` (wanted ${want})`}`);
}

const stable = JSON.stringify(ask('will my orders grow next quarter?')) === JSON.stringify(ask('will my orders grow next quarter?'));
const moves = JSON.stringify(ask('will my orders grow next quarter?', 41)) !== JSON.stringify(ask('will my orders grow next quarter?', 42));
console.log(`${stable ? 'PASS' : 'FAIL'}  same tick, same question, same answer`);
console.log(`${moves ? 'PASS' : 'FAIL'}  next tick gives a different answer`);
if (!stable || !moves) fail += 1;

// an unread contract must never appear in a summary
const leaked = ask('summarise the pcb a contract').text.includes('0.90');
console.log(`${leaked ? 'FAIL' : 'PASS'}  unread sheet never leaks its numbers`);
if (leaked) fail += 1;

console.log(`\n${fail ? `${fail} failing` : 'all passing'}`);
process.exit(fail ? 1 : 0);
