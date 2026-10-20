/**
 * Silicon Empire — boot, menu, new game, desk.
 *
 * Screens: menu → newgame → desk. A loadable save goes straight to the desk.
 * The simulation is not wired yet; desk.js runs on a placeholder state and
 * says so. See PLAN.md §3 for the contract it will satisfy.
 */

import {
  listProfiles, getProfile, createProfile, renameCompany, touchProfile,
  getActiveProfileId, clearActiveProfile,
  listSaves, latestSave, createSave, deleteSave,
  getSettings, saveSettings, exportAll, importAll, dataSummary, clearEverything,
  deleteProfile, initials, timeAgo, bytesLabel,
} from './app/store.js';
import { mountDesk } from './ui/desk.js';

/* ── DOM helpers ──────────────────────────────────────────── */

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

const icon = (name, size = '') =>
  `<svg class="i${size ? ` i--${size}` : ''}" aria-hidden="true"><use href="#i-${name}"/></svg>`;

/* ── state ────────────────────────────────────────────────── */

const state = {
  screen: 'menu',
  profile: null,
  save: null,
  selectedIndex: 0,
  actions: [],
  speed: 0,
  timer: null,
  desk: null,
};

const SPEED_MS = { 1: 1100, 4: 420, 16: 150 };

/* ── settings ─────────────────────────────────────────────── */

function applySettings() {
  const s = getSettings();
  document.documentElement.dataset.theme = s.theme;
  document.documentElement.dataset.motion = s.motion;
  document.body.dataset.scale = s.scale;
}

/* ── toast ────────────────────────────────────────────────── */

let toastTimer = null;
function toast(message, { warn = false, ms = 3400 } = {}) {
  const host = $('#toastHost');
  host.replaceChildren();
  const node = el('div', { class: `toast${warn ? ' toast--warn' : ''}`, role: 'status' });
  node.innerHTML = `${icon(warn ? 'warn' : 'info', '16')}<span></span>`;
  node.querySelector('span').textContent = message;
  host.append(node);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => host.replaceChildren(), ms);
}

/* ── screens ──────────────────────────────────────────────── */

function go(screen) {
  state.screen = screen;
  document.body.dataset.screen = screen;

  if (screen === 'menu') renderMenu();
  if (screen === 'newgame') prepareNewGame();
  if (screen === 'desk') startDesk();
}

/* ═════════════════════════ MAIN MENU ═══════════════════════ */

const MENU = [
  { id: 'continue', icon: 'play', label: 'Continue', desc: 'Resume the latest campaign', hint: 'ENTER', needsSave: true },
  { id: 'new', icon: 'plus', label: 'New game', desc: 'Found a company in 1990', hint: 'N' },
  { id: 'saves', icon: 'disk', label: 'Saves', desc: 'Slots in this profile', hint: 'L' },
  { sep: true },
  { id: 'settings', icon: 'gear', label: 'Settings', desc: 'Theme, text size, motion', hint: 'S' },
  { id: 'credits', icon: 'book', label: 'Credits', desc: 'Who built this', hint: 'C' },
  { id: 'data', icon: 'data', label: 'All data', desc: 'Profiles, saves, export', hint: 'D' },
  { sep: true },
  { id: 'switch', icon: 'exit', label: 'Switch profile', desc: 'Back to profile select', hint: 'ESC' },
];

function renderMenu() {
  const profile = state.profile ?? getProfile(getActiveProfileId());

  if (!profile) {
    // No profile yet: show the menu anyway, with placeholder identity.
    $('#menuCompany').textContent = 'No profile';
    $('#menuFounded').innerHTML = 'Create a company to begin';
    $('#profilePill').textContent = '—';
  } else {
    state.profile = profile;
    const saves = listSaves(profile.id);
    const save = latestSave(profile.id);

    $('#menuCompany').textContent = save?.company ?? profile.company;
    $('#menuFounded').innerHTML = `founded <b>${profile.founded ?? 1990}</b> · by <b>${escapeHtml(profile.name)}</b>`;
    $('#profilePill').textContent = initials(profile.name);
    $('#menuStatus').textContent = save
      ? `${saves.length} save${saves.length === 1 ? '' : 's'} · week ${save.week}`
      : 'No save in this profile';
    $('#menuWeekPill').textContent = save ? `Week ${save.week} · ${save.year}` : 'Week 1 · 1990';
    $('#menuCashPill').textContent = save ? fmtMoney(save.cash) : '$4.2M seed';
  }

  const hasSave = Boolean(state.profile && latestSave(state.profile.id));
  const list = $('#menuList');
  list.replaceChildren();
  state.actions = [];

  MENU.forEach((item) => {
    if (item.sep) {
      list.append(el('div', { class: 'menu-sep', 'aria-hidden': 'true' }));
      return;
    }

    const disabled = item.needsSave && !hasSave;
    const index = state.actions.length;
    state.actions.push(item);

    const button = el('button', {
      class: 'menu-item',
      type: 'button',
      role: 'menuitem',
      'data-index': index,
      'aria-disabled': disabled ? 'true' : null,
      onclick: () => (disabled
        ? toast('No save yet — start a new game.', { warn: true })
        : runMenu(item.id)),
      onmouseenter: () => setSelected(index),
    });

    button.innerHTML = `
      <span class="menu-item__icon">${icon(item.icon)}</span>
      <span class="menu-item__body">
        <span class="menu-item__label"></span>
        <span class="menu-item__desc"></span>
      </span>
      <span class="menu-item__hint"></span>`;
    button.querySelector('.menu-item__label').textContent = item.label;
    button.querySelector('.menu-item__desc').textContent = disabled ? 'No save yet' : item.desc;
    button.querySelector('.menu-item__hint').textContent = item.hint;
    if (disabled) button.style.opacity = '.55';

    list.append(button);
  });

  setSelected(0);
}

function setSelected(index) {
  const items = [...document.querySelectorAll('.menu-item')];
  if (!items.length) return;
  const clamped = Math.max(0, Math.min(index, items.length - 1));
  state.selectedIndex = clamped;
  items.forEach((node, i) => { node.dataset.selected = String(i === clamped); });
}

function runMenu(id) {
  switch (id) {
    case 'continue': {
      const save = state.profile && latestSave(state.profile.id);
      if (!save) return toast('No save yet — start a new game.', { warn: true });
      state.save = save;
      go('desk');
      break;
    }
    case 'new':
      go('newgame');
      break;
    case 'saves':
      openSaves();
      break;
    case 'settings':
      openSettings();
      break;
    case 'credits':
      openCredits();
      break;
    case 'data':
      openData();
      break;
    case 'switch':
      switchProfile();
      break;
    default:
      break;
  }
}

function switchProfile() {
  clearActiveProfile();
  state.profile = null;
  state.save = null;
  closeModal();
  go('newgame');
}

/* ═════════════════════════ NEW GAME ═════════════════════════ */

function prepareNewGame() {
  const nameInput = $('#founderName');
  nameInput.value = state.profile?.name ?? '';
  $('#companyName').value = state.profile?.company ?? '';
  $('#nameHint').classList.remove('field-hint--error');
  $('#nameHint').textContent = 'Printed as “by …” on your company plate.';
  $('#founderName').classList.remove('field--invalid');

  renderProfileList();

  // With no name typed yet, let the founder field take focus.
  requestAnimationFrame(() => {
    if (!nameInput.value) nameInput.focus();
    else $('#companyName').focus();
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

  list.replaceChildren(
    ...profiles.map((p) => {
      const saves = listSaves(p.id);
      return el('button', {
        class: 'profile',
        type: 'button',
        role: 'listitem',
        onclick: () => {
          state.profile = p;
          touchProfile(p.id);
          renderMenu();
          go('menu');
        },
      },
        el('span', { class: 'profile__avatar', 'aria-hidden': 'true', text: initials(p.name) }),
        el('span', { class: 'profile__body' },
          el('span', { class: 'profile__name', text: p.name }),
          el('span', {
            class: 'profile__meta',
            text: saves.length
              ? `${saves.length} save${saves.length === 1 ? '' : 's'} · ${timeAgo(p.lastPlayed)}`
              : `no save · ${timeAgo(p.lastPlayed)}`,
          }),
        ),
        el('span', { class: 'profile__go', html: icon('arrow', '16') }),
      );
    }),
  );
}

function handleNewGame(event) {
  event.preventDefault();

  const founderInput = $('#founderName');
  const companyInput = $('#companyName');
  const hint = $('#nameHint');
  const founder = founderInput.value.trim();
  const company = companyInput.value.trim() || 'Untitled Company';

  if (!founder) {
    founderInput.classList.add('field--invalid');
    hint.classList.add('field-hint--error');
    hint.textContent = 'Enter a founder name — it prints on your company plate.';
    founderInput.focus();
    return;
  }

  founderInput.classList.remove('field--invalid');
  hint.classList.remove('field-hint--error');

  const result = createProfile(founder, company);
  if (!result.ok) {
    hint.classList.add('field-hint--error');
    hint.textContent = result.error === 'storage'
      ? 'Could not save: browser storage is full or blocked.'
      : 'That name cannot be used.';
    return;
  }

  const profile = result.profile;
  if (!result.reused) renameCompany(profile.id, company);

  state.profile = profile;
  touchProfile(profile.id);

  const seedValue = Number($('#seedInput').value) || 1990;
  const created = createSave(profile.id, { company, founder, seed: seedValue });
  if (!created.ok) {
    toast('Could not write the save — storage is full.', { warn: true });
    return;
  }

  state.save = created.save;
  go('desk');
}

/* ═════════════════════════ THE DESK ═════════════════════════ */

function startDesk() {
  const save = state.save ?? (state.profile && latestSave(state.profile.id));
  if (!save) {
    toast('No save to open.', { warn: true });
    go('menu');
    return;
  }

  state.save = save;
  document.querySelectorAll('.nav-item').forEach((b) => b.removeAttribute('aria-current'));

  state.desk = mountDesk({
    save,
    onMenu: () => { stopClock(); go('menu'); },
    onNavigate: (id) => toast(`${labelFor(id)} screen is not built yet.`, { warn: true }),
    onSpeed: (speed) => setSpeed(speed),
  });

  setSpeed(1);
}

function labelFor(id) {
  return { design: 'Designer', lab: 'Lab', fab: 'Fab', market: 'Market', finance: 'Finance', news: 'News', company: 'Company' }[id] ?? id;
}

function setSpeed(speed) {
  state.speed = speed;
  stopClock();
  if (speed > 0) {
    state.timer = setInterval(() => {
      state.desk?.tick();
      const snap = state.desk?.getState();
      if (snap) {
        state.save = { ...state.save, week: snap.week, year: snap.year, cash: snap.cash, rp: snap.rp };
      }
    }, SPEED_MS[speed] ?? 1100);
  }
}

function stopClock() {
  if (state.timer) clearInterval(state.timer);
  state.timer = null;
}

/* ── modal ────────────────────────────────────────────────── */

function openModal({ title, body, footer, wide = false }) {
  const host = $('#modalHost');
  const panel = el('div', {
    class: 'modal',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': title,
    style: wide ? 'width:min(620px,100%)' : null,
  });

  panel.append(
    el('div', { class: 'modal__head' },
      el('h2', { class: 'modal__title', text: title }),
      el('button', {
        class: 'icon-btn', type: 'button', title: 'Close', 'aria-label': 'Close',
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
    ? el('div', { class: 'slot-list' },
      ...saves.map((s) => el('div', { class: 'slot' },
        el('div', { class: 'slot__body' },
          el('div', { class: 'slot__name', text: s.company }),
          el('div', {
            class: 'slot__meta',
            text: `week ${s.week} · ${s.year} · ${fmtMoney(s.cash)} · ${timeAgo(s.updatedAt)}`,
          }),
        ),
        el('div', { class: 'slot__actions' },
          el('button', {
            class: 'btn btn--ghost', type: 'button', text: 'Load',
            onclick: () => { state.save = s; closeModal(); go('desk'); },
          }),
          el('button', {
            class: 'icon-btn', type: 'button', title: 'Delete save', 'aria-label': 'Delete save',
            html: icon('exit', '16'),
            onclick: () => { deleteSave(profile.id, s.id); openSaves(); toast('Save deleted.'); },
          }),
        ),
      )))
    : el('div', { class: 'empty' },
      el('p', { class: 'empty__title', text: 'No saves yet' }),
      el('p', { class: 'empty__body', text: 'Found a company to create your first campaign.' }),
    );

  openModal({
    title: 'Saves',
    body,
    footer: el('button', {
      class: 'btn btn--solid', type: 'button', text: 'New game',
      onclick: () => { closeModal(); go('newgame'); },
    }),
  });
}

/* ── settings ─────────────────────────────────────────────── */

function openSettings() {
  const s = getSettings();
  const update = (patch) => {
    saveSettings({ ...getSettings(), ...patch });
    applySettings();
  };

  const body = el('div', {},
    el('div', { class: 'setting' },
      el('div', {},
        el('div', { class: 'setting__label', text: 'Theme' }),
        el('div', { class: 'setting__desc', text: 'Warm dark is the default. Light keeps parity.' }),
      ),
      segment([{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }], s.theme, (v) => update({ theme: v })),
    ),
    el('div', { class: 'setting' },
      el('div', {},
        el('div', { class: 'setting__label', text: 'Text size' }),
        el('div', { class: 'setting__desc', text: 'Scales the whole interface.' }),
      ),
      segment([
        { value: 'md', label: 'Normal' }, { value: 'lg', label: 'Large' }, { value: 'xl', label: 'X-Large' },
      ], s.scale, (v) => update({ scale: v })),
    ),
    el('div', { class: 'setting' },
      el('div', {},
        el('div', { class: 'setting__label', text: 'Motion' }),
        el('div', { class: 'setting__desc', text: 'Turn off animations and the wafer pulse.' }),
      ),
      segment([{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }], s.motion, (v) => update({ motion: v })),
    ),
  );

  openModal({
    title: 'Settings',
    body,
    footer: el('button', { class: 'btn btn--solid', type: 'button', text: 'Done', onclick: closeModal }),
  });
}

/* ── credits ──────────────────────────────────────────────── */

function openCredits() {
  const body = el('div', { class: 'credits-list' },
    credit('Game', 'Silicon Empire — a 1990–2026 semiconductor tycoon.'),
    credit('Design', 'Warm editorial dark, serif + mono, blueprint surfaces for technical screens.'),
    credit('Icons', 'Hand-drawn SVG on a 24 px grid. No emoji, no icon fonts.'),
    credit('Status', 'Build 0.1 — menu, new game, desk shell. Simulation not yet wired.'),
  );

  openModal({
    title: 'Credits',
    body,
    footer: el('button', { class: 'btn btn--solid', type: 'button', text: 'Close', onclick: closeModal }),
  });
}

function credit(term, text) {
  return el('dl', { class: 'credit' },
    el('dt', { text: term }),
    el('dd', { text }),
  );
}

/* ── all data ─────────────────────────────────────────────── */

function openData() {
  const summary = dataSummary();

  const body = el('div', {},
    el('div', { class: 'data-grid' },
      stat('Profiles', String(summary.profiles)),
      stat('Saves', String(summary.saves)),
      stat('Storage', bytesLabel(summary.bytes)),
    ),

    el('div', { class: 'setting' },
      el('div', {},
        el('div', { class: 'setting__label', text: 'Export everything' }),
        el('div', { class: 'setting__desc', text: 'Profiles, saves and settings as one JSON file.' }),
      ),
      el('button', { class: 'btn btn--ghost', type: 'button', text: 'Export', onclick: downloadExport }),
    ),

    el('div', { class: 'setting' },
      el('div', {},
        el('div', { class: 'setting__label', text: 'Import' }),
        el('div', { class: 'setting__desc', text: 'Replaces current profiles and saves.' }),
      ),
      el('button', { class: 'btn btn--ghost', type: 'button', text: 'Choose file', onclick: pickImport }),
    ),

    el('div', { class: 'setting' },
      el('div', {},
        el('div', { class: 'setting__label', text: 'Profiles on this device' }),
        el('div', { class: 'setting__desc', text: 'Deleting a profile removes its saves.' }),
      ),
    ),

    el('div', { class: 'slot-list' },
      ...(listProfiles().length
        ? listProfiles().map((p) => el('div', { class: 'slot' },
          el('div', { class: 'slot__body' },
            el('div', { class: 'slot__name', text: p.name }),
            el('div', { class: 'slot__meta', text: `${p.company} · ${listSaves(p.id).length} save(s) · ${timeAgo(p.lastPlayed)}` }),
          ),
          el('button', {
            class: 'icon-btn', type: 'button', title: 'Delete profile', 'aria-label': 'Delete profile',
            html: icon('exit', '16'),
            onclick: () => { deleteProfile(p.id); openData(); toast('Profile deleted.'); },
          }),
        ))
        : [el('p', { class: 'empty__body', text: 'No profiles stored.' })]),
    ),

    el('div', { class: 'danger-zone' },
      el('button', {
        class: 'btn btn--red', type: 'button', text: 'Erase all data',
        onclick: () => {
          clearEverything();
          state.profile = null;
          state.save = null;
          closeModal();
          go('menu');
          toast('All local data erased.', { warn: true });
        },
      }),
      el('span', { class: 'footnote', text: 'Cannot be undone. Export first.' }),
    ),
  );

  openModal({
    title: 'All data',
    body,
    wide: true,
    footer: el('button', { class: 'btn btn--solid', type: 'button', text: 'Close', onclick: closeModal }),
  });
}

function stat(label, value) {
  return el('div', { class: 'data-stat' },
    el('span', { class: 'lbl', text: label }),
    el('span', { class: 'data-stat__value', text: value }),
  );
}

function downloadExport() {
  const payload = exportAll();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = el('a', { href: url, download: `silicon-empire-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  toast('Export downloaded.');
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
      toast('Data imported.');
    } catch {
      toast('That file is not valid JSON.', { warn: true });
    }
  });
  input.click();
}

/* ── formatting ───────────────────────────────────────────── */

function fmtMoney(n) {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(0)}k`;
  return `$${n.toFixed(0)}`;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/* ── keyboard ─────────────────────────────────────────────── */

function onKeyDown(event) {
  const modalOpen = !$('#modalHost').hidden;
  const typing = event.target instanceof Element
    && event.target.closest('input, textarea, select');

  if (event.key === 'Escape') {
    if (modalOpen) return closeModal();
    if (state.screen === 'desk') { stopClock(); go('menu'); return; }
    if (state.screen === 'newgame') { go('menu'); return; }
    return;
  }

  if (state.screen !== 'menu' || modalOpen || typing) return;

  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    const delta = event.key === 'ArrowDown' ? 1 : -1;
    const max = document.querySelectorAll('.menu-item').length - 1;
    const next = Math.max(0, Math.min(state.selectedIndex + delta, max));
    setSelected(next);
    document.querySelector(`.menu-item[data-index="${next}"]`)?.focus();
    return;
  }

  if (event.key === 'Enter') {
    const focused = event.target instanceof Element && event.target.closest('.menu-item');
    if (focused) return; // the button fires its own click
    const item = state.actions[state.selectedIndex];
    if (item) runMenu(item.id);
  }
}

/* ── wafer illustration ───────────────────────────────────── */

function drawWafer() {
  const group = $('#waferDies');
  if (!group || group.childElementCount) return;

  const cx = 150; const cy = 150; const radius = 104;
  const cell = 13; const gap = 2; const step = cell + gap;
  const count = Math.floor((radius * 2) / step);
  const start = -(count * step) / 2;
  const frag = document.createDocumentFragment();

  for (let row = 0; row < count; row += 1) {
    for (let col = 0; col < count; col += 1) {
      const x = start + col * step + (row % 2 ? step / 2 : 0);
      const y = start + row * step;
      const dx = x + cell / 2;
      const dy = y + cell / 2;
      if (Math.hypot(dx, dy) > radius - cell / 2) continue;
      if (dy > radius - 10) continue;

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', (cx + x).toFixed(1));
      rect.setAttribute('y', (cy + y).toFixed(1));
      rect.setAttribute('width', cell);
      rect.setAttribute('height', cell);
      rect.setAttribute('rx', '1.5');

      const n = Math.sin((row * count + col) * 12.9898) * 43758.5453;
      const r = n - Math.floor(n);
      rect.setAttribute('class', r > 0.93
        ? 'wafer-die wafer-die--hot'
        : r > 0.62 ? 'wafer-die wafer-die--warm' : 'wafer-die');
      frag.append(rect);
    }
  }
  group.append(frag);
}

/* ── boot ─────────────────────────────────────────────────── */

function boot() {
  applySettings();
  drawWafer();

  $('#newGameForm').addEventListener('submit', handleNewGame);

  $('#founderName').addEventListener('input', (e) => {
    e.target.classList.remove('field--invalid');
    const hint = $('#nameHint');
    hint.classList.remove('field-hint--error');
    hint.textContent = 'Printed as “by …” on your company plate.';
  });

  document.querySelectorAll('[data-action="settings"]').forEach((b) => b.addEventListener('click', openSettings));
  document.querySelectorAll('[data-action="back-to-menu"]').forEach((b) => b.addEventListener('click', () => go('menu')));
  document.querySelectorAll('[data-action="signout"]').forEach((b) => b.addEventListener('click', switchProfile));

  document.addEventListener('keydown', onKeyDown);

  const activeId = getActiveProfileId();
  const active = activeId ? getProfile(activeId) : null;
  if (active) state.profile = active;

  go('menu');
}

boot();
