// Effektgeräusche, direkt im Browser erzeugt (keine Audiodateien).
// Browser erlauben Ton erst nach einer Berührung: unlock() beim ersten Tippen aufrufen.
let ctx = null;
let enabled = true;

// Zustand für Tests und Fehlersuche
export const audioState = () => (ctx ? ctx.state : 'none');

export function setEnabled(on) {
  enabled = on;
}

// Muss direkt in einer Nutzeraktion laufen (click / touchend / keydown).
// Auf dem Handy zählt das bloße Aufsetzen des Fingers (pointerdown) dafür nicht.
export function unlock() {
  try {
    // iPhone: auch im Lautlos-Modus abspielen (Safari 17+)
    if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback';
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state !== 'running') {
      ctx.resume();
      // ältere iPhones: ein stiller Mini-Ton im selben Tipp schaltet den Ton frei
      const src = ctx.createBufferSource();
      src.buffer = ctx.createBuffer(1, 1, 22050);
      src.connect(ctx.destination);
      src.start(0);
    }
  } catch {
    ctx = null;
  }
}

function ready() {
  if (ctx && typeof OfflineAudioContext !== 'undefined' && ctx instanceof OfflineAudioContext) return true; // Aufnahme zum Probehören
  return enabled && ctx && ctx.state === 'running';
}

// Nur zum Probehören/Testen: Klänge in einen anderen Kontext (z. B. OfflineAudioContext) schreiben
export function useContext(c) {
  ctx = c;
}

function noise(dur) {
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 2;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  return src;
}

function burst({ at = 0, dur = 0.06, freq = 1800, q = 1.2, gain = 0.6, type = 'bandpass' }) {
  const t = ctx.currentTime + at;
  const src = noise(dur);
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(ctx.destination);
  src.start(t);
}

function tone({ at = 0, dur = 0.12, from = 440, to = from, gain = 0.25, type = 'sine' }) {
  const t = ctx.currentTime + at;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(from, t);
  o.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sfx = {
  // Plastikkarte trifft Plastikkarte: kurzer harter Klick, etwas Körper, kein Klingen
  clack(at = 0, loud = 1) {
    burst({ at, dur: 0.018, freq: 3800, q: 1.4, gain: 1.0 * loud }); // harter Anschlag
    burst({ at: at + 0.002, dur: 0.045, freq: 1250, q: 2.2, gain: 0.7 * loud }); // Plastikkörper
    burst({ at: at + 0.004, dur: 0.03, freq: 6500, q: 0.9, gain: 0.35 * loud, type: 'highpass' }); // Glanz der Kante
    tone({ at, dur: 0.05, from: 190, to: 110, gain: 0.22 * loud }); // leichter Stoß in den Tisch
  },
  // Karte auf den Tisch schlagen: "딱!"
  slap() {
    if (!ready()) return;
    sfx.clack(0, 1);
  },
  // Aufgedeckt und passt: zwei Karten klatschen aufeinander, kleiner Nachprall
  match() {
    if (!ready()) return;
    sfx.clack(0, 1.15);
    sfx.clack(0.028, 0.45);
  },
  // Aufgedeckt, kein Partner: landet weicher auf dem Filz
  miss() {
    if (!ready()) return;
    burst({ dur: 0.03, freq: 2200, q: 1.2, gain: 0.45 });
    burst({ at: 0.003, dur: 0.06, freq: 700, q: 1.0, gain: 0.5, type: 'lowpass' });
    tone({ dur: 0.07, from: 150, to: 90, gain: 0.25 });
  },
  // Besonderes (Ppeok, Go, Spreu genommen …)
  special() {
    if (!ready()) return;
    tone({ dur: 0.12, from: 660, gain: 0.15, type: 'square' });
    tone({ at: 0.1, dur: 0.18, from: 990, gain: 0.12, type: 'square' });
  },
  // Bombe: tiefer Knall mit Rauschen
  boom() {
    if (!ready()) return;
    burst({ dur: 0.9, freq: 900, q: 0.5, gain: 1.0, type: 'lowpass' });
    tone({ dur: 0.7, from: 110, to: 30, gain: 0.9 });
    tone({ at: 0.02, dur: 0.35, from: 60, to: 35, gain: 0.7, type: 'square' });
  },
  // Schütteln: klappernde Karten
  rattle() {
    if (!ready()) return;
    for (let i = 0; i < 9; i++) burst({ at: i * 0.055, dur: 0.035, freq: 2200 + (i % 3) * 600, q: 2, gain: 0.55 });
  },
  // Ppeok: "Plopp" mit nassem Nachklang
  plop() {
    if (!ready()) return;
    tone({ dur: 0.22, from: 420, to: 90, gain: 0.5 });
    burst({ at: 0.12, dur: 0.18, freq: 400, q: 0.8, gain: 0.45, type: 'lowpass' });
    tone({ at: 0.2, dur: 0.12, from: 160, to: 60, gain: 0.3 });
  },
  // Abräumen: Besen-Wusch
  swoosh() {
    if (!ready()) return;
    const t = ctx.currentTime;
    const src = noise(0.8);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 0.9;
    f.frequency.setValueAtTime(600, t);
    f.frequency.exponentialRampToValueAtTime(4200, t + 0.45);
    f.frequency.exponentialRampToValueAtTime(900, t + 0.8);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(0.7, t + 0.2);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    src.connect(f).connect(g).connect(ctx.destination);
    src.start(t);
  },
  // Jjok: Kuss-Schmatzer
  kiss() {
    if (!ready()) return;
    burst({ dur: 0.05, freq: 3600, q: 3, gain: 0.7 });
    tone({ at: 0.03, dur: 0.12, from: 900, to: 1600, gain: 0.25 });
    tone({ at: 0.18, dur: 0.22, from: 1320, to: 1760, gain: 0.12, type: 'triangle' });
  },
  // Klatschen: zwei kurze, helle Schläge
  clap() {
    if (!ready()) return;
    for (const at of [0, 0.2]) {
      burst({ at, dur: 0.09, freq: 1300, q: 0.8, gain: 1.0 });
      burst({ at: at + 0.008, dur: 0.06, freq: 2600, q: 1.2, gain: 0.6 });
    }
  },
  // Münzen prasseln auf den Tisch, springen und rollen aus: "따르르르릉"
  coins() {
    if (!ready()) return;
    // Zeitpunkte: erst dicht, dann immer lockerer (Münzen hüpfen aus); drei Haufen übereinander
    let t = 0;
    for (let i = 0; i < 34; i++) {
      const f = 2300 + ((i * 7919) % 9) * 380; // Münzen klingen verschieden hoch
      const loud = 0.5 * Math.max(0.25, 1 - i / 40);
      burst({ at: t, dur: 0.012, freq: 6500, q: 0.9, gain: 0.5 * loud * 2, type: 'highpass' }); // Anschlag
      tone({ at: t, dur: 0.16, from: f, gain: loud * 0.35, type: 'triangle' }); // Metallklang
      tone({ at: t, dur: 0.09, from: f * 1.51, gain: loud * 0.22, type: 'sine' }); // Oberton (nicht ganzzahlig)
      t += 0.028 + (i / 34) ** 2 * 0.1;
    }
    // zum Schluss das Nachrollen: ein kleines Wirbeln auf dem Boden
    for (let i = 0; i < 6; i++) tone({ at: t + i * 0.025, dur: 0.1, from: 3200 - i * 150, gain: 0.07 * (1 - i / 7), type: 'triangle' });
  },
  win() {
    if (!ready()) return;
    [523, 659, 784, 1047].forEach((f, i) => tone({ at: i * 0.11, dur: 0.22, from: f, gain: 0.16, type: 'triangle' }));
  },
};
