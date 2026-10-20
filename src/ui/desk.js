/**
 * The desk. Renders a demo world until sim/ exists — the field names below
 * are the contract sim.advance() will produce (PLAN.md §3).
 */

const $ = (sel) => document.querySelector(sel);

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

export function weekToDate(week) {
  const w = Math.max(1, Math.min(52, week));
  const month = MONTHS[Math.min(11, Math.floor((w - 1) / 4.334))];
  const day = ((w - 1) % 4) * 7 + 3;
  return `${month} ${day}`;
}

export function fmtMoney(n) {
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}b`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}m`;
  if (abs >= 1e3) return `${sign}$${Math.round(abs / 1e3)}k`;
  return `${sign}$${Math.round(abs)}`;
}

/* ── demo world ───────────────────────────────────────────── */

const PRODUCTS = [
  { id: 'isx486', name: 'isx-486', colour: 'var(--series-1)', rate: 210_000 },
  { id: 'isx386', name: 'isx-386', colour: 'var(--series-2)', rate: 96_000 },
  { id: 'm-256', name: 'm-256', colour: 'var(--series-3)', rate: 54_000 },
];

export function makeDemoState(save) {
  const history = [];
  let trend = 0;
  for (let w = 0; w < 6; w += 1) {
    trend += w;
    history.push({
      week: (save?.week ?? 1) + w,
      values: PRODUCTS.map((p, i) => Math.round(p.rate * (w + 1) * (1 + i * 0.12) * (1 + Math.sin(w + i) * 0.05))),
    });
  }

  return {
    saveId: save?.id ?? null,
    company: save?.company ?? 'untitled company',
    founder: save?.founder ?? '—',
    founded: 1990,
    week: save?.week ?? 1,
    year: save?.year ?? 1990,
    cash: save?.cash ?? 4_200_000,
    cashDelta: 0,
    rp: save?.rp ?? 1240,
    rpRate: 96,
    runwayMonths: 84,
    profitMonth: 0,
    profitYear: 0,
    activity: { verb: 'researching', subject: 'l3 cache', progress: 0.62, weeksLeft: 9 },
    products: PRODUCTS,
    history,
    news: [
      { kind: 'market', title: 'imtel ships the 486 — your 386 refresh looks tired', when: 'w03', delta: 'share −1.8%' },
      { kind: 'launch', title: 'and-x launches a cheaper 40 mhz part', when: 'w02', delta: 'share −0.4%' },
      { kind: 'supply', title: 'thailand floods hit hdd supply; memory prices firm', when: 'w02', delta: 'bom +2.1%' },
      { kind: 'scandal', title: 'floating-point bug reported in a rival fpu', when: 'w01', delta: 'watch' },
      { kind: 'presentation', title: 'isx-486 availability briefing', when: 'w01', delta: 'audience 61' },
    ],
  };
}

/* ── mount ────────────────────────────────────────────────── */

export function mountDesk({ save, onMenu, onNavigate }) {
  const state = makeDemoState(save);

  const refs = {
    company: $('#deskCompany'),
    founded: $('#deskFounded'),
    founder: $('#deskFounder'),
    cash: $('#hudCash'),
    cashDelta: $('#hudCashDelta'),
    rp: $('#hudRp'),
    rpRate: $('#hudRpRate'),
    year: $('#clockYear'),
    date: $('#clockDate'),
    battery: $('#battery'),
    batteryFill: $('#batteryFill'),
    batteryLabel: $('#batteryLabel'),
    title: $('#dioTitle'),
    sub: $('#dioSub'),
    clip: $('#artClipRect'),
    chart: $('#earningsChart'),
    legend: $('#chartLegend'),
    chartRange: $('#chartRange'),
    profitMonth: $('#profitMonth'),
    profitYear: $('#profitYear'),
    newsGrid: $('#newsGrid'),
    newsCount: $('#newsCount'),
  };

  /* the rail is owned by the shell (src/ui/sections.js), not by the desk */

  document.querySelectorAll('[data-action="menu"]').forEach((b) => b.addEventListener('click', onMenu));

  /* ── render ─────────────────────────────────────────────── */

  function renderChrome() {
    refs.company.textContent = state.company;
    refs.founder.textContent = state.founder;
    refs.founded.textContent = String(state.founded);
    refs.year.textContent = String(state.year);
    refs.date.textContent = weekToDate(state.week);
  }

  function renderHud() {
    refs.cash.textContent = fmtMoney(state.cash);
    refs.rp.textContent = `${state.rp.toLocaleString()} rp`;
    refs.rpRate.textContent = `+${state.rpRate}/wk`;

    const up = state.cashDelta >= 0;
    refs.cashDelta.textContent = `${up ? '+' : '−'}${fmtMoney(Math.abs(state.cashDelta)).replace(/^[−$]+/, '')}`;
    refs.cashDelta.className = `hud__delta ${up ? 'up' : 'down'}`;

    const pct = Math.max(3, Math.min(100, (state.runwayMonths / 84) * 100));
    refs.batteryFill.style.width = `${pct}%`;
    refs.battery.dataset.state = state.runwayMonths < 6 ? 'low' : state.runwayMonths < 18 ? 'warn' : 'ok';
    refs.batteryLabel.textContent = state.runwayMonths >= 24
      ? `runway ${Math.round(state.runwayMonths / 12)} yr`
      : `runway ${Math.round(state.runwayMonths)} mo`;
  }

  function renderProfit() {
    refs.profitMonth.textContent = fmtMoney(state.profitMonth);
    refs.profitMonth.dataset.sign = state.profitMonth < 0 ? 'neg' : 'pos';
    refs.profitYear.textContent = fmtMoney(state.profitYear);
    refs.profitYear.dataset.sign = state.profitYear < 0 ? 'neg' : 'pos';
  }

  /* art: clipped from the bottom. No water, no waves, no bubbles. */
  function renderArt() {
    const a = state.activity;
    const p = Math.max(0, Math.min(1, a.progress));

    refs.title.innerHTML = `${a.verb} <em></em>`;
    refs.title.querySelector('em').textContent = a.subject;
    refs.sub.textContent = `${Math.round(p * 100)}% complete · ${a.weeksLeft} ${a.weeksLeft === 1 ? 'week' : 'weeks'} left`;

    refs.clip.setAttribute('y', (320 - p * 320).toFixed(1));
    refs.clip.setAttribute('height', (p * 320).toFixed(1));
  }

  /* cumulative earnings per product, extended every tick */
  function renderChart() {
    const W = 320;
    const H = 180;
    const padL = 34;
    const padR = 6;
    const padT = 8;
    const padB = 18;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const view = state.history.slice(-40);
    const max = Math.max(1, ...view.map((h) => Math.max(...h.values)));
    const n = view.length;

    const x = (i) => padL + (n <= 1 ? plotW : (i / (n - 1)) * plotW);
    const y = (v) => padT + plotH - (v / max) * plotH;

    let svg = '';
    for (let g = 0; g <= 3; g += 1) {
      const gy = padT + (plotH / 3) * g;
      svg += `<line class="chart__grid" x1="${padL}" y1="${gy.toFixed(1)}" x2="${W - padR}" y2="${gy.toFixed(1)}"/>`;
      svg += `<text class="chart__tick" x="0" y="${(gy + 3).toFixed(1)}">${fmtMoney(max * (1 - g / 3))}</text>`;
    }

    state.products.forEach((product, pi) => {
      const points = view.map((h, i) => [x(i), y(h.values[pi])]);

      const area = [
        `M${points[0][0].toFixed(1)} ${(padT + plotH).toFixed(1)}`,
        ...points.map(([px, py]) => `L${px.toFixed(1)} ${py.toFixed(1)}`),
        `L${points[points.length - 1][0].toFixed(1)} ${(padT + plotH).toFixed(1)}`,
        'Z',
      ].join(' ');
      svg += `<path d="${area}" style="fill:${product.colour};opacity:.16"/>`;

      const line = points.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`).join(' ');
      svg += `<path d="${line}" style="fill:none;stroke:${product.colour};stroke-width:2.4;stroke-linejoin:round;stroke-linecap:round"/>`;
    });

    refs.chart.innerHTML = svg;

    refs.chartRange.textContent = n > 1
      ? `w${String(view[0].week).padStart(2, '0')} – w${String(view[n - 1].week).padStart(2, '0')}`
      : 'starting';

    refs.legend.replaceChildren(
      ...state.products.map((p) => {
        const item = document.createElement('span');
        item.className = 'legend-item';
        item.innerHTML = `<i class="legend-swatch" style="background:${p.colour}"></i>${p.name}`;
        return item;
      }),
    );
  }

  /* recent: newest → oldest, fixed grid, never scrolls */
  function renderNews() {
    const items = [...state.news].slice(0, 4);
    refs.newsGrid.replaceChildren(
      ...items.map((item) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'news-card';
        card.dataset.kind = item.kind;
        card.innerHTML = `<span class="news-card__meta"><span></span><span></span></span>
          <span class="news-card__title"></span>
          <span class="news-card__delta"></span>`;
        const [a, b] = card.querySelectorAll('.news-card__meta span');
        a.textContent = item.when;
        b.textContent = item.kind;
        card.querySelector('.news-card__title').textContent = item.title;
        card.querySelector('.news-card__delta').textContent = item.delta;
        return card;
      }),
    );
    refs.newsCount.textContent = state.news.length > 4
      ? `newest first · +${state.news.length - 4} older`
      : 'newest first';
  }

  function update() {
    renderChrome();
    renderHud();
    renderProfit();
    renderArt();
    renderChart();
    renderNews();
  }

  update();

  return {
    update,
    getState: () => state,

    tick() {
      const w = state.week + 1;
      if (w > 52) { state.week = 1; state.year += 1; } else { state.week = w; }

      const prev = state.history[state.history.length - 1];
      const jitter = 1 + Math.sin(state.week * 1.6) * 0.12;
      state.history.push({
        week: state.week,
        values: state.products.map((p, i) => Math.round(
          prev.values[i] + p.rate * jitter * (1 + i * 0.05),
        )),
      });
      if (state.history.length > 120) state.history.shift();

      const earned = state.history.at(-1).values.reduce((s, v) => s + v, 0)
        - prev.values.reduce((s, v) => s + v, 0);
      state.cash += earned;
      state.cashDelta = earned;
      state.profitMonth += Math.round(earned * 0.42);
      state.profitYear += Math.round(earned * 0.42);
      state.rp += Math.round(state.rpRate / 4);
      state.runwayMonths = Math.max(1, Math.round(state.cash / 50_000));

      state.activity.progress = Math.min(1, state.activity.progress + 0.02);
      state.activity.weeksLeft = Math.max(0, Math.ceil((1 - state.activity.progress) / 0.02));

      update();
    },

    destroy() {
      $('#newsGrid')?.replaceChildren();
    },
  };
}
