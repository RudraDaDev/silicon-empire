/**
 * Profiles, saves, settings — all local.
 *
 * Single-player, self-hosted. There is no account server and no password;
 * profiles and saves live in localStorage and can be exported to a file.
 */

const PROFILES_KEY = 'se.profiles.v1';
const ACTIVE_KEY = 'se.active.v1';
const SETTINGS_KEY = 'se.settings.v1';
const SAVES_KEY = 'se.saves.v1';

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

let idCounter = 0;
const newId = (prefix) => `${prefix}${Date.now().toString(36)}${++idCounter}`;

/* ── profiles ─────────────────────────────────────────────── */

export function listProfiles() {
  const list = read(PROFILES_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function getProfile(id) {
  return listProfiles().find((p) => p.id === id) ?? null;
}

export function createProfile(name, company = 'Untitled Company') {
  const founder = String(name).trim().slice(0, 28);
  if (!founder) return { ok: false, error: 'empty' };

  const existing = listProfiles().find(
    (p) => p.name.toLowerCase() === founder.toLowerCase(),
  );
  if (existing) return { ok: true, profile: existing, reused: true };

  const profile = {
    id: newId('p'),
    name: founder,
    company: String(company).trim().slice(0, 34) || 'Untitled Company',
    founded: 1990,
    createdAt: Date.now(),
    lastPlayed: Date.now(),
  };

  if (!write(PROFILES_KEY, [...listProfiles(), profile])) {
    return { ok: false, error: 'storage' };
  }
  setActiveProfile(profile.id);
  return { ok: true, profile, reused: false };
}

export function renameCompany(profileId, company) {
  const name = String(company).trim().slice(0, 34);
  if (!name) return false;
  const list = listProfiles().map((p) => (p.id === profileId ? { ...p, company: name } : p));
  return write(PROFILES_KEY, list);
}

export function touchProfile(id) {
  const list = listProfiles().map((p) =>
    (p.id === id ? { ...p, lastPlayed: Date.now() } : p),
  );
  write(PROFILES_KEY, list);
  setActiveProfile(id);
}

export function deleteProfile(id) {
  write(PROFILES_KEY, listProfiles().filter((p) => p.id !== id));
  const saves = read(SAVES_KEY, {});
  delete saves[id];
  write(SAVES_KEY, saves);
  if (getActiveProfileId() === id) localStorage.removeItem(ACTIVE_KEY);
}

export function getActiveProfileId() {
  return read(ACTIVE_KEY, null);
}

export function setActiveProfile(id) {
  write(ACTIVE_KEY, id);
}

export function clearActiveProfile() {
  localStorage.removeItem(ACTIVE_KEY);
}

/* ── saves ────────────────────────────────────────────────── */

function allSaves() {
  const value = read(SAVES_KEY, {});
  return value && typeof value === 'object' ? value : {};
}

export function listSaves(profileId) {
  const saves = allSaves()[profileId];
  if (!Array.isArray(saves)) return [];
  // newest first; `n` breaks ties when two saves land in the same millisecond
  return [...saves].sort((a, b) =>
    (b.updatedAt - a.updatedAt) || ((b.n ?? 0) - (a.n ?? 0)));
}

export function latestSave(profileId) {
  return listSaves(profileId)[0] ?? null;
}

export function createSave(profileId, { company, founder, seed = 1990 } = {}) {
  const store = allSaves();
  const existing = store[profileId] ?? [];
  const nextN = existing.reduce((max, s) => Math.max(max, s.n ?? 0), 0) + 1;
  const save = {
    id: newId('s'),
    n: nextN,
    company: String(company || 'Untitled Company').slice(0, 34),
    founder: String(founder || 'You').slice(0, 28),
    seed,
    year: 1990,
    week: 1,
    cash: 4_200_000,
    rp: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    // Placeholder sim state until the simulation core exists.
    demo: true,
  };
  store[profileId] = [...(store[profileId] ?? []), save];
  if (!write(SAVES_KEY, store)) return { ok: false, error: 'storage' };
  return { ok: true, save };
}

export function updateSave(profileId, saveId, patch) {
  const store = allSaves();
  const list = store[profileId];
  if (!Array.isArray(list)) return null;
  let updated = null;
  store[profileId] = list.map((s) => {
    if (s.id !== saveId) return s;
    updated = { ...s, ...patch, updatedAt: Date.now() };
    return updated;
  });
  write(SAVES_KEY, store);
  return updated;
}

export function deleteSave(profileId, saveId) {
  const store = allSaves();
  const list = store[profileId];
  if (!Array.isArray(list)) return;
  store[profileId] = list.filter((s) => s.id !== saveId);
  write(SAVES_KEY, store);
}

/* ── settings ─────────────────────────────────────────────── */

export const DEFAULT_SETTINGS = { theme: 'dark', scale: 'md', motion: 'on' };

export function getSettings() {
  return { ...DEFAULT_SETTINGS, ...read(SETTINGS_KEY, {}) };
}

export function saveSettings(settings) {
  write(SETTINGS_KEY, settings);
  return settings;
}

/* ── all data ─────────────────────────────────────────────── */

export function exportAll() {
  return {
    format: 'silicon-empire-export',
    version: 1,
    exportedAt: new Date().toISOString(),
    profiles: listProfiles(),
    saves: allSaves(),
    settings: getSettings(),
  };
}

export function importAll(payload) {
  if (!payload || payload.format !== 'silicon-empire-export') {
    return { ok: false, error: 'Not a Silicon Empire export file.' };
  }
  if (!Array.isArray(payload.profiles)) {
    return { ok: false, error: 'Export file is missing profile data.' };
  }
  const ok = write(PROFILES_KEY, payload.profiles)
    && write(SAVES_KEY, payload.saves ?? {})
    && write(SETTINGS_KEY, payload.settings ?? DEFAULT_SETTINGS);
  return ok ? { ok: true } : { ok: false, error: 'Could not write to storage.' };
}

export function dataSummary() {
  const profiles = listProfiles();
  const saves = allSaves();
  const saveCount = Object.values(saves).reduce(
    (total, list) => total + (Array.isArray(list) ? list.length : 0), 0,
  );
  let bytes = 0;
  for (const key of [PROFILES_KEY, ACTIVE_KEY, SETTINGS_KEY, SAVES_KEY]) {
    bytes += (localStorage.getItem(key) ?? '').length;
  }
  return { profiles: profiles.length, saves: saveCount, bytes };
}

export function clearEverything() {
  for (const key of [PROFILES_KEY, ACTIVE_KEY, SETTINGS_KEY, SAVES_KEY]) {
    localStorage.removeItem(key);
  }
}

/* ── formatting helpers ───────────────────────────────────── */

export function initials(name) {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '—';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function timeAgo(ts) {
  if (!ts) return 'never';
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function bytesLabel(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
