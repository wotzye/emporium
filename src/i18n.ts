import it from './i18n/it.json';
import en from './i18n/en.json';

export type Lang = 'it' | 'en';
type Dict = Record<string, string>;

const dicts: Record<Lang, Dict> = { it: it as Dict, en: en as Dict };
let current: Lang = 'it';

export function setLang(l: Lang) {
  current = l;
  document.documentElement.lang = l;
}
export function getLang(): Lang {
  return current;
}

/** Translate a key. Placeholders like {name} are replaced from vars, and {{key}} from other keys (used for proper names). */
export function t(key: string, vars?: Record<string, string | number>): string {
  let s = dicts[current][key] ?? dicts.it[key] ?? key;
  s = s.replace(/\{\{([\w.]+)\}\}/g, (_, k) => dicts[current][k] ?? dicts.it[k] ?? k);
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  return s;
}

export function has(key: string): boolean {
  return key in dicts[current] || key in dicts.it;
}
