// Sprachen der Oberfläche: Deutsch (Standard), English, 한국어.
// T ist ein gemeinsames Objekt: setLang() tauscht den Inhalt aus, alle Module sehen sofort die neue Sprache.
import { T as de } from './i18n.de.js';
import { T as en } from './i18n.en.js';
import { T as ko } from './i18n.ko.js';

export const LANGS = { de, en, ko };
export const LANG_NAMES = { de: 'Deutsch', en: 'English', ko: '한국어' };
export const T = {};
let current = 'de';

export function setLang(code) {
  current = LANGS[code] ? code : 'de';
  for (const k of Object.keys(T)) delete T[k];
  Object.assign(T, LANGS[current]);
  if (typeof document !== 'undefined') document.documentElement.lang = current;
  return current;
}

export const getLang = () => current;

// Gespeicherte Wahl, sonst Sprache des Geräts (Koreanisch/Englisch), sonst Deutsch
export function initialLang() {
  try {
    const saved = localStorage.getItem('matgo-lang');
    if (saved && LANGS[saved]) return saved;
  } catch {
    /* kein Speicher */
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language || '' : '';
  if (/^ko/i.test(nav)) return 'ko';
  if (/^en/i.test(nav)) return 'en';
  return 'de';
}

setLang(typeof window !== 'undefined' ? initialLang() : 'de');
