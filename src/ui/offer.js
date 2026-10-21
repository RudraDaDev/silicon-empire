/**
 * Writing a contract, not signing one.
 *
 * Pick who you are offering to, then walk six sections — two boxes each — and
 * send it. The buyer answers against their own weights, so the same sheet that
 * pomelo accepts is the one lenova laughs at.
 */

import {
  BUYERS, SECTIONS, evaluate, recordOffer, listOffers, describeOffer, defaultChoices,
} from '../app/outbound.js';

const $ = (sel) => document.querySelector(sel);
const icon = (name, size = 16) => `<svg class="i i--${size}" aria-hidden="true"><use href="#i-${name}"/></svg>`;

const VERDICT_COPY = {
  accepted: 'they signed it back without a note. that is either a good deal or a cheap price.',
  countered: 'they want one clause changed. everything else is agreed.',
  declined: 'they passed. the sheet is not what they buy.',
  incomplete: 'finish every section — they will not read half a page.',
};

export function mountOffer({ save, onBack }) {
  const saveId = save?.id ?? null;
  const tick = save?.week ?? 1;
  const seed = save?.seed ?? 1990;

  let buyer = BUYERS[0];
  let choices = defaultChoices();
  let result = null;

  const buyerList = $('#offerBuyers');
  const stepsHost = $('#offerSteps');
  const verdictHost = $('#offerVerdict');
  const sendBtn = $('#offerSend');
  const progress = $('#offerProgress');

  document.querySelectorAll('[data-action="desk"]').forEach((b) => b.addEventListener('click', onBack));
  document.querySelectorAll('[data-action="contracts"]').forEach((b) => b.addEventListener('click', onBack));

  function renderBuyers() {
    buyerList.replaceChildren(...BUYERS.map((b) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'buyer-row';
      if (b.id === buyer.id) button.setAttribute('aria-current', 'true');
      button.innerHTML = `
        <span class="buyer-row__id">
          <span class="buyer-row__name"></span>
          <span class="buyer-row__tier">${b.tier} · ${b.region}</span>
        </span>
        <span class="buyer-row__wants"></span>`;
      button.querySelector('.buyer-row__name').textContent = b.name;
      button.querySelector('.buyer-row__wants').textContent = b.wants;
      button.addEventListener('click', () => {
        buyer = b;
        result = null;
        renderBuyers();
        renderVerdict();
      });
      return button;
    }));
  }

  function renderSteps() {
    stepsHost.replaceChildren(...SECTIONS.map((section, index) => {
      const block = document.createElement('section');
      block.className = 'sec';
      block.dataset.section = section.id;
      if (choices[section.id]) block.dataset.done = 'true';

      const head = document.createElement('header');
      head.className = 'sec__head';
      head.innerHTML = `
        <span class="sec__no">${String(index + 1).padStart(2, '0')}</span>
        <span class="sec__titles">
          <span class="sec__title"></span>
          <span class="sec__question"></span>
        </span>`;
      head.querySelector('.sec__title').textContent = section.title;
      head.querySelector('.sec__question').textContent = section.question;
      block.append(head);

      const boxes = document.createElement('div');
      boxes.className = 'sec__boxes';
      for (const option of section.options) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'box';
        button.dataset.option = option.id;
        if (choices[section.id] === option.id) button.setAttribute('aria-pressed', 'true');
        button.innerHTML = `
          <span class="box__label"></span>
          <span class="box__blurb"></span>
          <span class="box__note"></span>
          <span class="box__tick">${icon('check', 16)}</span>`;
        button.querySelector('.box__label').textContent = option.label;
        button.querySelector('.box__blurb').textContent = option.blurb;
        button.querySelector('.box__note').textContent = option.note;
        button.addEventListener('click', () => {
          choices = { ...choices, [section.id]: option.id };
          result = null;
          block.dataset.done = 'true';
          for (const other of boxes.children) other.removeAttribute('aria-pressed');
          button.setAttribute('aria-pressed', 'true');
          renderProgress();
          renderVerdict();
        });
        boxes.append(button);
      }
      block.append(boxes);
      return block;
    }));
  }

  function renderProgress() {
    const done = Object.values(choices).filter(Boolean).length;
    progress.textContent = `${done} of ${SECTIONS.length} sections`;
    progress.dataset.done = done === SECTIONS.length ? 'true' : 'false';
    sendBtn.disabled = done < SECTIONS.length;
  }

  function renderVerdict() {
    if (!result) {
      verdictHost.dataset.state = 'idle';
      const live = evaluate(buyer, choices, { seed, tick, id: describeOffer(choices) });
      verdictHost.innerHTML = `
        <p class="verdict__kicker">offering to</p>
        <p class="verdict__buyer"></p>
        <p class="verdict__body">${live.picked < SECTIONS.length
    ? 'pick both boxes in every section and i will tell you how it reads.'
    : 'ready to send. they will answer this week.'}</p>
        <div class="verdict__stats">
          <span><b>${live.risk}</b> your exposure</span>
          <span><b>${Math.round(live.ratio * 100)}</b> fit with them</span>
        </div>`;
      verdictHost.querySelector('.verdict__buyer').textContent = buyer.name;
      return;
    }

    verdictHost.dataset.state = result.verdict;
    const pct = Math.round(result.score * 100);
    verdictHost.innerHTML = `
      <p class="verdict__kicker">${result.verdict === 'accepted' ? 'signed' : result.verdict === 'countered' ? 'counter-offer' : 'declined'}</p>
      <p class="verdict__buyer"></p>
      <p class="verdict__body"></p>
      <div class="verdict__stats">
        <span><b>${result.risk}</b> your exposure</span>
        <span><b>${pct}</b> how it read</span>
      </div>
      ${result.counter ? `<div class="verdict__counter">
        <p class="verdict__counter-title">they will sign if section ${SECTIONS.findIndex((s) => s.id === result.counter.sectionId) + 1} becomes:</p>
        <p class="verdict__counter-body"></p>
        <button class="btn btn--sm btn--accent" type="button" id="acceptCounterBtn">take their terms</button>
      </div>` : ''}`;

    verdictHost.querySelector('.verdict__buyer').textContent = buyer.name;
    verdictHost.querySelector('.verdict__body').textContent = VERDICT_COPY[result.verdict];
    if (result.counter) {
      verdictHost.querySelector('.verdict__counter-body').textContent = `${result.counter.optionLabel} — ${result.counter.blurb}`;
      verdictHost.querySelector('#acceptCounterBtn').addEventListener('click', () => {
        choices = { ...choices, [result.counter.sectionId]: result.counter.optionId };
        result = null;
        renderSteps();
        renderProgress();
        // re-run with their clause accepted: this is the deal, or it is not
        const second = evaluate(buyer, choices, { seed, tick, id: describeOffer(choices) });
        result = second;
        recordOffer(saveId, {
          id: `${buyer.id}-${describeOffer(choices)}`,
          buyer: buyer.id,
          buyerName: buyer.name,
          choices: { ...choices },
          // they asked for this clause, so they sign it; only a decline stands
          verdict: second.verdict === 'declined' ? 'declined' : 'accepted',
          score: second.score,
          week: tick,
        });
        renderVerdict();
      });
    }
  }

  sendBtn.addEventListener('click', () => {
    result = evaluate(buyer, choices, { seed, tick, id: describeOffer(choices) });
    recordOffer(saveId, {
      id: `${buyer.id}-${describeOffer(choices)}`,
      buyer: buyer.id,
      buyerName: buyer.name,
      choices: { ...choices },
      verdict: result.verdict,
      score: result.score,
      week: tick,
    });
    renderVerdict();
  });

  renderBuyers();
  renderSteps();
  renderProgress();
  renderVerdict();

  return {
    destroy() {
      $('#offerBuyers')?.replaceChildren();
      $('#offerSteps')?.replaceChildren();
      $('#offerVerdict')?.replaceChildren();
    },
  };
}

/** Counts shown on the contracts screen so the loop is visible from there. */
export function offerSummary(saveId) {
  const rows = listOffers(saveId);
  return {
    total: rows.length,
    accepted: rows.filter((r) => r.verdict === 'accepted').length,
    pending: rows.filter((r) => r.verdict === 'countered').length,
  };
}
