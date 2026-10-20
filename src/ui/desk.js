/**
 * The desk — main game screen.
 *
 * ⚠ There is no simulation yet. Everything below runs on a small placeholder
 * state object so the interface can be built, judged and iterated on. The
 * public shape (mount/update/destroy + the field names in `makeDemoState`)
 * is the contract the real `sim/` will satisfy: see PLAN.md §3.
 */

const $ = (sel) => document.querySelector(sel);
const money = (n) => {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(abs >= 1e4 ? 0 : 1)}k`;
  return `$${n.toFixed(0)}`;
};

/* ── placeholder world ────────────────────────────────────── */

export function makeDemoState(save) {
  const products = [
    { id: 'isx486', name: 'ISX-486', colour: 'var(--yellow)', share: 0.44 },
    { id: 'isx386', name: 'ISX-386', colour: 'var(--bp)', share: 0.34 },
    { id: 'mem256', name: 'M-256', colour: 'var(--green)', share: 0.22 },
  ];

  // deterministic weekly series so the chart never flickers
  const series = products.map(() => []);
  for (let w = 0; w < 52; w += 1) {
    products.forEach((p, i) => {
      const trend = 1 + (w / 52) * (0.35 + i * 0.1);
      const wobble = 1 + Math.sin((w + i * 7) * 0.5) * 0.09;
      series[i].push(Math.max(0, 180_000 * p.share * trend * wobble));
    });
  }

  return {
    saveId: save?.id ?? null,
    company: save?.company ?? 'Untitled Company',
    founder: save?.founder ?? '—',
    founded: 1990,
    week: save?.week ?? 1,
    year: save?.year ?? 1990,
    cash: save?.cash ?? 4_200_000,
    cashDelta: 0,
    rp: save?.rp ?? 0,
    rpRate: 96,
    runwayMonths: 84,
    profitMonth: 0,
    profitYear: 0,
    activity: {
      kind: 'research',
      verb: 'Researching',
      subject: 'L3 Cache',
      progress: 0.62,
      weeksLeft: 9,
    },
    products,
    series,
    recent: [
      { kind: 'market', title: 'Imtel ships the 486 — your 386 refresh looks tired', meta: 'W03 · MARKET', delta: '▼ share −1.8%', unread: true },
      { kind: 'supply', title: 'Thailand floods hit HDD supply; memory prices firm', meta: 'W02 · SUPPLY', delta: '▲ BOM +2.1%' },
      { kind: 'launch', title: 'AND-X launches a cheaper 40 MHz part', meta: 'W02 · LAUNCH', delta: '▼ share −0.4%', unread: true },
      { kind: 'scandal', title: 'Floating-point bug reported in a rival FPU', meta: 'W01 · SCANDAL', delta: 'watch' },
      { kind: 'launch', title: 'Presentation: ISX-486 availability briefing', meta: 'W01 · PRESENTATION', delta: 'audience 61' },
    ],
  };
}

/* ── navigation ───────────────────────────────────────────── */

const NAV = [
  { id: 'design', icon: 'ruler', label: 'Design' },
  { id: 'lab', icon: 'beaker', label: 'Lab' },
  { id: 'fab', icon: 'wafer', label: 'Fab' },
  { id: 'market', icon: 'scale', label: 'Market' },
  { id: 'finance', icon: 'ledger', label: 'Finance' },
  { id: 'news', icon: 'news', label: 'News' },
  { id: 'company', icon: 'company', label: 'Firm' },
];

/* ── mount ────────────────────────────────────────────────── */

export function mountDesk({ save, onMenu, onNavigate, onSpeed }) {
  const state = makeDemoState(save);
  const refs = {
    company: $('#deskCompany'),
    founded: $('#deskFounded'),
    founder: $('#deskFounder'),
    cash: $('#hudCash'),
    cashDelta: $('#hudCashDelta'),
    cashSlot: $('#hudCashSlot'),
    rp: $('#hudRp'),
    rpRate: $('#hudRpRate'),
    clockYear: $('#clockYear'),
    clockWeek: $('#clockWeek'),
    battery: $('#battery'),
    batteryFill: $('#batteryFill'),
    batteryLabel: $('#batteryLabel'),
    dioTitle: $('#dioTitle'),
    dioSub: $('#dioSub'),
    dioClip: $('#dioClipRect'),
    dioWave: $('#dioWave'),
    dio: $('#dio'),
    profitMonth: $('#profitMonth'),
    profitYear: $('#profitYear'),
    chart: $('#earningsChart'),
    legend: $('#chartLegend'),
    recent: $('#recentScroller'),
    recentCount: $('#recentCount'),
  };

  /* sidebar */
  const nav = $('#sideNav');
  nav.replaceChildren();
  NAV.forEach((item) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'nav-item';
    button.dataset.nav = item.id;
    button.title = item.label;
    button.innerHTML = `<svg class="i i--24" aria-hidden="true"><use href="#i-${item.icon}"/></svg>
      <span class="nav-item__label">${item.label}</span>`;
    button.addEventListener('click', () => {
      [...nav.children].forEach((b) => b.removeAttribute('aria-current'));
      button.setAttribute('aria-current', 'page');
      onNavigate?.(item.id);
    });
    nav.append(button);
  });

  document.querySelectorAll('[data-action="menu"]').forEach((b) => b.addEventListener('click', onMenu));

  /* speed */
  const speedButtons = [...document.querySelectorAll('.speed button')];
  speedButtons.forEach((button) => {
    button.addEventListener('click', () => {
      speedButtons.forEach((b) => b.setAttribute('aria-pressed', 'false'));
      button.setAttribute('aria-pressed', 'true');
      onSpeed?.(Number(button.dataset.speed));
    });
  });

  /* ── render ─────────────────────────────────────────────── */

  function renderChrome() {
    refs.company.textContent = state.company;
    refs.founder.textContent = state.founder;
    refs.founded.textContent = String(state.founded);
    refs.clockYear.textContent = String(state.year);
    refs.clockWeek.textContent = `W ${String(state.week).padStart(2, '0')}`;
  }

  function renderHud() {
    refs.cash.textContent = money(state.cash);
    refs.rp.textContent = `${Math.round(state.rp).toLocaleString()} RP`;
    refs.rpRate.textContent = `+${state.rpRate}/wk`;

    const delta = state.cashDelta;
    const up = delta >= 0;
    refs.cashDelta.textContent = `${up ? '▲' : '▼'} ${money(Math.abs(delta))}`;
    refs.cashDelta.className = `hud__delta ${up ? 'up' : 'down'}`;
    refs.cashSlot.dataset.negative = String(state.cash < 0);

    const runway = Math.max(0, Math.min(84, state.runwayMonths));
    refs.batteryFill.style.height = `${Math.max(4, (runway / 84) * 100)}%`;
    refs.battery.dataset.state = runway < 6 ? 'low' : runway < 18 ? 'warn' : 'ok';
    refs.batteryLabel.textContent = runway >= 24
      ? `${Math.round(runway / 12)} yr`
      : `${Math.round(runway)} mo`;
  }

  function renderProfit() {
    refs.profitMonth.textContent = money(state.profitMonth);
    refs.profitMonth.dataset.sign = state.profitMonth < 0 ? 'neg' : state.profitMonth > 0 ? 'pos' : '';
    refs.profitYear.textContent = money(state.profitYear);
    refs.profitYear.dataset.sign = state.profitYear < 0 ? 'neg' : state.profitYear > 0 ? 'pos' : '';
  }

  /* diorama: one clip rect + one wave path per tick */
  function renderDiorama() {
    const a = state.activity;
    const pct = Math.max(0, Math.min(1, a.progress));

    refs.dioTitle.innerHTML = `${a.verb} <em></em>`;
    refs.dioTitle.querySelector('em').textContent = a.subject;
    refs.dioSub.textContent = `${Math.round(pct * 100)}% · ${a.weeksLeft} wk left · W ${String(state.week).padStart(2, '0')}`;

    const top = 320 - pct * 320;
    refs.dioClip.setAttribute('y', top.toFixed(1));
    refs.dioClip.setAttribute('height', (pct * 320).toFixed(1));

    // wave: a shallow sine riding the fill line
    const amp = 4.5;
    const step = 32;
    let d = `M0 ${top.toFixed(1)}`;
    for (let x = 0; x <= 320; x += step) {
      const y = top + Math.sin((x / 320) * Math.PI * 3 + state.week * 0.7) * amp;
      d += ` L${x} ${y.toFixed(1)}`;
    }
    d += ' L320 320 L0 320 Z';
    refs.dioWave.setAttribute('d', d);

    const accents = {
      research: 'var(--bp)',
      design: 'var(--yellow)',
      fabricate: 'var(--green)',
      launch: 'var(--yellow)',
      negotiate: 'var(--ink-1)',
      idle: 'var(--ink-2)',
    };
    refs.dio.style.setProperty('--dio-accent', accents[a.kind] ?? 'var(--bp)');
  }

  function renderChart() {
    const svg = refs.chart;
    const W = 320;
    const H = 180;
    const padL = 30;
    const padB = 16;
    const padT = 8;
    const plotW = W - padL - 6;
    const plotH = H - padB - padT;

    const totals = [];
    for (let w = 0; w < 52; w += 1) {
      totals.push(state.series.reduce((sum, s) => sum + (s[w] ?? 0), 0));
    }
    const max = Math.max(...totals, 1);

    const x = (w) => padL + (w / 51) * plotW;
    const y = (v) => padT + plotH - (v / max) * plotH;

    let markup = '';

    // grid + axis labels
    for (let g = 0; g <= 3; g += 1) {
      const gy = padT + (plotH / 3) * g;
      const val = max * (1 - g / 3);
      markup += `<line class="chart__grid" x1="${padL}" y1="${gy.toFixed(1)}" x2="${W - 6}" y2="${gy.toFixed(1)}"/>`;
      markup += `<text class="chart__tick" x="0" y="${(gy + 3).toFixed(1)}">${money(val).replace('.00', '')}</text>`;
    }

    // stacked areas
    const base = new Array(52).fill(0);
    state.series.forEach((series, i) => {
      const top = base.map((b, w) => b + (series[w] ?? 0));
      const areaPath = [
        `M${x(0)} ${y(base[0])}`,
        ...base.map((b, w) => `L${x(w).toFixed(1)} ${y(b).toFixed(1)}`),
        ...top.slice().reverse().map((t, idx) => `L${x(51 - idx).toFixed(1)} ${y(t).toFixed(1)}`),
        'Z',
      ].join(' ');
      markup += `<path d="${areaPath}" fill="${state.products[i].colour}" opacity=".28"/>`;
      const linePath = top.map((t, w) => `${w ? 'L' : 'M'}${x(w).toFixed(1)} ${y(t).toFixed(1)}`).join(' ');
      markup += `<path d="${linePath}" fill="none" stroke="${state.products[i].colour}" stroke-width="1.4"/>`;
      top.forEach((t, w) => { base[w] = t; });
    });

    // week marker
    markup += `<line x1="${x(51)}" y1="${padT}" x2="${x(51)}" y2="${padT + plotH}" stroke="var(--ink-2)" stroke-width="1" stroke-dasharray="2 3"/>`;

    svg.innerHTML = markup;

    refs.legend.replaceChildren(
      ...state.products.map((p) => {
        const item = document.createElement('span');
        item.className = 'legend-item';
        item.innerHTML = `<i class="legend-swatch" style="background:${p.colour}"></i>`;
        item.append(document.createTextNode(p.name));
        return item;
      }),
    );
  }

  function renderRecent() {
    refs.recent.replaceChildren(
      ...state.recent.map((item) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'news-card';
        card.dataset.kind = item.kind;
        card.dataset.unread = String(Boolean(item.unread));
        card.innerHTML = `
          <span class="news-card__meta"><span></span><span></span></span>
          <span class="news-card__title"></span>
          <span class="news-card__delta"></span>`;
        const [metaA, metaB] = card.querySelectorAll('.news-card__meta span');
        metaA.textContent = item.meta.split(' · ')[0] ?? '';
        metaB.textContent = item.meta.split(' · ')[1] ?? '';
        card.querySelector('.news-card__title').textContent = item.title;
        const delta = card.querySelector('.news-card__delta');
        delta.textContent = item.delta ?? '';
        delta.style.color = item.delta?.includes('▼') ? 'var(--red)'
          : item.delta?.includes('▲') ? 'var(--green)' : 'var(--ink-2)';
        return card;
      }),
    );
    refs.recentCount.textContent = `${state.recent.length} items · week ${state.week}`;
  }

  function update(next = {}) {
    Object.assign(state, next);
    renderChrome();
    renderHud();
    renderProfit();
    renderDiorama();
    renderChart();
    renderRecent();
  }

  update();

  return {
    update,
    getState: () => state,
    tick() {
      // placeholder advance — replaced by sim.advance(state, 1)
      state.week += 1;
      if (state.week > 52) { state.week = 1; state.year += 1; }
      const bump = 42_000 + Math.sin(state.week * 1.7) * 18_000;
      state.cash += bump;
      state.cashDelta = Math.round(bump);
      state.rp += Math.round(state.rpRate / 4);
      state.profitMonth += Math.round(bump * 0.4);
      state.profitYear += Math.round(bump * 0.4);
      state.runwayMonths = Math.max(1, Math.round(state.cash / 50_000));
      state.activity.progress = Math.min(1, state.activity.progress + 0.018);
      state.activity.weeksLeft = Math.max(0, Math.ceil((1 - state.activity.progress) / 0.018));
      update();
    },
    destroy() {
      nav.replaceChildren();
    },
  };
}
