/**
 * Silicon Empire — boot, login, main menu.
 *
 * Two static screens, plain DOM. The sim is not wired yet, so menu actions
 * that depend on it say so plainly instead of pretending to work.
 */

import {
  listProfiles, getProfile, createProfile, touchProfile,
  getActiveProfileId, setActiveProfile, clearActiveProfile,
  getSettings, saveSettings, initials, timeAgo,
} from './app/store.js';

/* ── tiny DOM helpers ─────────────────────────────────────── */

const $ = (sel, root = document) => root.querySelector(sel);
const el = (tag, props = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
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
  screen: 'login',
  profile: null,
  selectedMenuIndex: 0,
};

/* ── theme + settings ─────────────────────────────────────── */

function applySettings() {
  const s = getSettings();
  document.documentElement.dataset.theme = s.theme;
  document.body.dataset.scale = s.scale;
  document.documentElement.dataset.motion = s.motion;
}

/* ── toast ────────────────────────────────────────────────── */

let toastTimer = null;

function toast(message, { warn = false, ms = 3600 } = {}) {
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
  if (screen === 'login') {
    setLoginCopy();
    renderProfiles();
    requestAnimationFrame(() => $('#founderName')?.focus());
  }
}

/* ══════════════════════════ LOGIN ══════════════════════════ */

function setLoginCopy() {
  const hasProfiles = listProfiles().length > 0;
  $('#loginTitle').textContent = hasProfiles ? 'Sign in' : 'Create your profile';
  $('#enterBtn').firstChild.textContent = hasProfiles ? 'Enter ' : 'Found your company ';
}

function renderProfiles() {
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
    ...profiles.map((p) =>
      el('button', {
        class: 'profile',
        type: 'button',
        role: 'listitem',
        onclick: () => enterAs(p),
      },
        el('span', { class: 'profile__avatar', 'aria-hidden': 'true', text: initials(p.name) }),
        el('span', { class: 'profile__body' },
          el('span', { class: 'profile__name', text: p.name }),
          el('span', {
            class: 'profile__meta',
            text: p.save ? `save · week ${p.save.week ?? 1}` : `no save · ${timeAgo(p.lastPlayed)}`,
          }),
        ),
        el('span', { class: 'profile__go', html: icon('arrow', '16') }),
      ),
    ),
  );
}

function enterAs(profile) {
  state.profile = profile;
  touchProfile(profile.id);
  go('menu');
}

function handleLogin(event) {
  event.preventDefault();
  const input = $('#founderName');
  const hint = $('#nameHint');
  const name = input.value.trim();

  if (!name) {
    input.classList.add('field--invalid');
    hint.classList.add('field-hint--error');
    hint.textContent = 'Enter a name — it prints on your company plate.';
    input.focus();
    return;
  }

  input.classList.remove('field--invalid');
  hint.classList.remove('field-hint--error');

  const result = createProfile(name);
  if (!result.ok) {
    hint.classList.add('field-hint--error');
    hint.textContent = result.error === 'storage'
      ? 'Could not save: browser storage is full or blocked.'
      : 'That name cannot be used.';
    return;
  }

  state.profile = result.profile;
  go('menu');
}

/* ══════════════════════════ MAIN MENU ══════════════════════ */

const MENU_ITEMS = [
  {
    id: 'continue',
    icon: 'arrow',
    label: 'Continue',
    desc: 'Resume the last campaign',
    hint: 'ENTER',
    needsSave: true,
  },
  {
    id: 'new',
    icon: 'plus',
    label: 'New company',
    desc: 'Start January 1990',
    hint: 'N',
  },
  {
    id: 'load',
    icon: 'disk',
    label: 'Load game',
    desc: 'Open a saved slot',
    hint: 'L',
    needsSave: true,
  },
  { sep: true },
  {
    id: 'settings',
    icon: 'gear',
    label: 'Settings',
    desc: 'Display, text size, motion',
    hint: 'S',
  },
  {
    id: 'credits',
    icon: 'book',
    label: 'Credits',
    desc: 'Who built this',
    hint: 'C',
  },
  { sep: true },
  {
    id: 'signout',
    icon: 'exit',
    label: 'Sign out',
    desc: 'Back to profile select',
    hint: 'ESC',
  },
];

function renderMenu() {
  const profile = state.profile ?? getProfile(getActiveProfileId());
  if (!profile) {
    go('login');
    return;
  }
  state.profile = profile;

  const hasSave = Boolean(profile.save);

  $('#companyName').textContent = profile.company || 'Untitled Company';
  $('#menuFounder').textContent = profile.name;
  $('#profilePill').textContent = initials(profile.name);
  $('#menuStatus').textContent = hasSave
    ? `Save · week ${profile.save.week ?? 1}`
    : 'No save in this profile';

  const list = $('#menuList');
  list.replaceChildren();

  const actionable = [];

  MENU_ITEMS.forEach((item) => {
    if (item.sep) {
      list.append(el('div', { class: 'menu-sep', 'aria-hidden': 'true' }));
      return;
    }

    const disabled = item.needsSave && !hasSave;
    const index = actionable.length;
    actionable.push(item);

    const button = el('button', {
      class: 'menu-item',
      type: 'button',
      role: 'menuitem',
      'data-index': index,
      'aria-disabled': disabled ? 'true' : null,
      onclick: () => (disabled
        ? toast('No save in this profile yet — start a new company.', { warn: true })
        : runMenuAction(item)),
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

  state.actionable = actionable;
  setSelected(0);
}

function setSelected(index) {
  const items = [...document.querySelectorAll('.menu-item')];
  if (!items.length) return;
  const clamped = Math.max(0, Math.min(index, items.length - 1));
  state.selectedMenuIndex = clamped;
  items.forEach((node, i) => node.dataset.selected = String(i === clamped));
}

function runMenuAction(item) {
  switch (item.id) {
    case 'continue':
    case 'load':
      toast('The desk screen is next in the build order — no campaign yet.', { warn: true });
      break;
    case 'new':
      toast('New campaign arrives with the sim skeleton (step 2).', { warn: true });
      break;
    case 'settings':
      openSettings();
      break;
    case 'credits':
      openCredits();
      break;
    case 'signout':
      signOut();
      break;
    default:
      break;
  }
}

function signOut() {
  clearActiveProfile();
  state.profile = null;
  $('#founderName').value = '';
  closeModal();
  go('login');
}

/* ── modal ────────────────────────────────────────────────── */

function openModal({ title, body, footer }) {
  const host = $('#modalHost');
  const panel = el('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title });

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
  panel.querySelector('button')?.focus();
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

function openSettings() {
  const s = getSettings();
  const update = (patch) => {
    const next = saveSettings({ ...getSettings(), ...patch });
    applySettings();
    return next;
  };

  const body = el('div', {},
    el('div', { class: 'setting' },
      el('div', {},
        el('div', { class: 'setting__label', text: 'Theme' }),
        el('div', { class: 'setting__desc', text: 'Warm dark is the default. Light keeps parity.' }),
      ),
      segment(
        [{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }],
        s.theme,
        (v) => update({ theme: v }),
      ),
    ),
    el('div', { class: 'setting' },
      el('div', {},
        el('div', { class: 'setting__label', text: 'Text size' }),
        el('div', { class: 'setting__desc', text: 'Scales the whole interface.' }),
      ),
      segment(
        [{ value: 'md', label: 'Normal' }, { value: 'lg', label: 'Large' }, { value: 'xl', label: 'X-Large' }],
        s.scale,
        (v) => update({ scale: v }),
      ),
    ),
    el('div', { class: 'setting' },
      el('div', {},
        el('div', { class: 'setting__label', text: 'Motion' }),
        el('div', { class: 'setting__desc', text: 'Turn off animations and the wafer pulse.' }),
      ),
      segment(
        [{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }],
        s.motion,
        (v) => update({ motion: v }),
      ),
    ),
  );

  openModal({
    title: 'Settings',
    body,
    footer: el('button', { class: 'btn btn--solid', type: 'button', text: 'Done', onclick: closeModal }),
  });
}

function openCredits() {
  const body = el('div', { class: 'credits-list' },
    el('dl', { class: 'credit' },
      el('dt', { text: 'Game' }),
      el('dd', {}, el('b', { text: 'Silicon Empire' }), ' — a 1990–2026 semiconductor tycoon.'),
    ),
    el('dl', { class: 'credit' },
      el('dt', { text: 'Design' }),
      el('dd', { text: 'Warm editorial dark, serif + mono, blueprint surfaces for technical screens.' }),
    ),
    el('dl', { class: 'credit' },
      el('dt', { text: 'Icons' }),
      el('dd', { text: 'Hand-drawn SVG on a 24 px grid. No emoji, no icon fonts.' }),
    ),
    el('dl', { class: 'credit' },
      el('dt', { text: 'Status' }),
      el('dd', { text: 'Build 0.1 — login and main menu only. Simulation not yet wired.' }),
    ),
  );

  openModal({
    title: 'Credits',
    body,
    footer: el('button', { class: 'btn btn--solid', type: 'button', text: 'Close', onclick: closeModal }),
  });
}

/* ── wafer illustration ───────────────────────────────────── */

function drawWafer() {
  const group = $('#waferDies');
  if (!group) return;

  const cx = 150;
  const cy = 150;
  const radius = 104;
  const cell = 13;
  const gap = 2;
  const step = cell + gap;

  const dies = [];
  const count = Math.floor((radius * 2) / step);
  const start = -(count * step) / 2;

  for (let row = 0; row < count; row += 1) {
    for (let col = 0; col < count; col += 1) {
      const x = start + col * step + (row % 2 ? step / 2 : 0);
      const y = start + row * step;
      const dx = x + cell / 2;
      const dy = y + cell / 2;
      if (Math.hypot(dx, dy) > radius - cell / 2) continue;
      // keep clear of the flat at the bottom
      if (dy > radius - 10) continue;
      dies.push({ x: cx + x, y: cy + y, dx, dy });
    }
  }

  const frag = document.createDocumentFragment();
  dies.forEach((d, i) => {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', d.x.toFixed(1));
    rect.setAttribute('y', d.y.toFixed(1));
    rect.setAttribute('width', cell);
    rect.setAttribute('height', cell);
    rect.setAttribute('rx', '1.5');

    // a scattered "good die" pattern, deterministic so it never flickers
    const n = Math.sin(i * 12.9898) * 43758.5453;
    const r = n - Math.floor(n);
    if (r > 0.93) rect.setAttribute('class', 'wafer-die wafer-die--hot');
    else if (r > 0.62) rect.setAttribute('class', 'wafer-die wafer-die--warm');
    else rect.setAttribute('class', 'wafer-die');

    frag.append(rect);
  });

  group.append(frag);

  // slow sweep so the wafer reads as "processing"
  const sweep = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  sweep.setAttribute('cx', cx);
  sweep.setAttribute('cy', cy);
  sweep.setAttribute('r', radius - 30);
  sweep.setAttribute('fill', 'none');
  sweep.setAttribute('stroke', 'currentColor');
  sweep.setAttribute('stroke-width', '1');
  sweep.setAttribute('class', 'wafer-pulse');
  sweep.setAttribute('opacity', '.2');
  group.parentNode.append(sweep);
}

/* ── keyboard ─────────────────────────────────────────────── */

function onKeyDown(event) {
  const modalOpen = !$('#modalHost').hidden;

  if (event.key === 'Escape') {
    if (modalOpen) { closeModal(); return; }
    if (state.screen === 'menu') { signOut(); return; }
  }

  if (state.screen !== 'menu' || modalOpen) return;

  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    const delta = event.key === 'ArrowDown' ? 1 : -1;
    const next = state.selectedMenuIndex + delta;
    setSelected(next);
    document.querySelector(`.menu-item[data-index="${Math.max(0, Math.min(next, document.querySelectorAll('.menu-item').length - 1))}"]`)?.focus();
  }

  if (event.key === 'Enter') {
    // a focused button already fires click on Enter — don't also run it here
    if (event.target instanceof Element && event.target.closest('.menu-item')) return;
    if (event.target instanceof Element && event.target.closest('input, button')) return;
    const item = state.actionable?.[state.selectedMenuIndex];
    if (item) runMenuAction(item);
  }
}

/* ── boot ─────────────────────────────────────────────────── */

function boot() {
  applySettings();
  drawWafer();

  $('#loginForm').addEventListener('submit', handleLogin);

  $('#founderName').addEventListener('input', (e) => {
    e.target.classList.remove('field--invalid');
    const hint = $('#nameHint');
    hint.classList.remove('field-hint--error');
    hint.textContent = 'Shown as “by …” on your company plate.';
  });

  document.querySelectorAll('[data-action="settings"]').forEach((btn) =>
    btn.addEventListener('click', openSettings));
  document.querySelectorAll('[data-action="signout"]').forEach((btn) =>
    btn.addEventListener('click', signOut));

  document.addEventListener('keydown', onKeyDown);

  // Resume straight to the menu if a profile was active last session.
  const activeId = getActiveProfileId();
  const active = activeId ? getProfile(activeId) : null;
  if (active) {
    state.profile = active;
    go('menu');
  } else {
    go('login');
  }
}

boot();
