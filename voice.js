// Ansagen mit der eingebauten Sprachausgabe des Browsers (keine Audiodateien).
// "Go" als freche hohe Frauenstimme, "Stopp" als kühle tiefe Männerstimme –
// immer in der gewählten Spielsprache und mit einer Stimme dieser Sprache.
import { T } from './i18n.js';

const hasWindow = typeof window !== 'undefined';
let enabled = true;
let unlocked = false;

export function setVoiceEnabled(on) {
  enabled = on;
  if (!on && hasWindow) window.speechSynthesis?.cancel();
}

// iPhone: Sprachausgabe muss einmal in einer Berührung starten
export function unlockVoice() {
  const ss = hasWindow ? window.speechSynthesis : null;
  if (!ss || unlocked) return;
  unlocked = true;
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    ss.speak(u);
  } catch {
    /* ohne Sprachausgabe weiter */
  }
}

const FEMALE = /female|frau|woman|zira|samantha|victoria|karen|tessa|moira|fiona|susan|hazel|anna|helena|katja|marlene|vicki|petra|yuna|sora|heami|sunhi|jimin|여성|google us english$|google uk english female/i;
const MALE = /\bmale\b|mann|david|daniel|alex|fred|george|mark|james|stefan|markus|hans|conrad|guy|ryan|injoon|minsu|남성|google uk english male/i;

// Stimme der Spielsprache (z. B. 'ko-KR'), passend zur Art; null, wenn das Gerät keine hat
export function pickVoiceFor(voices, lang, kind) {
  const base = lang.slice(0, 2).toLowerCase();
  const pool = voices.filter((v) => (v.lang || '').toLowerCase().replace('_', '-').startsWith(base));
  if (!pool.length) return null;
  const isFemale = (v) => FEMALE.test(v.name) && !(/\bmale\b/i.test(v.name) && !/female/i.test(v.name));
  const isMale = (v) => MALE.test(v.name) && !/female/i.test(v.name);
  const exact = pool.filter((v) => v.lang.replace('_', '-') === lang);
  const order = [...exact, ...pool];
  return order.find(kind === 'female' ? isFemale : isMale) ?? order[0];
}

function say(text, { pitch, rate, kind, lang = T.voiceLang, queue = false }) {
  const ss = hasWindow ? window.speechSynthesis : null;
  if (!enabled || !ss) return;
  try {
    if (!queue) ss.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang; // ohne passende Stimme wählt der Browser selbst eine dieser Sprache
    const v = pickVoiceFor(ss.getVoices() ?? [], lang, kind);
    if (v) u.voice = v;
    u.pitch = pitch;
    u.rate = rate;
    u.volume = 1;
    ss.speak(u);
  } catch {
    /* ohne Sprachausgabe weiter */
  }
}

export function sayGo(count = 1) {
  // hoch, etwas gedehnt, ein bisschen frech
  say(T.voiceGo(count), { pitch: 1.7, rate: 0.85, kind: 'female' });
}

export function sayStop() {
  // tief, kurz, entschieden
  say(T.voiceStop, { pitch: 0.4, rate: 0.9, kind: 'male' });
}

// Diese drei Rufe sind in jeder Spielsprache gleich: Englisch "Start!", Koreanisch "아싸!" und "쌌다!"
export const CALLS = Object.freeze({
  start: { text: 'Start!', lang: 'en-US' },
  steal: { text: '아싸!', lang: 'ko-KR' },
  ppeok: { text: '쌌다!', lang: 'ko-KR' },
});

export function sayStart() {
  // laut, munter, wie ein Ansager
  say(CALLS.start.text, { lang: CALLS.start.lang, pitch: 1.3, rate: 0.9, kind: 'female' });
}

export function saySteal(queue = false) {
  // freudig: Spreu geklaut
  say(CALLS.steal.text, { lang: CALLS.steal.lang, pitch: 1.6, rate: 0.85, kind: 'female', queue });
}

export function sayPpeok(queue = false) {
  // Ppeok: "쌌다!"
  say(CALLS.ppeok.text, { lang: CALLS.ppeok.lang, pitch: 0.8, rate: 0.95, kind: 'male', queue });
}

// Stimmenliste lädt in manchen Browsern erst später
if (hasWindow) window.speechSynthesis?.addEventListener?.('voiceschanged', () => {});
