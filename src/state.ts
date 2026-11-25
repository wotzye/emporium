import type { Lang } from './i18n';

export interface Settings {
  quality: 'high' | 'medium' | 'low';
  reducedScares: boolean;
  noFlash: boolean;
  color: boolean;
  unlimitedHints: boolean;
  volume: number;
  /** 0 normal, 1 bright (default), 2 very bright */
  brightness: number;
  /** 0 normal, 1 large (default), 2 very large */
  textSize: number;
  /** use microphone and motion for physical clues (else: hold a button) */
  sensors: boolean;
  /** small pulsing marks on the things you can tap */
  markers: boolean;
}

export interface Save {
  v: 1;
  lang: Lang;
  location: string;
  flags: Record<string, boolean | number | string>;
  inventory: string[];
  notebook: string[];
  diary: string[];
  hintsUsed: Record<string, number>;
  settings: Settings;
}

const KEY = 'cosepreziose.save.v1';
const SETTINGS_KEY = 'cosepreziose.settings.v1';

export function defaultSettings(): Settings {
  const touch = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
  return { quality: touch ? 'medium' : 'high', reducedScares: false, noFlash: false, color: true, unlimitedHints: false, volume: 0.8, brightness: 1, textSize: 1, sensors: true, markers: true };
}

export function newSave(lang: Lang, settings: Settings): Save {
  return {
    v: 1,
    lang,
    location: 'map',
    flags: {},
    inventory: [],
    notebook: [],
    diary: [],
    hintsUsed: {},
    settings,
  };
}

export function loadSave(): Save | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Save;
    if (s.v !== 1) return null;
    s.settings = { ...defaultSettings(), ...s.settings };
    return s;
  } catch {
    return null;
  }
}

export function writeSave(s: Save) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ lang: s.lang, settings: s.settings }));
  } catch {
    /* storage not available: play without saving */
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function loadPrefs(): { lang: Lang; settings: Settings } {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return { lang: p.lang === 'en' ? 'en' : 'it', settings: { ...defaultSettings(), ...p.settings } };
    }
  } catch {
    /* ignore */
  }
  const nav = (navigator.language || 'it').toLowerCase();
  return { lang: nav.startsWith('it') ? 'it' : 'en', settings: defaultSettings() };
}
