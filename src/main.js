/**
 * Silicon Empire — shell, menu, new game, desk.
 * One persistent sidebar; views swap inside it.
 */

import {
  listProfiles, getProfile, createProfile, renameCompany, touchProfile,
  getActiveProfileId, clearActiveProfile,
  listSaves, latestSave, createSave, deleteSave, deleteProfile,
  getSettings, saveSettings, exportAll, importAll, dataSummary, clearEverything,
  initials, timeAgo, bytesLabel,
} from './app/store.js';
import { mountDesk } from './ui/desk.js';
import { PRIMARY, MORE, sectionButton, markCurrent } from './ui/sections.js';
import { mountContracts } from './ui/contracts.js';
import { mountOffer } from './ui/offer.js';

const $ = (sel, root = document) => root.querySelector(sel);
const el = (tag, props = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v !== null && v !== undefined && v !== false) node.setAttribute(k, v === true ? '' : v);
  }
  for (const child of children.flat()) {
    if (child == null) continue;
    node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
};
const icon = (name, size = '') => `<svg class="i${size ? ` i--${size}` : ''}" aria-hidden="true"><use href="#i-${name}"/></svg>`;

/* ── state ────────────────────────────────────────────────── */

const state = {
  screen: 'menu',
  profile: null,
  save: null,
  speed: 0,
  timer: null,
  desk: null,
  contracts: null,
  offer: null,
};

const SPEED_MS = { 1: 1200, 4: 480, 16: 190 };

/* ── settings ─────────────────────────────────────────────── */

function applySettings() {
  const s = getSettings();
  document.documentElement.dataset.theme = s.theme;
  document.documentElement.dataset.motion = s.motion;
  document.body.dataset.scale = s.scale;
}

/* ── toast ────────────────────────────────────────────────── */

let toastTimer = null;
function toast(message, { warn = false, ms = 3200 } = {}) {
  const host = $('#toastHost');
  host.replaceChildren();
  const node = el('div', { class: `toast${warn ? ' toast--warn' : ''}`, role: 'status' });
  node.innerHTML = `${icon(warn ? 'warn' : 'info', '16')}<span></span>`;
  node.querySelector('span').textContent = message;
  host.append(node);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => host.replaceChildren(), ms);
}

/* ── routing ──────────────────────────────────────────────── */

function go(screen) {
  if (state.screen === 'desk' && screen !== 'desk') {
    stopClock();
    state.desk?.destroy();
    state.desk = null;
  }
  if (state.screen === 'contracts' && screen !== 'contracts') {
    state.contracts?.destroy();
    state.contracts = null;
  }
  if (state.screen === 'offer' && screen !== 'offer') {
    state.offer?.destroy();
    state.offer = null;
  }

  state.screen = screen;
  document.body.dataset.screen = screen;
  if (screen !== 'desk') setDrawer(false);
  renderSidebar();

  if (screen === 'menu') renderMenu();
  if (screen === 'newgame') prepareNewGame();
  if (screen === 'desk') startDesk();
  if (screen === 'contracts') startContracts();
  if (screen === 'offer') startOffer();
}

/* ── sidebar (all screens) ────────────────────────────────── */

function pickSection(section) {
  markCurrent(section.id);
  const hasSave = Boolean(state.save ?? (state.profile && latestSave(state.profile.id)));
  if (!hasSave) return toast('start a game to open a section', { warn: true });
  if (section.id === 'contracts') return go('contracts');
  return toast(`${section.label} screen is not built yet.`, { warn: true });
}

/* ── sections drawer ──────────────────────────────────────── */

function setDrawer(open) {
  const drawer = $('#drawer');
  const more = $('#sideMore');
  drawer.classList.toggle('is-open', open);
  drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
  more.setAttribute('aria-expanded', open ? 'true' : 'false');
  more.classList.toggle('is-open', open);
}

const drawerOpen = () => $('#drawer').classList.contains('is-open');

function renderDrawer() {
  $('#drawerNav').replaceChildren(...MORE.map((section) => {
    const button = sectionButton(section, { variant: 'drawer', iconSize: 18 });
    button.addEventListener('click', () => pickSection(section));
    return button;
  }));
}

function renderSidebar() {
  const nav = $('#sideNav');
  const inGame = ['desk', 'contracts', 'offer'].includes(state.screen);

  nav.replaceChildren(...PRIMARY.map((section) => {
    const button = sectionButton(section, { variant: 'nav', disabled: !inGame });
    button.addEventListener('click', () => pickSection(section));
    return button;
  }));

  // date + battery reflect the live save when one is open
  const snap = state.desk?.getState();
  $('#clockYear').textContent = String(snap?.year ?? 1990);
  $('#clockDate').textContent = 'jan 1';
  $('#batteryFill').style.width = '60%';
  $('#batteryLabel').textContent = 'no campaign';
}

/* ═════════════════════════ menu ═══════════════════════════ */

const MENU = [
  { id: 'continue', icon: 'play', label: 'continue', desc: 'resume the latest campaign', needsSave: true, primary: true },
  { id: 'new', icon: 'plus', label: 'new game', desc: 'found a company in 1990' },
  { id: 'saves', icon: 'disk', label: 'saves', desc: 'slots in this profile' },
  { id: 'settings', icon: 'gear', label: 'settings', desc: 'theme, text size, motion' },
  { id: 'credits', icon: 'book', label: 'credits', desc: 'who built this' },
  { id: 'data', icon: 'data', label: 'all data', desc: 'profiles, saves, export' },
  { id: 'switch', icon: 'exit', label: 'switch profile', desc: 'back to profile select', danger: true },
];

function renderMenu() {
  const profile = state.profile ?? getProfile(getActiveProfileId());
  if (profile) state.profile = profile;

  const save = profile ? latestSave(profile.id) : null;
  const saves = profile ? listSaves(profile.id) : [];

  $('#menuCompany').textContent = save?.company ?? profile?.company ?? 'no company yet';
  $('#menuMeta').textContent = profile
    ? `founded 1990 · by ${profile.name}`
    : 'start a new game to found one';
  $('#menuStatus').textContent = save
    ? `${saves.length} save${saves.length === 1 ? '' : 's'} · week ${save.week}`
    : 'no save';

  // the row that is actually the next move wears the accent, so a disabled
  // continue never looks like the thing to press
  const nextId = save ? 'continue' : 'new';

  const list = $('#menuGrid');
  list.replaceChildren(...MENU.map((item) => {
    const disabled = item.needsSave && !save;
    const button = el('button', {
      class: 'menu-row',
      type: 'button',
      'data-disabled': disabled ? 'true' : 'false',
      'data-next': !disabled && item.id === nextId ? 'true' : 'false',
      'aria-disabled': disabled ? 'true' : null,
      onclick: () => (disabled
        ? toast('no save yet — start a new game', { warn: true })
        : runMenu(item.id)),
    });
    button.innerHTML = `
      <span class="menu-row__icon">${icon(item.icon)}</span>
      <span class="menu-row__body">
        <span class="menu-row__label"></span>
        <span class="menu-row__desc"></span>
      </span>
      <span class="menu-row__arrow">${icon('arrow', '16')}</span>`;
    button.querySelector('.menu-row__label').textContent = item.label;
    button.querySelector('.menu-row__desc').textContent = disabled ? 'no save yet' : item.desc;
    return button;
  }));
}

function runMenu(id) {
  switch (id) {
    case 'continue': {
      const save = state.profile && latestSave(state.profile.id);
      if (!save) return toast('no save yet — start a new game', { warn: true });
      state.save = save;
      return go('desk');
    }
    case 'new': return go('newgame');
    case 'saves': return openSaves();
    case 'settings': return openSettings();
    case 'credits': return openCredits();
    case 'data': return openData();
    case 'switch':
      clearActiveProfile();
      state.profile = null;
      state.save = null;
      closeModal();
      return go('newgame');
    default: return undefined;
  }
}

/* ═════════════════════════ new game ═══════════════════════ */

function prepareNewGame() {
  const founder = $('#founderName');
  founder.value = state.profile?.name ?? '';
  $('#companyName').value = state.profile?.company ?? '';
  const hint = $('#nameHint');
  hint.classList.remove('field-hint--error');
  hint.textContent = 'prints as “by …” on your company plate';
  founder.classList.remove('field--invalid');

  renderProfileList();
  requestAnimationFrame(() => {
    (founder.value ? $('#companyName') : founder).focus();
  });
}

function renderProfileList() {
  const profiles = listProfiles().sort((a, b) => (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0));
  const wrap = $('#profilesWrap');
  const list = $('#profileList');

  if (!profiles.length) {
    wrap.hidden = true;
    list.replaceChildren();
    return;
  }

  wrap.hidden = false;
  $('#profileCount').textContent = `${profiles.length} on this device`;

  list.replaceChildren(...profiles.map((p) => {
    const saves = listSaves(p.id);
    const row = el('button', {
      class: 'profile',
      type: 'button',
      onclick: () => {
        state.profile = p;
        touchProfile(p.id);
        go('menu');
      },
    });
    row.innerHTML = `
      <span class="profile__avatar">${initials(p.name)}</span>
      <span class="profile__body">
        <span class="profile__name"></span>
        <span class="profile__meta"></span>
      </span>
      ${icon('arrow', '16')}`;
    row.querySelector('.profile__name').textContent = p.name;
    row.querySelector('.profile__meta').textContent = saves.length
      ? `${saves.length} save${saves.length === 1 ? '' : 's'} · ${timeAgo(p.lastPlayed)}`
      : `no save · ${timeAgo(p.lastPlayed)}`;
    return row;
  }));
}

function handleNewGame(event) {
  event.preventDefault();
  const founderInput = $('#founderName');
  const companyInput = $('#companyName');
  const hint = $('#nameHint');
  const founder = founderInput.value.trim();
  const company = companyInput.value.trim() || 'untitled company';

  if (!founder) {
    founderInput.classList.add('field--invalid');
    hint.classList.add('field-hint--error');
    hint.textContent = 'enter a founder name';
    founderInput.focus();
    return;
  }

  founderInput.classList.remove('field--invalid');
  hint.classList.remove('field-hint--error');
  hint.textContent = 'prints as “by …” on your company plate';

  const result = createProfile(founder, company);
  if (!result.ok) {
    hint.classList.add('field-hint--error');
    hint.textContent = result.error === 'storage'
      ? 'could not save — storage is full or blocked'
      : 'that name cannot be used';
    return;
  }

  const profile = result.profile;
  if (!result.reused) renameCompany(profile.id, company);
  state.profile = profile;
  touchProfile(profile.id);

  const seed = Number($('#seedInput').value) || 1990;
  const created = createSave(profile.id, { company, founder, seed });
  if (!created.ok) return toast('could not write the save', { warn: true });

  state.save = created.save;
  go('desk');
}

/* ═════════════════════════ desk ═══════════════════════════ */

function startDesk() {
  const save = state.save ?? (state.profile && latestSave(state.profile.id));
  if (!save) {
    toast('no save to open', { warn: true });
    return go('menu');
  }
  state.save = save;

  state.desk = mountDesk({
    save,
    onMenu: () => { stopClock(); go('menu'); },
    onNavigate: () => {},
  });

  setSpeed(1);
  return undefined;
}

function startOffer() {
  const save = state.save ?? (state.profile && latestSave(state.profile.id));
  if (!save) {
    toast('no save to open', { warn: true });
    return go('menu');
  }
  state.save = save;
  state.offer = mountOffer({ save, onBack: () => go('contracts') });
  return undefined;
}

function startContracts() {
  const save = state.save ?? (state.profile && latestSave(state.profile.id));
  if (!save) {
    toast('no save to open', { warn: true });
    return go('menu');
  }
  state.save = save;
  state.contracts = mountContracts({ save, onBack: () => go('desk') });
  return undefined;
}

function setSpeed(speed) {
  state.speed = speed;
  stopClock();
  document.querySelectorAll('.time button').forEach((b) => {
    b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === speed));
  });
  if (speed > 0 && state.desk) {
    state.timer = setInterval(() => state.desk?.tick(), SPEED_MS[speed] ?? 1200);
  }
}

function stopClock() {
  if (state.timer) clearInterval(state.timer);
  state.timer = null;
}

/* ── modal helpers ────────────────────────────────────────── */

function openModal({ title, body, footer, wide = false }) {
  const host = $('#modalHost');
  const panel = el('div', {
    class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title,
    style: wide ? 'width:min(620px,100%)' : null,
  });
  panel.append(
    el('div', { class: 'modal__head' },
      el('h2', { class: 'modal__title', text: title }),
      el('button', {
        class: 'icon-btn', type: 'button', title: 'close', 'aria-label': 'close',
        html: icon('exit'), onclick: closeModal,
      }),
    ),
    el('div', { class: 'modal__body' }, body),
  );
  if (footer) panel.append(el('div', { class: 'modal__foot' }, footer));
  host.replaceChildren(panel);
  host.hidden = false;
  host.onclick = (e) => { if (e.target === host) closeModal(); };
  panel.querySelector('.icon-btn')?.focus();
}

function closeModal() {
  const host = $('#modalHost');
  host.hidden = true;
  host.replaceChildren();
}

function segment(options, current, onPick) {
  const wrap = el('div', { class: 'seg', role: 'group' });
  options.forEach(({ value, label }) => {
    const button = el('button', {
      type: 'button',
      'aria-pressed': String(value === current),
      text: label,
      onclick: () => {
        [...wrap.children].forEach((b) => b.setAttribute('aria-pressed', 'false'));
        button.setAttribute('aria-pressed', 'true');
        onPick(value);
      },
    });
    wrap.append(button);
  });
  return wrap;
}

/* ── saves ────────────────────────────────────────────────── */

function openSaves() {
  const profile = state.profile;
  const saves = profile ? listSaves(profile.id) : [];

  const body = saves.length
    ? el('div', { class: 'slot-list' }, ...saves.map((s) => el('div', { class: 'slot' },
      el('div', { class: 'slot__body' },
        el('div', { class: 'slot__name', text: s.company }),
        el('div', { class: 'slot__meta', text: `week ${s.week} · ${s.year} · ${fmtMoney(s.cash)} · ${timeAgo(s.updatedAt)}` }),
      ),
      el('div', { class: 'slot__actions' },
        el('button', {
          class: 'btn btn--accent btn--sm', type: 'button', text: 'load',
          onclick: () => { state.save = s; closeModal(); go('desk'); },
        }),
        el('button', {
          class: 'icon-btn', type: 'button', title: 'delete save', 'aria-label': 'delete save',
          html: icon('exit', '16'),
          onclick: () => { deleteSave(profile.id, s.id); openSaves(); toast('save deleted'); },
        }),
      ),
    )))
    : el('div', { class: 'empty' },
      el('p', { class: 'empty__title', text: 'no saves yet' }),
      el('p', { class: 'empty__body', text: 'found a company to create your first campaign' }),
    );

  openModal({
    title: 'saves',
    body,
    footer: el('button', {
      class: 'btn btn--accent', type: 'button', text: 'new game',
      onclick: () => { closeModal(); go('newgame'); },
    }),
  });
}

/* ── settings ─────────────────────────────────────────────── */

function openSettings() {
  const s = getSettings();
  const update = (patch) => { saveSettings({ ...getSettings(), ...patch }); applySettings(); };

  const body = el('div', {},
    el('div', { class: 'setting' },
      el('div', {},
        el('div', { class: 'setting__label', text: 'theme' }),
        el('div', { class: 'setting__desc', text: 'dark by default; light matches the reference' }),
      ),
      segment([{ value: 'dark', label: 'dark' }, { value: 'light', label: 'light' }], s.theme, (v) => update({ theme: v })),
    ),
    el('div', { class: 'setting' },
      el('div', {},
        el('div', { class: 'setting__label', text: 'text size' }),
        el('div', { class: 'setting__desc', text: 'scales the whole interface' }),
      ),
      segment([
        { value: 'md', label: 'normal' }, { value: 'lg', label: 'large' }, { value: 'xl', label: 'XL' },
      ], s.scale, (v) => update({ scale: v })),
    ),
    el('div', { class: 'setting' },
      el('div', {},
        el('div', { class: 'setting__label', text: 'motion' }),
        el('div', { class: 'setting__desc', text: 'turns off animation' }),
      ),
      segment([{ value: 'on', label: 'on' }, { value: 'off', label: 'off' }], s.motion, (v) => update({ motion: v })),
    ),
  );

  openModal({
    title: 'settings',
    body,
    footer: el('button', { class: 'btn btn--accent', type: 'button', text: 'done', onclick: closeModal }),
  });
}

/* ── credits ──────────────────────────────────────────────── */

function openCredits() {
  const credit = (term, text) => el('dl', { class: 'credit' }, el('dt', { text: term }), el('dd', { text }));
  const body = el('div', { class: 'credits-list' },
    credit('game', 'silicon empire — a 1990–2026 semiconductor tycoon'),
    credit('look', 'chunky borders, bold lowercase, ice-blue accent, hand-drawn icons'),
    credit('status', 'build 0.2 — menu, new game, desk shell. simulation not wired yet'),
  );
  openModal({
    title: 'credits',
    body,
    footer: el('button', { class: 'btn btn--accent', type: 'button', text: 'close', onclick: closeModal }),
  });
}

/* ── all data ─────────────────────────────────────────────── */

function openData() {
  const summary = dataSummary();
  const stat = (label, value) => el('div', { class: 'data-stat' },
    el('span', { class: 'lbl', text: label }),
    el('span', { class: 'data-stat__value', text: value }),
  );

  const body = el('div', {},
    el('div', { class: 'data-grid' },
      stat('profiles', String(summary.profiles)),
      stat('saves', String(summary.saves)),
      stat('storage', bytesLabel(summary.bytes)),
    ),
    el('div', { class: 'setting' },
      el('div', {},
        el('div', { class: 'setting__label', text: 'export everything' }),
        el('div', { class: 'setting__desc', text: 'profiles, saves and settings as one json file' }),
      ),
      el('button', { class: 'btn btn--sm', type: 'button', text: 'export', onclick: downloadExport }),
    ),
    el('div', { class: 'setting' },
      el('div', {},
        el('div', { class: 'setting__label', text: 'import' }),
        el('div', { class: 'setting__desc', text: 'replaces current profiles and saves' }),
      ),
      el('button', { class: 'btn btn--sm', type: 'button', text: 'choose file', onclick: pickImport }),
    ),
    el('div', { class: 'slot-list' }, ...(listProfiles().length
      ? listProfiles().map((p) => el('div', { class: 'slot' },
        el('div', { class: 'slot__body' },
          el('div', { class: 'slot__name', text: p.name }),
          el('div', { class: 'slot__meta', text: `${p.company} · ${listSaves(p.id).length} save(s)` }),
        ),
        el('button', {
          class: 'icon-btn', type: 'button', title: 'delete profile', 'aria-label': 'delete profile',
          html: icon('exit', '16'),
          onclick: () => { deleteProfile(p.id); openData(); toast('profile deleted'); },
        }),
      ))
      : [el('p', { class: 'empty__body', text: 'no profiles stored' })])),
    el('div', { class: 'danger-zone' },
      el('button', {
        class: 'btn btn--coral btn--sm', type: 'button', text: 'erase all data',
        onclick: () => {
          clearEverything();
          state.profile = null;
          state.save = null;
          closeModal();
          go('menu');
          toast('all local data erased', { warn: true });
        },
      }),
      el('span', { class: 'lbl', text: 'cannot be undone' }),
    ),
  );

  openModal({
    title: 'all data',
    body,
    wide: true,
    footer: el('button', { class: 'btn btn--accent', type: 'button', text: 'close', onclick: closeModal }),
  });
}

function downloadExport() {
  const blob = new Blob([JSON.stringify(exportAll(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = el('a', { href: url, download: `silicon-empire-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  toast('export downloaded');
}

function pickImport() {
  const input = el('input', { type: 'file', accept: 'application/json,.json' });
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      const result = importAll(payload);
      if (!result.ok) return toast(result.error, { warn: true });
      state.profile = getProfile(getActiveProfileId()) ?? null;
      closeModal();
      go('menu');
      return toast('data imported');
    } catch {
      return toast('that file is not valid json', { warn: true });
    }
  });
  input.click();
}

function fmtMoney(n) {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}b`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}m`;
  if (abs >= 1e3) return `$${Math.round(n / 1e3)}k`;
  return `$${Math.round(n)}`;
}

/* ── keyboard ─────────────────────────────────────────────── */

function goMenu() {
  go('menu');
}

document.addEventListener('keydown', (event) => {
  const modalOpen = !$('#modalHost').hidden;
  if (event.key !== 'Escape') return;
  if (modalOpen) { closeModal(); return; }
  if (drawerOpen()) { setDrawer(false); return; }
  if (state.screen === 'offer') { go('contracts'); return; }
  if (state.screen === 'contracts') { go('desk'); return; }
  if (state.screen === 'desk' || state.screen === 'newgame') goMenu();
});

/* ── boot ─────────────────────────────────────────────────── */

function boot() {
  applySettings();

  $('#newGameForm').addEventListener('submit', handleNewGame);

  $('#founderName').addEventListener('input', (e) => {
    e.target.classList.remove('field--invalid');
    const hint = $('#nameHint');
    hint.classList.remove('field-hint--error');
    hint.textContent = 'prints as “by …” on your company plate';
  });

  document.querySelectorAll('[data-action="menu"]').forEach((b) => b.addEventListener('click', goMenu));
  document.querySelectorAll('[data-action="offer"]').forEach((b) => b.addEventListener('click', () => {
    if (state.screen === 'offer') return;
    go('offer');
  }));

  $('#sideMore').addEventListener('click', (event) => {
    event.stopPropagation();
    setDrawer(!drawerOpen());
  });
  $('#drawerClose').addEventListener('click', () => setDrawer(false));
  document.addEventListener('click', (event) => {
    if (!drawerOpen()) return;
    if (event.target.closest('#drawer') || event.target.closest('#sideMore')) return;
    setDrawer(false);
  });
  $('#drawerNav').addEventListener('click', () => setDrawer(false));
  renderDrawer();
  document.querySelectorAll('[data-action="settings"]').forEach((b) => b.addEventListener('click', openSettings));
  document.querySelectorAll('[data-action="data"]').forEach((b) => b.addEventListener('click', openData));
  document.querySelectorAll('.time button').forEach((b) => b.addEventListener('click', () => setSpeed(Number(b.dataset.speed))));

  const active = getProfile(getActiveProfileId());
  if (active) state.profile = active;

  go('menu');
}

boot();
