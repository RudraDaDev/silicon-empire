/**
 * The suppliers screen. Nine houses, three carriers, one page each.
 *
 * Reading is the gate: a sheet is only "read" once it has been opened, and an
 * unread sheet cannot be signed, countered, summarised or compared. That is the
 * whole mechanic — the numbers are on the page, and the player has to look.
 */

import {
  HOUSES, getContracts, markRead, sign, counter, commitments,
} from '../app/contracts.js';

const $ = (sel) => document.querySelector(sel);
const money = (n) => (n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `$${n}`);
const pct = (n) => `${(n * 100).toFixed(n * 100 < 1 ? 2 : 1)}%`;

/* label, plain words, formatter */
const CLAUSES = {
  fab: [
    ['unit price', 'per good die', (t) => money(t.unitPrice)],
    ['minimum order', 'the smallest run they will take', (t) => `${t.moq} dies`],
    ['lead time', 'their dock to yours', (t) => `${t.leadDays} days`],
    ['tooling', 'paid once, before the first die', (t) => (t.nre ? money(t.nre) : 'waived')],
    ['payment terms', 'how long you keep the money', (t) => `net ${t.paymentDays}`],
    ['late penalty', 'what a late delivery costs them', (t) => (t.latePenalty ? `${pct(t.latePenalty)} a week` : 'none')],
    ['quality clause', 'the defect rate they promise', (t) => `max ${pct(t.maxDefect)}`],
    ['price review', 'when they may re-open the price', (t) => `every ${t.priceReviewWeeks} weeks`],
  ],
  factory: [
    ['assembly price', 'per finished unit', (t) => money(t.unitPrice)],
    ['minimum order', 'the smallest run they will take', (t) => `${t.moq} units`],
    ['lead time', 'their dock to yours', (t) => `${t.leadDays} days`],
    ['tooling', 'jigs and fixtures, paid once', (t) => (t.nre ? money(t.nre) : 'waived')],
    ['payment terms', 'how long you keep the money', (t) => `net ${t.paymentDays}`],
    ['late penalty', 'what a late delivery costs them', (t) => (t.latePenalty ? `${pct(t.latePenalty)} a week` : 'none')],
    ['quality clause', 'the defect rate they promise', (t) => `max ${pct(t.maxDefect)}`],
    ['price review', 'when they may re-open the price', (t) => `every ${t.priceReviewWeeks} weeks`],
  ],
  pcb: [
    ['board price', 'per bare board', (t) => money(t.unitPrice)],
    ['minimum order', 'the smallest run they will take', (t) => `${t.moq} boards`],
    ['lead time', 'their dock to yours', (t) => `${t.leadDays} days`],
    ['tooling', 'films and setup, paid once', (t) => (t.nre ? money(t.nre) : 'waived')],
    ['payment terms', 'how long you keep the money', (t) => `net ${t.paymentDays}`],
    ['late penalty', 'what a late delivery costs them', (t) => (t.latePenalty ? `${pct(t.latePenalty)} a week` : 'none')],
    ['quality clause', 'the defect rate they promise', (t) => `max ${pct(t.maxDefect)}`],
    ['price review', 'when they may re-open the price', (t) => `every ${t.priceReviewWeeks} weeks`],
  ],
  carrier: [
    ['rate', 'per parcel', (t) => money(t.rate)],
    ['minimum', 'the smallest consignment', (t) => `${t.minUnits} units`],
    ['transit', 'their counter to the buyer', (t) => `${t.transit} days`],
    ['damage', 'share arriving broken', (t) => pct(t.damage)],
    ['payment terms', 'how long you keep the money', (t) => `net ${t.paymentDays}`],
  ],
};

function icon(name, size = 16) {
  return `<svg class="i i--${size}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
}

export function mountContracts({ save, onBack }) {
  const saveId = save?.id ?? null;
  let offers = getContracts(saveId, save?.seed ?? 1990);
  let house = 'fab';
  let selected = null;

  const list = $('#supList');
  const sheet = $('#supSheet');
  const tabs = $('#supTabs');
  const commit = $('#supCommit');

  document.querySelectorAll('[data-action="desk"]').forEach((b) => b.addEventListener('click', onBack));

  function refresh() {
    offers = getContracts(saveId, save?.seed ?? 1990);
    if (selected) selected = offers.find((c) => c.id === selected.id) ?? null;
    renderTabs();
    renderList();
    renderSheet();
    renderCommit();
  }

  function renderTabs() {
    tabs.replaceChildren(...HOUSES.map((h) => {
      const count = offers.filter((c) => c.house === h.id).length;
      const signed = offers.filter((c) => c.house === h.id && c.signed).length;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'sup-tab';
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', h.id === house ? 'true' : 'false');
      button.innerHTML = `<span class="sup-tab__label"></span><span class="sup-tab__count">${signed}/${count}</span>`;
      button.querySelector('.sup-tab__label').textContent = h.label;
      button.addEventListener('click', () => {
        house = h.id;
        selected = null;
        renderTabs();
        renderList();
        renderSheet();
      });
      return button;
    }));
  }

  function renderCommit() {
    const c = commitments(offers);
    commit.innerHTML = `
      <span class="sup-commit__fig"><b>${c.count}</b> signed</span>
      <span class="sup-commit__fig"><b>${money(c.upFront)}</b> up front</span>
      <span class="sup-commit__fig"><b>${c.slowestLead ? `${c.slowestLead}d` : '—'}</b> slowest lead</span>`;
  }

  function renderList() {
    const rows = offers.filter((c) => c.house === house);
    list.replaceChildren(...rows.map((c) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'sup-row';
      button.dataset.id = c.id;
      if (selected?.id === c.id) button.setAttribute('aria-current', 'true');
      if (c.signed) button.dataset.signed = 'true';

      const lead = c.house === 'carrier' ? `${c.terms.transit} day transit` : `${c.terms.leadDays} day lead`;
      const price = c.house === 'carrier' ? `${money(c.terms.rate)}/parcel` : `${money(c.terms.unitPrice)}/unit`;

      button.innerHTML = `
        <span class="sup-row__body">
          <span class="sup-row__name"></span>
          <span class="sup-row__service"></span>
        </span>
        <span class="sup-row__terms">
          <span class="sup-row__price">${price}</span>
          <span class="sup-row__lead">${lead}</span>
        </span>
        <span class="sup-row__state">
          ${c.signed
    ? '<span class="pill pill--accent">signed</span>'
    : c.read
      ? '<span class="pill">read</span>'
      : '<span class="pill pill--quiet">unread</span>'}
        </span>`;
      button.querySelector('.sup-row__name').textContent = c.name;
      button.querySelector('.sup-row__service').textContent = c.service;

      button.addEventListener('click', () => {
        selected = c;
        if (!c.read) {
          markRead(saveId, c.id);
          refresh();
        } else {
          renderList();
          renderSheet();
        }
      });
      return button;
    }));
  }

  function renderSheet() {
    if (!selected) {
      sheet.dataset.empty = 'true';
      sheet.innerHTML = `
        <div class="sup-empty">
          ${icon('contract', 24)}
          <p class="sup-empty__title">no sheet open</p>
          <p class="sup-empty__body">pick a supplier on the left. opening a sheet is reading it — nothing here can be signed until you have.</p>
        </div>`;
      return;
    }
    sheet.dataset.empty = 'false';

    const c = selected;
    const rows = CLAUSES[c.house] ?? [];

    sheet.innerHTML = `
      <header class="sheet__head">
        <div class="sheet__id">
          <h2 class="sheet__name"></h2>
          <p class="sheet__meta"></p>
        </div>
        <span class="sheet__mark">${c.signed ? '<span class="pill pill--accent">signed</span>' : '<span class="pill pill--quiet">not signed</span>'}</span>
      </header>

      <p class="sheet__blurb"></p>

      <dl class="sheet__clauses"></dl>

      <footer class="sheet__foot">
        <p class="sheet__note" id="sheetNote"></p>
        <div class="sheet__actions">
          <button class="btn btn--sm" type="button" id="counterBtn">${icon('arrow', 16)} counter-offer</button>
          <button class="btn btn--sm btn--accent" type="button" id="signBtn">${icon('check', 16)} sign</button>
        </div>
      </footer>`;

    sheet.querySelector('.sheet__name').textContent = c.name;
    sheet.querySelector('.sheet__meta').textContent = `${c.service} · ${c.house === 'carrier' ? 'carrier' : c.house} · one page`;
    sheet.querySelector('.sheet__blurb').textContent = c.blurb;

    const dl = sheet.querySelector('.sheet__clauses');
    dl.replaceChildren(...rows.map(([label, plain, fmt]) => {
      const wrap = document.createElement('div');
      wrap.className = 'clause';
      wrap.innerHTML = `
        <dt class="clause__label"></dt>
        <dd class="clause__value"></dd>
        <span class="clause__plain"></span>`;
      wrap.querySelector('.clause__label').textContent = label;
      wrap.querySelector('.clause__value').textContent = fmt(c.terms);
      wrap.querySelector('.clause__plain').textContent = plain;
      return wrap;
    }));

    const note = sheet.querySelector('#sheetNote');
    const signBtn = sheet.querySelector('#signBtn');
    const counterBtn = sheet.querySelector('#counterBtn');

    if (c.signed) {
      note.textContent = 'signed. it binds every week this product runs.';
      signBtn.disabled = true;
      counterBtn.disabled = true;
    } else if (!c.read) {
      note.textContent = 'unread — open the sheet before you sign.';
      signBtn.disabled = true;
      counterBtn.disabled = true;
    } else if (c.counterUsed) {
      note.textContent = 'one counter per contract, and you have used it.';
      signBtn.disabled = false;
      counterBtn.disabled = true;
    } else {
      note.textContent = 'the number on the button is the binding one.';
      signBtn.disabled = false;
      counterBtn.disabled = false;
    }

    signBtn.addEventListener('click', () => {
      sign(saveId, c.id, save?.week ?? 1);
      refresh();
    });

    counterBtn.addEventListener('click', () => {
      counter(saveId, c.id);
      refresh();
    });
  }

  refresh();

  return {
    destroy() {
      $('#supList')?.replaceChildren();
      $('#supSheet')?.replaceChildren();
    },
  };
}
