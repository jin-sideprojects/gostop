// Ein Zug als Szenenfolge, mit "Geister"-Karten in einer eigenen Ebene über dem Spiel:
// 1) gespielte Karte fliegt aus der Hand und knallt auf ihren Partner
// 2) oberste Stapelkarte wird umgedreht und knallt auf ihren Partner
// 3) gewonnene Karten fliegen zum Sammelplatz
import { cardInfo, cardSvg, cardBackSvg } from './cards-svg.js';
import { T } from './i18n.js';
import { fxBomb, fxPoop, fxBroom, fxKiss, fxClap } from './effects.js';

const RATIO = 92 / 60;
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

export function clearGhosts() {
  layer().replaceChildren();
}

function box(r, w = r.width) {
  return { left: r.left, top: r.top, width: w, height: w * RATIO };
}

function ghost(html, r) {
  const el = document.createElement('div');
  el.className = 'ghost';
  Object.assign(el.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  el.innerHTML = html;
  layer().append(el);
  return el;
}

async function move(el, to, { dur = 300, easing = 'cubic-bezier(.55,0,.9,.45)', rotate = 0, scale = 1 } = {}) {
  const from = { left: el.style.left, top: el.style.top, width: el.style.width, height: el.style.height, transform: el.style.transform || 'none' };
  const end = { left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px`, transform: `rotate(${rotate}deg) scale(${scale})` };
  await el.animate([from, end], { duration: dur, easing, fill: 'forwards' }).finished;
  Object.assign(el.style, end);
}

// Aufprall: kurz stauchen, Stapel wackeln, weißer Ring
async function impact(el, stackEl) {
  el.animate([{ transform: 'scale(1.18)' }, { transform: 'scale(0.9)' }, { transform: 'scale(1)' }], { duration: 170, easing: 'ease-out' });
  stackEl?.animate(
    [{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }],
    { duration: 200 },
  );
  const r = el.getBoundingClientRect();
  const ring = document.createElement('div');
  ring.className = 'ring';
  Object.assign(ring.style, { left: `${r.left + r.width / 2}px`, top: `${r.top + r.height / 2}px` });
  layer().append(ring);
  ring.animate([{ transform: 'translate(-50%,-50%) scale(.3)', opacity: 0.95 }, { transform: 'translate(-50%,-50%) scale(1.6)', opacity: 0 }], { duration: 380, easing: 'ease-out' }).finished.then(() => ring.remove());
  document.querySelector('.table')?.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(3px)' }, { transform: 'translateY(0)' }], { duration: 120 });
}

function caption(text, r, tone) {
  const el = document.createElement('div');
  el.className = `caption ${tone}`;
  el.textContent = text;
  // nicht über den Bildschirmrand hinaus
  const half = 70;
  const x = Math.min(Math.max(r.left + r.width / 2, half + 4), window.innerWidth - half - 4);
  Object.assign(el.style, { left: `${x}px`, top: `${Math.max(r.top - 6, 40)}px` });
  layer().append(el);
  el.animate(
    [
      { transform: 'translate(-50%,-100%) scale(.4)', opacity: 0 },
      { transform: 'translate(-50%,-100%) scale(1.15)', opacity: 1, offset: 0.25 },
      { transform: 'translate(-50%,-100%) scale(1)', opacity: 1, offset: 0.8 },
      { transform: 'translate(-50%,-130%) scale(1)', opacity: 0 },
    ],
    { duration: 950, easing: 'ease-out', fill: 'forwards' },
  ).finished.then(() => el.remove());
}

// Breite einer gesammelten Karte (CSS-Variable --cap; die Kartenfelder selbst werden beim Stapeln schmaler)
function capWidth(grp) {
  return parseFloat(getComputedStyle(grp).getPropertyValue('--cap')) || grp.querySelector('.card-svg')?.getBoundingClientRect().width || 28;
}

// Wohin fällt eine Karte dieses Monats auf dem Tisch?
function floorTarget(month, landed) {
  if (landed.has(month)) {
    const r = landed.get(month).getBoundingClientRect();
    return { rect: box({ left: r.left + 12, top: r.top + 6, width: r.width }), stack: null, hit: true };
  }
  const stack = document.querySelector(`.floor .stack[data-month="${month}"]`);
  if (stack) {
    const cards = stack.querySelectorAll('.card');
    const last = cards[cards.length - 1].getBoundingClientRect();
    return { rect: box({ left: last.left + 14, top: last.top + 6, width: last.width }), stack, hit: true };
  }
  // freier Platz: unsichtbaren Platzhalter in das Raster legen und messen
  const floor = document.querySelector('.floor');
  const ph = document.createElement('div');
  ph.className = 'stack placeholder';
  ph.dataset.month = month;
  ph.innerHTML = '<span class="card"></span>';
  floor.append(ph);
  const r = ph.querySelector('.card').getBoundingClientRect();
  return { rect: box(r), stack: ph, hit: false };
}

function centerOfTable() {
  const t = document.querySelector('.floor').getBoundingClientRect();
  return t;
}

export async function playScenes({ events, me, next, sfx }) {
  const played = [];
  for (const e of events) {
    if (e.type === 'played') played.push({ id: e.card, player: e.player });
    if (e.type === 'bomb') for (const id of e.cards) played.push({ id, player: e.player });
  }
  const flipEv = events.find((e) => e.type === 'flipped' && !e.bonus);
  const bonusFlips = events.filter((e) => e.type === 'flipped' && e.bonus);
  const stacked = events.filter((e) => e.type === 'bonusStacked');
  const captures = events.filter((e) => e.type === 'captured');
  const steals = events.filter((e) => e.type === 'steal');
  const bonusUsed = events.filter((e) => e.type === 'bonusUsed');
  if (!played.length && !flipEv && !bonusFlips.length && !captures.length && !bonusUsed.length) return;

  const ghosts = new Map(); // Karten-id → Geister-Element
  const landed = new Map(); // Monat → zuletzt gelandete Geisterkarte
  const special = events.find((e) => ['ppeok', 'ttadak', 'jjok'].includes(e.type));

  // ---------- Szene 0: Bonuskarte aus der Hand ablegen ----------
  for (const ev of bonusUsed) {
    const mine = ev.player === me;
    const el = mine ? document.querySelector(`.hand [data-id="${ev.card}"]`) : [...document.querySelectorAll(`#opp-hand-${ev.player} .card`)].pop();
    if (!el) continue;
    const src = box(el.getBoundingClientRect());
    el.style.visibility = 'hidden';
    const g = ghost(cardSvg(ev.card), src);
    const fl = centerOfTable();
    const bw = Math.min(src.width * 1.3, 90);
    const big = { left: fl.left + fl.width / 2 - bw / 2, top: fl.top + 4, width: bw, height: bw * RATIO };
    await move(g, big, { dur: 300, easing: 'cubic-bezier(.2,.8,.3,1)' });
    sfx.slap();
    await impact(g, null);
    caption(T.events.bonus(cardInfo(ev.card).piValue), big, 'good');
    await wait(520);
    const grp = document.querySelector(`[data-cap="${mine ? 'mine' : `o${ev.player}`}-pi"] .group-cards`);
    if (grp) {
      const r = grp.getBoundingClientRect();
      const w = capWidth(grp);
      await move(g, box({ left: r.right - w, top: r.top + 2, width: w }), { dur: 380, easing: 'cubic-bezier(.3,.7,.3,1)' });
    }
    g.style.opacity = '0';
  }

  // ---------- Szene 1: Karte ausspielen ----------
  for (const [i, { id, player }] of played.entries()) {
    const mine = player === me;
    let src;
    if (mine) {
      const el = document.querySelector(`.hand [data-id="${id}"]`);
      src = el ? box(el.getBoundingClientRect()) : null;
      if (el) el.style.visibility = 'hidden';
    } else {
      const backs = document.querySelectorAll(`#opp-hand-${player} .card`);
      const b = backs[backs.length - 1];
      src = b ? box(b.getBoundingClientRect()) : null;
      if (b) b.style.visibility = 'hidden';
    }
    const month = cardInfo(id).month;
    const target = floorTarget(month, landed);
    src ??= box({ left: target.rect.left, top: target.rect.top - 80, width: target.rect.width });
    const g = ghost(cardSvg(id), src);
    ghosts.set(id, g);
    // anheben
    await move(g, { left: src.left - 4, top: src.top - (mine ? 26 : -26), width: src.width + 8, height: (src.width + 8) * RATIO }, { dur: 150, easing: 'ease-out', scale: 1.05 });
    // auf den Partner knallen
    await move(g, target.rect, { dur: 280, rotate: i % 2 ? 4 : -4 });
    sfx.slap();
    await impact(g, target.stack);
    landed.set(month, g);
    if (i === played.length - 1) caption(target.hit ? T.fx.hit : T.fx.none, target.rect, target.hit ? 'good' : 'plain');
    await wait(played.length > 1 ? 140 : 420);
  }

  // Bombe: Explosion auf dem Stapel
  const bombEv = events.find((e) => e.type === 'bomb');
  if (bombEv && landed.has(bombEv.month)) {
    sfx.boom();
    await fxBomb(landed.get(bombEv.month).getBoundingClientRect());
    caption(T.fxBomb, box(landed.get(bombEv.month).getBoundingClientRect()), 'good');
    await wait(250);
  }

  // ---------- Szene 2a: Bonuskarten vom Stapel ----------
  for (const [i, ev] of bonusFlips.entries()) {
    const pileEl = document.getElementById('pile');
    const pr = pileEl ? box(pileEl.getBoundingClientRect()) : box(centerOfTable());
    const g = ghost(cardBackSvg(), pr);
    ghosts.set(ev.card, g);
    const fl = centerOfTable();
    const bw = Math.min(pr.width * 1.6, 96);
    const big = { left: fl.left + fl.width / 2 - bw / 2, top: fl.top + 4, width: bw, height: bw * RATIO };
    await move(g, big, { dur: 240, easing: 'cubic-bezier(.2,.8,.3,1)' });
    await g.animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(90deg)' }], { duration: 110, fill: 'forwards' }).finished;
    g.innerHTML = cardSvg(ev.card);
    await g.animate([{ transform: 'rotateY(90deg)' }, { transform: 'rotateY(0deg)' }], { duration: 130, fill: 'forwards' }).finished;
    sfx.match();
    caption(T.events.bonus(cardInfo(ev.card).piValue), big, 'good');
    await wait(560);
    // zur Seite legen, bis klar ist, wohin sie gehört
    await move(g, box({ left: pr.left - pr.width * 0.7 - i * 8, top: pr.top + 10, width: pr.width * 0.7 }), { dur: 220, easing: 'ease-out' });
  }

  // ---------- Szene 2: Stapelkarte umdrehen ----------
  if (flipEv) {
    const id = flipEv.card;
    const pileEl = document.getElementById('pile');
    const pr = pileEl ? box(pileEl.getBoundingClientRect()) : box(centerOfTable());
    const cnt = document.getElementById('pile-count');
    if (cnt) cnt.textContent = T.cardsLeft(Math.max(0, (next.pileCount ?? 0)));
    const g = ghost(cardBackSvg(), pr);
    ghosts.set(id, g);
    // in die Tischmitte fliegen und dort groß umdrehen
    const fl = centerOfTable();
    const bw = Math.min(pr.width * 1.6, 96);
    const big = { left: fl.left + fl.width / 2 - bw / 2, top: fl.top + Math.max(0, fl.height / 2 - (bw * RATIO) / 2), width: bw, height: bw * RATIO };
    await move(g, big, { dur: 260, easing: 'cubic-bezier(.2,.8,.3,1)' });
    await g.animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(90deg)' }], { duration: 110, fill: 'forwards' }).finished;
    g.innerHTML = cardSvg(id);
    await g.animate([{ transform: 'rotateY(90deg)' }, { transform: 'rotateY(0deg)' }], { duration: 130, fill: 'forwards' }).finished;
    caption(T.fx.flip, big, 'plain');
    await wait(380);
    const month = cardInfo(id).month;
    const target = floorTarget(month, landed);
    await move(g, target.rect, { dur: 260, rotate: 3 });
    const matched = target.hit;
    if (matched) sfx.match();
    else sfx.miss();
    await impact(g, target.stack);
    landed.set(month, g);
    const specialText = special ? T.events[special.type].split('!')[0] + '!' : null;
    caption(specialText ?? (matched ? T.fx.match : T.fx.none), target.rect, matched || special ? 'good' : 'plain');
    // Ppeok: Häufchen auf den Stapel, Jjok: Kussmund
    if (special?.type === 'ppeok') {
      sfx.plop();
      await fxPoop(g.getBoundingClientRect());
    } else if (special?.type === 'jjok') {
      sfx.kiss();
      await fxKiss(g.getBoundingClientRect());
    } else if (special?.type === 'ttadak') {
      setTimeout(() => sfx.clap(), 230); // Ton genau beim Zusammenschlagen
      await fxClap(g.getBoundingClientRect());
    } else {
      await wait(520);
    }
  }

  // Bonus im Ppeok-Turn bleibt beim Ppeok-Stapel
  for (const ev of stacked) {
    for (const id of ev.cards) {
      const g = ghosts.get(id);
      const lg = landed.get(ev.month);
      if (!g || !lg) continue;
      const r = lg.getBoundingClientRect();
      await move(g, box({ left: r.left + 10, top: r.top + 8, width: r.width }), { dur: 260 });
    }
  }

  // ---------- Szene 3: Karten einsammeln ----------
  const flights = [];
  const counter = new Map(); // Sammelgruppe → schon gelandete Anzahl
  const groupTarget = (owner, id) => {
    const info = cardInfo(id);
    const side = owner === me ? 'mine' : `o${owner}`;
    const gj = owner === me ? next.gukjinAs.mine : next.others.find((o) => o.seat === owner)?.gukjinAs;
    const asPi = info.gukjin && gj === 'pi';
    const key = `${side}-${asPi ? 'pi' : info.kind}`;
    const grp = document.querySelector(`[data-cap="${key}"] .group-cards`);
    if (!grp) return null;
    const r = grp.getBoundingClientRect();
    const existing = grp.querySelectorAll('.card').length;
    const n = (counter.get(key) ?? existing) + 0;
    counter.set(key, n + 1);
    const w = capWidth(grp);
    return box({ left: Math.min(r.left + n * w * 0.8, r.right - w), top: r.top + 2, width: w });
  };
  const sourceFor = (id) => {
    if (ghosts.has(id)) return ghosts.get(id);
    const el = document.querySelector(`.floor [data-id="${id}"], .inflight [data-id="${id}"], .captured [data-id="${id}"]`);
    if (!el) return null;
    const g = ghost(cardSvg(id), box(el.getBoundingClientRect()));
    el.style.visibility = 'hidden';
    return g;
  };
  // Abräumen: Besen fegt über den Tisch, während die Karten wegfliegen
  let broom = null;
  if (events.some((e) => e.type === 'sweep')) {
    sfx.swoosh();
    broom = fxBroom(document.querySelector('.floor').getBoundingClientRect());
    await wait(250);
  }
  let k = 0;
  for (const ev of [...captures, ...steals]) {
    for (const id of ev.cards) {
      const g = sourceFor(id);
      const to = groupTarget(ev.player, id);
      if (!g || !to) continue;
      const delay = k++ * 70;
      flights.push(wait(delay).then(() => move(g, to, { dur: 420, easing: 'cubic-bezier(.3,.7,.3,1)' })));
    }
  }
  if (flights.length) {
    await Promise.all(flights);
    await wait(120);
  }
  if (broom) await broom;
}
