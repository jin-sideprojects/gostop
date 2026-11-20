// Ansagen mit der eingebauten Sprachausgabe des Browsers (keine Audiodateien).
// "Go" als freche hohe Frauenstimme, "Stopp" als kühle tiefe Männerstimme.
let enabled = true;
let unlocked = false;

export function setVoiceEnabled(on) {
  enabled = on;
  if (!on) window.speechSynthesis?.cancel();
}

// iPhone: Sprachausgabe muss einmal in einer Berührung starten
export function unlockVoice() {
  const ss = window.speechSynthesis;
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

const FEMALE = /female|frau|woman|zira|samantha|victoria|karen|tessa|moira|fiona|susan|hazel|anna|helena|katja|marlene|vicki|google us english$|google uk english female/i;
const MALE = /\bmale\b|mann|david|daniel|alex|fred|george|mark|james|stefan|markus|hans|google uk english male|guy|ryan/i;

function pickVoice(kind) {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  const en = voices.filter((v) => /^en/i.test(v.lang));
  const pool = en.length ? en : voices;
  const re = kind === 'female' ? FEMALE : MALE;
  return pool.find((v) => re.test(v.name) && !(kind === 'female' && /\bmale\b/i.test(v.name) && !/female/i.test(v.name))) ?? pool[0] ?? null;
}

function say(text, { pitch, rate, volume = 1, kind, voice = null }) {
  const ss = window.speechSynthesis;
  if (!enabled || !ss) return;
  try {
    ss.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = voice ?? pickVoice(kind);
    if (v) {
      u.voice = v;
      u.lang = v.lang;
    } else {
      u.lang = 'en-US';
    }
    u.pitch = pitch;
    u.rate = rate;
    u.volume = volume;
    ss.speak(u);
  } catch {
    /* ohne Sprachausgabe weiter */
  }
}

// "꼬오~": mit koreanischer Stimme, wenn das Gerät eine hat; sonst so nah wie möglich auf Englisch
const GO_KO = ['', '꼬오~!', '투 꼬오~!', '쓰리 꼬오~!', '포 꼬오~!', '파이브 꼬오~!'];
const GO_EN = ['', 'Kkoh-oh~!', 'Two, kkoh-oh~!', 'Three, kkoh-oh~!', 'Four, kkoh-oh~!', 'Five, kkoh-oh~!'];

function koreanVoice() {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  const ko = voices.filter((v) => /^ko/i.test(v.lang));
  return ko.find((v) => FEMALE.test(v.name) || /yuna|sora|heami|sunhi|jimin|female|여/i.test(v.name)) ?? ko[0] ?? null;
}

export function sayGo(count = 1) {
  // hoch, gedehnt, ein bisschen frech
  const ko = koreanVoice();
  if (ko) {
    say(GO_KO[count] ?? `${count} 꼬오~!`, { pitch: 1.75, rate: 0.78, voice: ko });
  } else {
    say(GO_EN[count] ?? `${count}, kkoh-oh~!`, { pitch: 1.9, rate: 0.72, kind: 'female' });
  }
}

export function sayStop() {
  // tief, kurz, entschieden
  say('Stop.', { pitch: 0.35, rate: 0.85, kind: 'male' });
}

// Stimmenliste lädt in manchen Browsern erst später
window.speechSynthesis?.addEventListener?.('voiceschanged', () => {});
