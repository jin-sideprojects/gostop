// Sprachen der Oberfläche: English (Standard), Deutsch, 한국어.
// T ist ein gemeinsames Objekt: setLang() tauscht den Inhalt aus, alle Module sehen sofort die neue Sprache.
import { T as de } from './i18n.de.js';
import { T as en } from './i18n.en.js';
import { T as ko } from './i18n.ko.js';

export const LANGS = { de, en, ko };
export const LANG_NAMES = { de: 'Deutsch', en: 'English', ko: '한국어' };
export const T = {};
let current = 'en';

export function setLang(code) {
  current = LANGS[code] ? code : 'en';
  for (const k of Object.keys(T)) delete T[k];
  Object.assign(T, LANGS[current]);
  if (typeof document !== 'undefined') document.documentElement.lang = current;
  return current;
}

export const getLang = () => current;

// 저장된 언어가 없으면 브라우저 언어를 감지: ko → 한국어, de → 독일어, 그 외 모든 국가 → 영어(en)
export function initialLang() {
  try {
    const saved = localStorage.getItem('matgo-lang');
    if (saved && LANGS[saved]) return saved;
  } catch {
    /* kein Speicher */
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language || '' : '';
  if (/^ko/i.test(nav)) return 'ko';
  if (/^de/i.test(nav)) return 'de';
  return 'en';
}

setLang(typeof window !== 'undefined' ? initialLang() : 'en');
