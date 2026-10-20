/**
 * Profile + settings storage.
 *
 * This is a single-player, self-hosted game. "Sign in" means picking a local
 * profile — there is no account server and no password, and nothing here
 * pretends otherwise. Data lives in localStorage and can be exported to a file.
 */

const PROFILES_KEY = 'se.profiles.v1';
const ACTIVE_KEY = 'se.active.v1';
const SETTINGS_KEY = 'se.settings.v1';

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
    // Quota or private-mode failure: the caller surfaces this to the player.
    return false;
  }
}

let idCounter = 0;
function newId() {
  idCounter += 1;
  return `p${Date.now().toString(36)}${idCounter}`;
}

/* ── profiles ─────────────────────────────────────────────── */

export function listProfiles() {
  const list = read(PROFILES_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function getProfile(id) {
  return listProfiles().find((p) => p.id === id) ?? null;
}

export function createProfile(name) {
  const trimmed = String(name).trim().slice(0, 28);
  if (!trimmed) return { ok: false, error: 'empty' };

  const existing = listProfiles().find(
    (p) => p.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (existing) return { ok: true, profile: existing, reused: true };

  const profile = {
    id: newId(),
    name: trimmed,
    company: 'Untitled Company',
    founded: 1990,
    createdAt: Date.now(),
    lastPlayed: Date.now(),
    save: null,
  };

  const ok = write(PROFILES_KEY, [...listProfiles(), profile]);
  if (!ok) return { ok: false, error: 'storage' };

  setActiveProfile(profile.id);
  return { ok: true, profile, reused: false };
}

export function touchProfile(id) {
  const list = listProfiles().map((p) =>
    p.id === id ? { ...p, lastPlayed: Date.now() } : p,
  );
  write(PROFILES_KEY, list);
  setActiveProfile(id);
}

export function deleteProfile(id) {
  write(PROFILES_KEY, listProfiles().filter((p) => p.id !== id));
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

/* ── settings ─────────────────────────────────────────────── */

export const DEFAULT_SETTINGS = {
  theme: 'dark',
  scale: 'md',
  motion: 'on',
};

export function getSettings() {
  return { ...DEFAULT_SETTINGS, ...read(SETTINGS_KEY, {}) };
}

export function saveSettings(settings) {
  write(SETTINGS_KEY, settings);
  return settings;
}

/* ── helpers ──────────────────────────────────────────────── */

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
