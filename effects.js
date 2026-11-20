// Effekte für besondere Züge: Bombe, Schütteln, Ppeok (Häufchen), Abräumen (Besen), Jjok (Kuss).
// Alles eigene SVG-Zeichnungen in der Effekt-Ebene über dem Spiel.

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function layer() {
  let fx = document.getElementById('fx');
  if (!fx) {
    fx = document.createElement('div');
    fx.id = 'fx';
    document.body.append(fx);
  }
  return fx;
}

function place(html, cx, cy, size, cls = '') {
  const el = document.createElement('div');
  el.className = `fx-item ${cls}`;
  Object.assign(el.style, { left: `${cx - size / 2}px`, top: `${cy - size / 2}px`, width: `${size}px`, height: `${size}px` });
  el.innerHTML = html;
  layer().append(el);
  return el;
}

const center = (r) => [r.left + r.width / 2, r.top + r.height / 2];

// ---------- Bildschirm wackeln ----------
export function shakeScreen(strength = 8, duration = 450) {
  const target = document.getElementById('app');
  if (!target) return Promise.resolve();
  const k = [];
  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    const f = (1 - i / steps) * strength;
    const x = i === steps ? 0 : (i % 2 ? -1 : 1) * f;
    const y = i === steps ? 0 : (i % 3 === 0 ? 1 : -1) * f * 0.5;
    const rot = i === steps ? 0 : (i % 2 ? -1 : 1) * f * 0.12;
    k.push({ transform: `translate(${x}px, ${y}px) rotate(${rot}deg)` });
  }
  return target.animate(k, { duration, easing: 'linear' }).finished;
}

// ---------- Bombe: Blitz, Feuerball, Funken ----------
const BLAST = `<svg viewBox="-50 -50 100 100"><path d="${star(16, 48, 26)}" fill="#ffb21e"/><path d="${star(14, 34, 18, 0.2)}" fill="#ff5a1f"/><circle r="14" fill="#fff6c0"/><text y="6" text-anchor="middle" font-size="16" font-weight="900" fill="#c8202b" font-family="Georgia, serif">BUMM</text></svg>`;

function star(points, outer, inner, rot = 0) {
  const p = [];
  for (let i = 0; i < points * 2; i++) {
    const a = (i * Math.PI) / points + rot;
    const r = i % 2 ? inner : outer;
    p.push(`${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}`);
  }
  return `M${p.join(' L')}Z`;
}

export async function fxBomb(rect) {
  const [cx, cy] = center(rect);
  const flash = document.createElement('div');
  flash.className = 'fx-flash';
  layer().append(flash);
  flash.animate([{ opacity: 0.95 }, { opacity: 0 }], { duration: 380, easing: 'ease-out' }).finished.then(() => flash.remove());
  const blast = place(BLAST, cx, cy, 190);
  blast.animate(
    [
      { transform: 'scale(.15) rotate(0deg)', opacity: 1 },
      { transform: 'scale(1.15) rotate(12deg)', opacity: 1, offset: 0.35 },
      { transform: 'scale(1.3) rotate(18deg)', opacity: 0 },
    ],
    { duration: 820, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' },
  ).finished.then(() => blast.remove());
  // Funken fliegen nach außen
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + Math.random() * 0.3;
    const d = 90 + Math.random() * 70;
    const col = ['#ffd23a', '#ff8a1f', '#c8202b', '#fff'][i % 4];
    const s = place(`<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="${col}"/></svg>`, cx, cy, 9 + Math.random() * 7);
    s.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d + 30}px)`, opacity: 0 }], {
      duration: 700 + Math.random() * 250,
      easing: 'cubic-bezier(.1,.7,.4,1)',
      fill: 'forwards',
    }).finished.then(() => s.remove());
  }
  await shakeScreen(14, 560);
}

// ---------- Ppeok: ein Häufchen fällt auf den Stapel ----------
const POOP = `<svg viewBox="0 0 100 100">
<g class="stink" fill="none" stroke="#7a8a3a" stroke-width="3" stroke-linecap="round" opacity=".8">
<path d="M30 22 q-6 -8 0 -16 q6 -8 0 -16"/><path d="M50 16 q-6 -8 0 -16"/><path d="M70 22 q-6 -8 0 -16 q6 -8 0 -16"/></g>
<ellipse cx="50" cy="86" rx="40" ry="11" fill="#6b3d1e"/>
<ellipse cx="50" cy="80" rx="36" ry="12" fill="#8a5528"/>
<ellipse cx="50" cy="64" rx="28" ry="11" fill="#9a6230"/>
<ellipse cx="50" cy="49" rx="19" ry="9" fill="#a86c36"/>
<path d="M44 42 Q50 26 60 30 Q54 34 56 42Z" fill="#a86c36"/>
<path d="M30 76 q10 4 20 0 M42 60 q8 3 16 0" stroke="#6b3d1e" stroke-width="2" fill="none"/>
<circle cx="41" cy="64" r="5" fill="#fff"/><circle cx="59" cy="64" r="5" fill="#fff"/>
<circle cx="42" cy="65" r="2.4" fill="#1d1a17"/><circle cx="60" cy="65" r="2.4" fill="#1d1a17"/>
<path d="M42 74 Q50 80 58 74" stroke="#1d1a17" stroke-width="2.2" fill="none" stroke-linecap="round"/>
</svg>`;

export async function fxPoop(rect) {
  const [cx, cy] = center(rect);
  const size = Math.max(100, rect.width * 1.7);
  const el = place(POOP, cx, cy - size * 0.2, size, 'poop');
  await el.animate(
    [
      { transform: `translateY(${-window.innerHeight * 0.45}px) scale(.8)`, opacity: 1 },
      { transform: 'translateY(0) scale(1.15, .7)', offset: 0.55 },
      { transform: 'translateY(-14px) scale(.92, 1.1)', offset: 0.75 },
      { transform: 'translateY(0) scale(1)', opacity: 1 },
    ],
    { duration: 720, easing: 'ease-in', fill: 'forwards' },
  ).finished;
  el.querySelector('.stink')?.animate([{ transform: 'translateY(4px)', opacity: 0.3 }, { transform: 'translateY(-6px)', opacity: 0.9 }], {
    duration: 500,
    iterations: 2,
    direction: 'alternate',
  });
  await wait(700);
  el.animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(.6)' }], { duration: 300, fill: 'forwards' }).finished.then(() => el.remove());
}

// ---------- Abräumen: ein Besen fegt über den Tisch ----------
const BROOM = `<svg viewBox="0 0 120 120">
<rect x="56" y="-6" width="8" height="80" rx="3" fill="#8b5a2b" transform="rotate(30 60 60)"/>
<g transform="rotate(30 60 60)">
<rect x="46" y="70" width="28" height="9" rx="2" fill="#c0392b"/>
<path d="M44 78 L76 78 L90 118 L30 118 Z" fill="#e8c25a"/>
<path d="M50 80 L42 116 M58 80 L56 117 M66 80 L70 117 M72 80 L82 116" stroke="#b8902e" stroke-width="2"/>
</g></svg>`;

export async function fxBroom(rect) {
  const size = Math.max(110, rect.height * 0.9);
  const y = rect.top + rect.height / 2;
  const el = place(BROOM, rect.right + size / 2, y, size, 'broom');
  const dx = -(rect.width + size);
  const anim = el.animate(
    [
      { transform: 'translateX(0) rotate(0deg)' },
      { transform: `translateX(${dx * 0.25}px) rotate(-14deg)`, offset: 0.25 },
      { transform: `translateX(${dx * 0.5}px) rotate(8deg)`, offset: 0.5 },
      { transform: `translateX(${dx * 0.75}px) rotate(-14deg)`, offset: 0.75 },
      { transform: `translateX(${dx}px) rotate(6deg)` },
    ],
    { duration: 950, easing: 'ease-in-out', fill: 'forwards' },
  );
  // Staubwölkchen hinter dem Besen
  for (let i = 0; i < 8; i++) {
    setTimeout(() => {
      const x = rect.right - (rect.width * i) / 8;
      const d = place(`<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="10" fill="#e9e2cf"/></svg>`, x, y + size * 0.3, 18 + Math.random() * 10);
      d.animate([{ transform: 'scale(.4)', opacity: 0.8 }, { transform: `translate(${-10 - Math.random() * 20}px, ${-20 - Math.random() * 20}px) scale(1.4)`, opacity: 0 }], {
        duration: 600,
        fill: 'forwards',
      }).finished.then(() => d.remove());
    }, i * 110);
  }
  await anim.finished;
  el.remove();
}

// ---------- Jjok: ein Kussmund ----------
const LIPS = `<svg viewBox="0 0 120 80">
<path d="M8 38 Q30 4 60 26 Q90 4 112 38 Q90 40 60 42 Q30 40 8 38Z" fill="#e0213a"/>
<path d="M8 40 Q30 44 60 44 Q90 44 112 40 Q90 76 60 74 Q30 76 8 40Z" fill="#c8102e"/>
<path d="M14 40 Q60 48 106 40" stroke="#7a0a18" stroke-width="3" fill="none" stroke-linecap="round"/>
<path d="M36 20 Q46 14 54 22" stroke="#ff8a9a" stroke-width="4" fill="none" stroke-linecap="round"/>
<path d="M40 58 Q52 64 64 60" stroke="#ff6a7c" stroke-width="4" fill="none" stroke-linecap="round"/>
</svg>`;
const HEART = `<svg viewBox="0 0 20 18"><path d="M10 17 C-6 6 4 -4 10 4 C16 -4 26 6 10 17Z" fill="#ff3b6b"/></svg>`;

export async function fxKiss(rect) {
  const [cx, cy] = center(rect);
  const size = Math.max(110, rect.width * 1.7);
  const el = place(LIPS, cx, cy, size, 'lips');
  await el.animate(
    [
      { transform: 'scale(.2) rotate(-12deg)', opacity: 0 },
      { transform: 'scale(1.1) rotate(4deg)', opacity: 1, offset: 0.45 },
      { transform: 'scale(.82, .7) rotate(0deg)', opacity: 1, offset: 0.7 },
      { transform: 'scale(1.05) rotate(0deg)', opacity: 1 },
    ],
    { duration: 620, easing: 'ease-out', fill: 'forwards' },
  ).finished;
  for (let i = 0; i < 6; i++) {
    const h = place(HEART, cx + (i - 2.5) * 18, cy - 10, 18 + (i % 3) * 6);
    h.animate([{ transform: 'translateY(0) scale(.5)', opacity: 1 }, { transform: `translate(${(i - 2.5) * 10}px, -90px) scale(1.2)`, opacity: 0 }], {
      duration: 900 + i * 60,
      easing: 'ease-out',
      fill: 'forwards',
    }).finished.then(() => h.remove());
  }
  await wait(420);
  el.animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(1.3)' }], { duration: 320, fill: 'forwards' }).finished.then(() => el.remove());
}

// ---------- Ttadak: zwei Hände klatschen "짝짝" ----------
const HAND = (flip) => `<svg viewBox="0 0 60 90"><g transform="${flip ? 'translate(60 0) scale(-1 1)' : ''}">
<path d="M18 88 L18 50 Q10 44 10 34 L10 20 Q10 14 15 14 Q19 14 19 20 L19 32 L20 8 Q20 2 25 2 Q30 2 30 8 L30 30 L31 6 Q31 0 36 0 Q41 0 41 6 L41 30 L42 10 Q42 4 47 4 Q52 4 52 10 L52 50 Q52 62 44 70 L44 88 Z" fill="#f2c9a0" stroke="#b07a52" stroke-width="2" stroke-linejoin="round"/>
<path d="M14 40 Q4 34 6 26 Q10 22 16 30" fill="#f2c9a0" stroke="#b07a52" stroke-width="2"/>
<rect x="16" y="78" width="30" height="12" fill="#3d6a4b"/></g></svg>`;

export async function fxClap(rect) {
  const [cx, cy] = center(rect);
  const size = Math.max(90, rect.width * 1.5);
  const left = place(HAND(false), cx - size * 0.45, cy, size);
  const right = place(HAND(true), cx + size * 0.45, cy, size);
  const lines = place(
    `<svg viewBox="-50 -50 100 100"><g stroke="#ffe066" stroke-width="5" stroke-linecap="round">${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => { const a = (i * Math.PI) / 4; return `<line x1="${(Math.cos(a) * 26).toFixed(1)}" y1="${(Math.sin(a) * 26).toFixed(1)}" x2="${(Math.cos(a) * 44).toFixed(1)}" y2="${(Math.sin(a) * 44).toFixed(1)}"/>`; }).join('')}</g><text y="8" text-anchor="middle" font-size="22" font-weight="900" fill="#fff" stroke="#c8202b" stroke-width="1" font-family="Georgia, serif">짝!</text></svg>`,
    cx,
    cy - size * 0.55,
    size * 0.9,
  );
  lines.style.opacity = '0';
  const clapOnce = async () => {
    const opts = { duration: 200, easing: 'cubic-bezier(.6,0,.4,1)' };
    const l = left.animate([{ transform: 'translateX(0) rotate(-14deg)' }, { transform: `translateX(${size * 0.32}px) rotate(4deg)` }, { transform: 'translateX(0) rotate(-14deg)' }], opts);
    right.animate([{ transform: 'translateX(0) rotate(14deg)' }, { transform: `translateX(${-size * 0.32}px) rotate(-4deg)` }, { transform: 'translateX(0) rotate(14deg)' }], opts);
    setTimeout(() => {
      lines.animate([{ opacity: 1, transform: 'scale(.6)' }, { opacity: 0, transform: 'scale(1.3)' }], { duration: 260, easing: 'ease-out' });
    }, 95);
    await l.finished;
  };
  for (const el of [left, right]) el.animate([{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 140 });
  await wait(140);
  await clapOnce();
  await clapOnce();
  await wait(150);
  for (const el of [left, right, lines]) el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' }).finished.then(() => el.remove());
}
