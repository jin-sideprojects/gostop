import { T } from './i18n.de.js';
import { CONFIG } from './config.js';
import { wsTransport, HostSession, guestTransport, newCode } from './net.js';
import { cardInfo, cardSvg, cardBackSvg, cardLabel } from './cards-svg.js';
import { describeTurn, prospects } from './commentary.js';
import { sfx, unlock, setEnabled, audioState } from './sound.js';
import { playScenes, clearGhosts } from './scenes.js';
import { shakeScreen } from './effects.js';
import { sayGo, sayStop, setVoiceEnabled, unlockVoice } from './voice.js';
window.__matgoAudio = audioState;

const app = document.getElementById('app');
const scoreLine = document.getElementById('score-line');
const toasts = document.getElementById('toasts');
const hintsBox = document.getElementById('hints');
const soundBox = document.getElementById('sound');

// ---------- kleine Helfer ----------
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* privat-Modus */ } },
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Namen der Plätze: Du / Computer / Mitspieler (mit Nummer, wenn es zwei gleiche gibt)
function nameOf(seat) {
  if (!view) return T.opponent;
  if (seat === view.seat) return T.you;
  const n = view.seats?.length ?? 2;
  const others = Array.from({ length: n - 1 }, (_, i) => (view.seat + 1 + i) % n);
  const kind = (s) => (view.seats?.[s] === 'bot' ? T.computer : T.mate);
  const same = others.filter((o) => kind(o) === kind(seat));
  return same.length > 1 ? `${kind(seat)} ${same.indexOf(seat) + 1}` : kind(seat);
}

let transport = null; // aktuelle Verbindung zum Spielraum
// Tablet-App: wer bin ich? { role: 'host'|'guest', code } – im PC-Server-Modus null
let session = CONFIG.mode === 'app' ? JSON.parse(store.get('matgo-session') || 'null') : null;
let host = null; // HostSession, wenn dieses Tablet Gastgeber ist
let peerStatus = 'connecting';
let lobbyError = '';
const tokenKey = () => (session ? `matgo-token-${session.role}-${session.code}` : 'matgo-token');
let status = 'connecting'; // connecting | open | reconnecting | full | replaced | reset
let view = null; // RoomView
let legal = [];
let retry = null;
let busy = false; // während einer Animation keine Eingaben
let report = []; // Sätze zum letzten Zug

let hints = store.get('matgo-hints') !== 'off';
hintsBox.checked = hints;
hintsBox.addEventListener('change', () => {
  hints = hintsBox.checked;
  store.set('matgo-hints', hints ? 'on' : 'off');
  render();
});

let soundOn = store.get('matgo-sound') !== 'off';
soundBox.checked = soundOn;
setEnabled(soundOn);
setVoiceEnabled(soundOn);
soundBox.addEventListener('change', () => {
  soundOn = soundBox.checked;
  store.set('matgo-sound', soundOn ? 'on' : 'off');
  setEnabled(soundOn);
  setVoiceEnabled(soundOn);
  unlock();
  if (soundOn) setTimeout(() => sfx.slap(), 60); // Probeton
});
// Ton erst nach einer echten Berührung möglich: beim Loslassen, nicht beim Aufsetzen
for (const ev of ['click', 'touchend', 'pointerup', 'keydown']) {
  document.addEventListener(ev, unlock, { passive: true, capture: true });
  document.addEventListener(ev, unlockVoice, { passive: true, capture: true });
}

// ---------- Verbindung ----------
async function connect() {
  if (transport && (transport.isOpen() || transport.isConnecting())) return;
  clearTimeout(retry);
  const previous = transport;
  if (CONFIG.mode === 'app') {
    if (!session) {
      status = 'lobby';
      return render();
    }
    if (session.role === 'host') {
      if (!host) {
        const saved = JSON.parse(store.get(`matgo-room-${session.code}`) || 'null');
        host = await HostSession.create({
          code: session.code,
          saved,
          onSave: (data) => store.set(`matgo-room-${session.code}`, JSON.stringify(data)),
          onPeerStatus: (st) => {
            peerStatus = st;
            render();
          },
        });
      }
      transport = host.localTransport();
    } else {
      transport = guestTransport(session.code, (why) => {
        if (why === 'noHost' && !view) {
          lobbyError = T.noHost(session.code);
          leaveSession();
        }
      });
    }
  } else {
    transport = wsTransport();
  }
  const t = transport;
  if (previous && previous !== t) previous.close(); // alte Verbindung nicht weiterlaufen lassen
  t.open({
    onopen: () => t.send({ t: 'hello', token: store.get(tokenKey()) }),
    onmessage: (m) => {
      if (t !== transport) return; // Nachrichten alter Verbindungen ignorieren
      clearTimeout(watchdog);
      enqueue(m);
    },
    onclose: () => {
      if (t !== transport) return;
      if (['full', 'replaced', 'reset', 'lobby'].includes(status)) return render();
      status = 'reconnecting';
      render();
      retry = setTimeout(connect, 2000);
    },
  });
}

// Tablet-App: Sitzung beginnen / verlassen
function startSession(s) {
  session = s;
  store.set('matgo-session', JSON.stringify(s));
  status = 'connecting';
  view = null;
  lobbyError = '';
  render();
  connect();
}

function leaveSession() {
  clearTimeout(retry);
  const t = transport;
  transport = null;
  t?.close();
  if (host) {
    host.close();
    store.set(`matgo-room-${host.code}`, '');
    host = null;
  }
  session = null;
  store.set('matgo-session', 'null');
  view = null;
  status = 'lobby';
  render();
}

// Bildschirm wieder an: Verbindung prüfen. Eine Verbindung kann "offen" aussehen, aber tot sein.
let watchdog = null;
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || ['full', 'replaced', 'reset', 'lobby'].includes(status)) return;
  if (transport?.isOpen()) {
    transport.send({ t: 'hello', token: store.get(tokenKey()) });
    if (session?.role === 'host') return; // eigener Raum im selben Gerät
    clearTimeout(watchdog);
    const t = transport;
    watchdog = setTimeout(() => t.close(), 3000); // keine Antwort → neu verbinden
  } else {
    connect();
  }
});

function send(msg) {
  if (transport?.isOpen()) transport.send(msg);
}

// Nachrichten nacheinander abarbeiten, damit Animationen nicht durcheinander geraten
let chain = Promise.resolve();
function enqueue(msg) {
  chain = chain.then(() => onMessage(msg)).catch((err) => console.error(err));
}

async function onMessage(msg) {
  switch (msg.t) {
    case 'welcome':
      store.set(tokenKey(), msg.token);
      status = 'open';
      break;
    case 'state': {
      status = 'open';
      const prev = view;
      const events = msg.events ?? [];
      let animated = false;
      if (prev?.game && msg.view.game && msg.view.round === prev.round && events.length) {
        busy = true;
        document.body.classList.add('scene');
        try {
          await playScenes({ events, me: prev.game.you, next: msg.view.game, sfx });
          animated = true;
        } finally {
          busy = false;
          document.body.classList.remove('scene');
        }
      }
      view = msg.view;
      legal = view.game ? view.game.legal : [];
      if (view.game) {
        const lines = describeTurn(events, view.game.you, nameOf);
        if (lines.length) report = lines;
        if (events.some((e) => e.type === 'newRound')) report = [];
      }
      render();
      if (animated) clearGhosts();
      showEvents(events);
      return;
    }
    case 'full':
      status = 'full';
      break;
    case 'replaced':
      status = 'replaced';
      break;
    case 'reset':
      status = 'reset';
      store.set(tokenKey(), '');
      view = null;
      break;
    case 'error':
      toast(T.errors[msg.code] ?? T.errors.ILLEGAL);
      break;
  }
  render();
}

// ---------- Ereignisse als kurze Meldungen ----------
function toast(text, html = '') {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `${esc(text)}${html}`;
  toasts.append(el);
  setTimeout(() => el.remove(), html ? 2600 : 1600);
}

function showEvents(events) {
  if (!view?.game) return;
  const me = view.game.you;
  for (const e of events) {
    const who = nameOf(e.player);
    const msg = T.events[e.type];
    if (e.type === 'roundEnd' && e.result?.kind === 'win' && e.result.winner === me) setTimeout(() => sfx.win(), 900);
    // Ansage: Go (freche Frauenstimme) / Stopp (kühle Männerstimme)
    if (e.type === 'go') sayGo(e.count);
    if (e.type === 'stop') sayStop();
    if (!msg) continue;
    if (e.type !== 'go' && e.type !== 'stop') sfx.special(); // Go/Stopp haben ihre Stimme
    if (e.type === 'shaken') {
      sfx.rattle();
      shakeScreen(10, 700);
      revealShake(e);
    } else if (e.type === 'bomb') toast(`${who}: ${msg(e.month)}`);
    else if (e.type === 'go') toast(`${who}: ${msg(e.count)}`);
    else toast(`${who}: ${msg}`);
  }
}

// Schütteln: bei allen groß in der Mitte zeigen, welcher Monat es ist
function revealShake(e) {
  const mine = e.player === view?.game?.you;
  const el = document.createElement('div');
  el.className = 'shake-reveal';
  el.innerHTML = `<div class="sheet">
    <h2>${esc(mine ? T.shakeTitleMine : T.shakeTitleOf(nameOf(e.player)))}</h2>
    <div class="shake-month"><span class="num">${e.month}</span><span class="lbl">${esc(T.shakeMonth(e.month))}</span></div>
    <div class="reveal shaking">${e.cards.map((id) => `<span class="card">${cardSvg(id)}</span>`).join('')}</div>
    <p>${esc(mine ? T.shakeTextMine : T.shakeText(e.month))}</p></div>`;
  document.body.append(el);
  el.animate([{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'scale(1.05)', offset: 0.7 }, { opacity: 1, transform: 'scale(1)' }], { duration: 300, easing: 'ease-out' });
  setTimeout(() => el.remove(), 2800);
  el.addEventListener('click', () => el.remove());
}

// ---------- Aktionen ----------
const legalIndex = (pred) => legal.findIndex(pred);
app.addEventListener('click', (e) => {
  const el = e.target.closest('[data-legal],[data-cmd]');
  if (!el || el.disabled || busy) return;
  if (el.dataset.cmd === 'next') return send({ t: 'nextRound' });
  if (el.dataset.cmd === 'solo') return send({ t: 'solo' });
  if (el.dataset.cmd === 'host') return startSession({ role: 'host', code: newCode() });
  if (el.dataset.cmd === 'join') {
    const code = (document.getElementById('join-code')?.value || '').replace(/\D/g, '');
    if (code.length !== 4) {
      lobbyError = T.codeNeeded;
      return render();
    }
    return startSession({ role: 'guest', code });
  }
  if (el.dataset.cmd === 'leave') {
    if (el.dataset.armed) return leaveSession();
    el.dataset.armed = '1';
    el.textContent = T.leaveConfirm;
    setTimeout(() => {
      delete el.dataset.armed;
      el.textContent = T.leave;
    }, 3000);
    return;
  }
  if (el.dataset.cmd === 'reopen') {
    status = 'connecting';
    view = null;
    return connect();
  }
  const action = legal[Number(el.dataset.legal)];
  if (!action) return;
  if (action.type === 'play' || action.type === 'useBonus') el.classList.add('picked'); // sofortiges Anheben beim Antippen
  send({ t: 'action', action });
});

// Bonus-Option (Kontrollkästchen im Warte- und Ergebnisfenster)
app.addEventListener('change', (e) => {
  if (e.target.matches('[data-opt="players"]')) {
    send({ t: 'options', players: Number(e.target.value) });
    return;
  }
  if (e.target.matches('[data-opt="bonus"]')) {
    send({ t: 'options', bonus: e.target.checked });
    if (view?.phase === 'playing') toast(T.optionNextRound);
  }
});

// ---------- Darstellung ----------
function card(id, { idx = -1, cls = '' } = {}) {
  if (idx >= 0) return `<button class="card ${cls}" data-id="${id}" data-legal="${idx}" aria-label="${esc(cardLabel(id))}">${cardSvg(id)}</button>`;
  return `<span class="card ${cls}" data-id="${id}">${cardSvg(id)}</span>`;
}
const back = () => `<span class="card">${cardBackSvg()}</span>`;

function groupsOf(ids, gukjinAs) {
  const g = { gwang: [], yeol: [], tti: [], pi: [] };
  for (const id of ids) {
    const c = cardInfo(id);
    if (c.gukjin && gukjinAs === 'pi') g.pi.push(id);
    else g[c.kind].push(id);
  }
  return g;
}

function capturedHtml(side, ids, gukjinAs, score) {
  const g = groupsOf(ids, gukjinAs);
  const counts = { gwang: g.gwang.length, yeol: g.yeol.length, tti: g.tti.length, pi: score.counts.pi };
  return `<div class="captured">${Object.keys(g)
    .map(
      (k) => `<div class="group" data-cap="${side}-${k}"><div class="group-head"><span>${T.groups[k]}</span><b>${counts[k]}</b></div>
      <div class="group-cards">${g[k].map((id) => card(id)).join('')}</div></div>`,
    )
    .join('')}</div>`;
}

function floorHtml(g) {
  const byMonth = new Map();
  for (const id of g.floor) {
    const m = cardInfo(id).month;
    if (!byMonth.has(m)) byMonth.set(m, []);
    byMonth.get(m).push(id);
  }
  const stacks = [...byMonth.entries()]
    .map(([m, ids]) => {
      const badge = g.ppeokMonths.includes(m) ? `<span class="badge">Ppeok</span>` : '';
      const extra = g.ppeokBonus?.[m] ?? [];
      return `<div class="stack" data-month="${m}" aria-label="${esc(T.month(m))}">${badge}${[...ids, ...extra].map((id) => card(id)).join('')}</div>`;
    })
    .join('');
  return `<div class="floor">${stacks}</div>`;
}

function lobbyHtml() {
  return `<div class="center-msg lobby">
    <h1>${T.title}</h1><p>${T.lobbySub}</p>
    <button class="btn primary big" data-cmd="host">${T.startGame}</button>
    <p class="hint">${T.startGameHelp}</p>
    <div class="join-row"><input id="join-code" inputmode="numeric" pattern="[0-9]*" maxlength="4" placeholder="${T.codePlaceholder}" aria-label="${T.codePlaceholder}">
      <button class="btn big" data-cmd="join">${T.joinGame}</button></div>
    <p class="hint">${T.joinHelp}</p>
    ${lobbyError ? `<p class="error">${esc(lobbyError)}</p>` : ''}
  </div>`;
}

function hostCodeHtml() {
  if (session?.role !== 'host') return '';
  const st = peerStatus === 'online' ? T.codeOnline : peerStatus === 'taken' ? T.codeTaken : peerStatus === 'offline' ? T.codeOffline : T.codeConnecting;
  return `<div class="host-code"><span>${T.codeLabel}</span><b>${session.code}</b><small>${esc(st)}</small></div>`;
}

function render() {
  document.getElementById('leave-btn')?.toggleAttribute('hidden', !(CONFIG.mode === 'app' && session));
  if (status === 'lobby') {
    scoreLine.textContent = '';
    app.innerHTML = lobbyHtml();
    return;
  }
  renderScoreLine();
  if (status === 'full') return center(T.full, T.fullHelp);
  if (status === 'replaced') return center(T.replaced, T.replacedHelp, `<button class="btn primary" data-cmd="reopen">${T.reopen}</button>`);
  if (status === 'reset') return center(T.resetByHost, '', `<button class="btn primary" data-cmd="reopen">${T.reopen}</button>`);
  if (!view) return center(status === 'reconnecting' ? T.reconnecting : T.connecting, '');
  if (view.phase === 'waiting') {
    const n = view.players;
    const here = view.seats.filter((x) => x !== 'empty').length;
    return center(T.waiting, CONFIG.mode === 'app' ? T.waitingHelpApp : n === 3 ? T.waitingHelp3 : T.waitingHelp, `${hostCodeHtml()}<div class="waiting-actions">
      <fieldset class="game-type"><legend>${T.gameType}</legend>
        <label><input type="radio" name="players" value="2" data-opt="players" ${n === 2 ? 'checked' : ''}> ${T.typeMatgo}</label>
        <label><input type="radio" name="players" value="3" data-opt="players" ${n === 3 ? 'checked' : ''}> ${T.typeGostop}</label>
      </fieldset>
      <p class="here">${T.here(here, n)}</p>
      <button class="btn primary big" data-cmd="solo">${n === 3 ? T.fillBots : T.playSolo}</button>
      ${optionHtml()}</div>`);
  }
  renderGame(view.game);
}

function totalsText() {
  const n = view.totals.length;
  const order = Array.from({ length: n }, (_, i) => (view.seat + i) % n);
  return order.map((s) => `${nameOf(s)} ${view.totals[s]}`).join('  |  ');
}

function renderScoreLine() {
  if (!view || view.phase !== 'playing') {
    scoreLine.textContent = '';
    return;
  }
  scoreLine.textContent = `${T.round(view.round)}   ${totalsText()}`;
}

function optionHtml() {
  return `<label class="option"><input type="checkbox" data-opt="bonus" ${view?.options?.bonus ? 'checked' : ''}> ${T.optBonus}</label>`;
}

function center(title, text, extra = '') {
  app.innerHTML = `<div class="center-msg"><h1>${esc(title)}</h1>${text ? `<p>${esc(text)}</p>` : ''}${extra}</div>`;
}

function chancesHtml(g) {
  const max = g.others.length > 1 ? 3 : 5;
  const show = (list) => list.filter((x) => x.possible || x.points > 0).slice(0, max);
  const othersCaptured = g.others.flatMap((o) => o.captured);
  const ul = (list) => (list.length ? `<ul>${list.map((x) => `<li class="${x.points ? 'scored' : ''}">${esc(x.text)}</li>`).join('')}</ul>` : `<p class="none">${T.nothingYet}</p>`);
  const mine = show(prospects(g.captured.mine, othersCaptured, g.gukjinAs.mine));
  const blocks = [`<div><h3>${T.chances}: ${T.you}</h3>${ul(mine)}</div>`];
  for (const o of g.others) {
    const rest = [...g.captured.mine, ...g.others.filter((x) => x !== o).flatMap((x) => x.captured)];
    blocks.push(`<div><h3>${T.chances}: ${esc(nameOf(o.seat))}</h3>${ul(show(prospects(o.captured, rest, o.gukjinAs)))}</div>`);
  }
  return `<section class="chances ${g.others.length > 1 ? 'three' : ''}" aria-label="${T.chances}">${blocks.join('')}</section>`;
}

function opponentHtml(o, compact) {
  const go = o.goCount ? ` <span class="badge">${T.goCount(o.goCount)}</span>` : '';
  const turn = view.game.turn === o.seat && !view.game.result ? ' turn' : '';
  return `<section class="opponent${compact ? ' compact' : ''}${turn}" aria-label="${esc(nameOf(o.seat))}">
    <div class="row-head"><span><strong>${esc(nameOf(o.seat))}</strong>${go}</span>
      <span class="backs" id="opp-hand-${o.seat}">${Array.from({ length: o.handCount }, back).join('')}</span>
      <span>${T.points(o.score.total)}</span></div>
    ${capturedHtml(`o${o.seat}`, o.captured, o.gukjinAs, o.score)}
  </section>`;
}

function renderGame(g) {
  const me = g.you;
  const myTurn = !g.pending && g.turn === me && !g.result;
  const statusText = g.result
    ? ''
    : g.pending?.type === 'opponentDeciding'
      ? T.decides(nameOf(g.pending.player))
      : g.pending || myTurn
        ? T.yourTurn
        : T.turnOf(nameOf(g.turn));
  const floorMonths = new Set(g.floor.map((id) => cardInfo(id).month));

  const hand = g.hand
    .map((id) => {
      const idx = legalIndex((a) => (a.type === 'play' || a.type === 'useBonus') && a.cardId === id);
      const bonus = id.startsWith('b-');
      const hint = hints && myTurn && (bonus || floorMonths.has(cardInfo(id).month)) ? 'hint' : '';
      return idx >= 0 ? card(id, { idx, cls: hint }) : card(id, { cls: myTurn ? '' : 'dim' });
    })
    .join('');

  const extras = legal
        .map((a, i) => {
          if (a.type === 'shake') return `<button class="btn shake" data-legal="${i}">${esc(T.shake(a.month))}</button>`;
          if (a.type === 'bomb') return `<button class="btn danger" data-legal="${i}">${esc(T.bomb(a.month))}</button>`;
          if (a.type === 'flipOnly') return `<button class="btn primary" data-legal="${i}">${esc(T.flipOnly(g.flipOnly))}</button>`;
          if (a.type === 'setGukjin') return `<button class="btn quiet" data-legal="${i}">${esc(a.as === 'pi' ? T.gukjinToPi : T.gukjinToYeol)}</button>`;
          return '';
        })
        .join('');

  const inflight = g.inFlight.length ? `<div class="inflight">${T.inPlay}: ${g.inFlight.map((id) => card(id)).join('')}</div>` : '';
  const myGo = g.goCount.mine ? ` <span class="badge">${T.goCount(g.goCount.mine)}</span>` : '';
  const reportBox = report.length ? `<section class="report" aria-label="${T.report}">${report.map((l) => `<p>${esc(l)}</p>`).join('')}</section>` : '';

  app.innerHTML = `
  ${status === 'reconnecting' ? `<div class="banner">${T.reconnecting}</div>` : ''}
  ${g.others.map((o) => opponentHtml(o, g.others.length > 1)).join('')}
  <div class="status ${myTurn || (g.pending && g.pending.type !== 'opponentDeciding') ? 'mine' : ''}">${esc(statusText)}</div>
  <section class="table">
    ${floorHtml(g)}
    <div class="pile"><span class="card" id="pile">${cardBackSvg()}</span><span id="pile-count">${T.cardsLeft(g.pileCount)}</span></div>
  </section>
  ${inflight}
  ${reportBox}
  <section class="mine-captured" aria-label="${T.you}">
    <div class="row-head"><span><strong>${T.you}</strong>${myGo}</span><span>${T.points(g.scores.mine.total)}</span></div>
    ${capturedHtml('mine', g.captured.mine, g.gukjinAs.mine, g.scores.mine)}
  </section>
  ${extras ? `<div class="extras">${extras}</div>` : ''}
  <section class="hand" aria-label="Hand">${hand}</section>
  ${chancesHtml(g)}
  ${overlayHtml(g)}`;
}

function overlayHtml(g) {
  if (g.result) return resultHtml(g);
  const p = g.pending;
  if (p?.type === 'chooseFloor') {
    const opts = p.options.map((id) => card(id, { idx: legalIndex((a) => a.type === 'choose' && a.cardId === id) })).join('');
    return `<div class="overlay"><div class="sheet" role="dialog" aria-modal="true">
      <h2>${T.chooseTitle}</h2><p>${esc(T.chooseHelp(cardInfo(p.card).month))}</p>
      <div class="choices">${card(p.card, { cls: 'played' })}${opts}</div></div></div>`;
  }
  if (p?.type === 'choosePresident') {
    const win = legalIndex((a) => a.type === 'president' && a.as === 'win');
    const play = legalIndex((a) => a.type === 'president' && a.as === 'play');
    const four = g.hand.filter((id) => cardInfo(id).month === p.month);
    return `<div class="overlay"><div class="sheet" role="dialog" aria-modal="true">
      <h2>${esc(T.president(p.month))}</h2><p>${T.presidentChoice}</p>
      <div class="reveal">${four.map((id) => `<span class="card">${cardSvg(id)}</span>`).join('')}</div>
      <div class="gostop">
        <button class="btn primary" data-legal="${win}">${T.presidentWin}<small>${esc(T.presidentWinHelp(g.players))}</small></button>
        <button class="btn" data-legal="${play}">${T.presidentPlay}<small>${T.presidentPlayHelp}</small></button>
      </div></div></div>`;
  }
  if (p?.type === 'chooseGukjin') {
    const yeol = legalIndex((a) => a.type === 'setGukjin' && a.as === 'yeol');
    const pi = legalIndex((a) => a.type === 'setGukjin' && a.as === 'pi');
    return `<div class="overlay"><div class="sheet" role="dialog" aria-modal="true">
      <h2>${T.gukjinTitle}</h2><p>${T.gukjinHelp}</p>
      <div class="choices">${card('m09-yeol', { cls: 'played' })}</div>
      <div class="gostop">
        <button class="btn primary" data-legal="${yeol}">${T.gukjinAsYeol}<small>${esc(T.gukjinYeolHelp(g.scores.mine.counts.yeol))}</small></button>
        <button class="btn" data-legal="${pi}">${T.gukjinAsPi}<small>${esc(T.gukjinPiHelp(g.scores.mine.counts.pi))}</small></button>
      </div></div></div>`;
  }
  if (p?.type === 'goStop') {
    const go = legalIndex((a) => a.type === 'go');
    const stop = legalIndex((a) => a.type === 'stop');
    return `<div class="overlay"><div class="sheet" role="dialog" aria-modal="true">
      <h2>${esc(T.goStopTitle(g.scores.mine.total))}</h2>
      <div class="gostop">
        <button class="btn primary" data-legal="${go}">${T.go}<small>${g.players === 3 ? T.goHelp3 : T.goHelp}</small></button>
        <button class="btn" data-legal="${stop}">${T.stop}<small>${T.stopHelp}</small></button>
      </div></div></div>`;
  }
  return '';
}

function resultHtml(g) {
  const r = g.result;
  const me = g.you;
  const totals = `<p>${T.totals}: ${esc(totalsText())}</p>`;
  const next = `${optionHtml()}<button class="btn primary" data-cmd="next">${T.nextRound}</button>`;
  if (r.kind === 'nagari') {
    return `<div class="overlay"><div class="sheet" role="dialog" aria-modal="true"><h2>${T.resultNagari}</h2><p>${T.nagariHelp}</p>${totals}${next}</div></div>`;
  }
  const s = r.settlement;
  const sp = s.special;
  const rows = [`<tr><td>${sp ? T.fixedPoints : T.base}</td><td>${s.base}</td></tr>`];
  if (s.goCount) rows.push(`<tr><td>${esc(T.goBonus(s.goCount))}</td><td>${s.points}</td></tr>`);
  const pays = s.payments ?? [{ from: null, multipliers: s.multipliers, amount: s.final }];
  if (pays.length === 1) {
    for (const m of pays[0].multipliers) rows.push(`<tr><td>${esc(T.mult[m.kind])}</td><td>×${m.factor}</td></tr>`);
  } else {
    // 3 Spieler: jede verlierende Person zahlt einzeln
    for (const p of pays) {
      const why = p.multipliers.map((m) => `${T.mult[m.kind]} ×${m.factor}`).join(', ');
      const note = p.dokbak ? T.dokbak : why;
      rows.push(`<tr class="pay"><td>${esc(T.pays(nameOf(p.from)))}${note ? `<small>${esc(note)}</small>` : ''}</td><td>${p.amount}</td></tr>`);
    }
  }
  rows.push(`<tr class="total"><td>${T.final}</td><td>${s.final}</td></tr>`);
  const title = r.winner === me ? T.resultWin : T.winnerIs(nameOf(r.winner));
  // 대통령 / 쓰리뻑: besondere Siege mit Erklärung
  let specialHtml = '';
  if (sp?.kind === 'president') {
    specialHtml = `<h3 class="special">${esc(T.president(sp.month))}</h3><p>${T.presidentHelp}</p><div class="reveal">${sp.cards.map((id) => `<span class="card">${cardSvg(id)}</span>`).join('')}</div>`;
  } else if (sp?.kind === 'threePpeok') {
    specialHtml = `<h3 class="special">${T.threePpeokTitle}</h3><p>${T.threePpeokHelp}</p>`;
  }
  return `<div class="overlay"><div class="sheet" role="dialog" aria-modal="true">
    <h2>${esc(title)}</h2>${specialHtml}
    <table class="settle">${rows.join('')}</table>${totals}${next}</div></div>`;
}

document.getElementById('leave-btn')?.addEventListener('click', (e) => {
  const el = e.currentTarget;
  if (el.dataset.armed) return leaveSession();
  el.dataset.armed = '1';
  el.textContent = T.leaveConfirm;
  setTimeout(() => {
    delete el.dataset.armed;
    el.textContent = T.leave;
  }, 3000);
});
if (CONFIG.mode === 'app' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

render();
connect();
