import { CARDS, BONUS_CARDS, CARD_BY_ID, monthOf, isBonus } from './cards.js';
import { makeRng, shuffle } from './rng.js';
import { RULES } from './rules-config.js';
import { scoreOf } from './score.js';
import { settle, settleSpecial } from './settle.js';

export class GameError extends Error {
  constructor(code, message = code) {
    super(message);
    this.code = code; // 'NOT_YOUR_TURN' | 'ILLEGAL' | 'GAME_OVER'
  }
}

const GUKJIN = 'm09-yeol';

function floorHasFourOfAMonth(floor) {
  const n = {};
  for (const id of floor) n[monthOf(id)] = (n[monthOf(id)] ?? 0) + 1;
  return Object.values(n).some((c) => c >= 4);
}

// players: 2 = 맞고, 3 = 3인 고스톱, 4 = 4인 고스톱 (한 명은 광을 팔고 빠진다)
export function createGame({ seed, deck, starter = 0, carry = 0, bonus = false, players = 2, biGodori = false } = {}) {
  if (deck) return deal(deck, starter, carry, players, null, biGodori);
  const rng = makeRng(seed ?? Date.now());
  const ids = [...CARDS, ...(bonus ? BONUS_CARDS : [])].map((c) => c.id);
  let state;
  do state = deal(shuffle(ids, rng), starter, carry, players, Math.floor(rng() * 2 ** 32), biGodori);
  while (floorHasFourOfAMonth(state.floor));
  return state;
}

function deal(order, starter, carry, players, saleSeed, biGodori = false) {
  const n = players;
  const handSize = n >= 3 ? 7 : 10;
  const floorSize = n >= 3 ? 6 : 8;
  const each = (f) => Array.from({ length: n }, f);
  const state = {
    hands: each((_, i) => order.slice(i * handSize, (i + 1) * handSize)),
    floor: order.slice(n * handSize, n * handSize + floorSize),
    pile: order.slice(n * handSize + floorSize),
    captured: each(() => []),
    turn: starter,
    pending: null,
    ctx: null, // 진행 중인 차례: { player, played, playedMonth, k, flipped, bonus, playDone, flipDone, bonusDone }
    goCount: each(() => 0),
    lastGoScore: each(() => 0),
    shakes: each(() => []),
    bombs: each(() => []),
    flipOnly: each(() => 0),
    ppeokOwner: {},
    ppeokBonus: {}, // 뻑 더미에 같이 쌓인 보너스 피: 월 → [id]
    gukjinAs: each(() => 'yeol'),
    gukjinChoice: null, // 국진을 방금 먹어 선택해야 하는 사람
    ppeokCount: each(() => 0), // 이번 판에 뻑한 횟수 (쓰리뻑)
    turnsTaken: each(() => 0), // 차례를 시작한 횟수 (첫뻑)
    carry,
    result: null,
    biGodori, // 비고도리 규칙
    out: null, // 4인: 광을 팔고 빠진 자리
    gwangSale: null,
  };
  if (n === 4) {
    // 4인: 선 다음 사람부터 차례로 광을 팔지(빠질지) 정한다. 바닥은 정해질 때까지 덮어 둔다.
    state.sale = { order: [1, 2, 3].map((i) => (starter + i) % n), idx: 0, seed: saleSeed };
    askSale(state);
    return state;
  }
  finishDeal(state);
  return state;
}

// 팔 수 있는 광: 비광 한 장뿐이면 값이 없다
export function sellableGwang(hand) {
  const g = hand.filter((id) => CARD_BY_ID[id].kind === 'gwang');
  return g.length === 1 && CARD_BY_ID[g[0]].biGwang ? [] : g;
}

function askSale(state) {
  const seat = state.sale.order[state.sale.idx];
  state.pending = { type: 'sellGwang', player: seat, gwang: sellableGwang(state.hands[seat]) };
}

function sellGwang(state, seat, forced, events) {
  const n = state.hands.length;
  const cards = sellableGwang(state.hands[seat]);
  const per = cards.length * RULES.gwangSale.perGwang;
  const payments = [1, 2, 3].map((i) => ({ from: (seat + i) % n, amount: per }));
  state.gwangSale = { seat, cards, forced, payments, total: per * payments.length };
  state.out = seat;
  const back = [...state.pile, ...state.hands[seat]];
  state.pile = state.sale.seed == null ? back : shuffle(back, makeRng(state.sale.seed));
  state.hands[seat] = [];
  state.sale = null;
  state.pending = null;
  events.push({ type: 'gwangSold', player: seat, cards, forced, total: state.gwangSale.total });
  finishDeal(state);
}

function finishDeal(state) {
  const n = state.hands.length;
  const starter = state.turn;
  while (state.floor.some(isBonus) && state.pile.length) {
    const i = state.floor.findIndex(isBonus);
    state.captured[starter].push(state.floor[i]);
    state.floor[i] = state.pile.shift();
  }
  // 손의 보너스는 손에 둔다: 자기 차례에 useBonus로 쓴다
  // 대통령: 처음 손에 같은 월 4장 → 15점을 받고 끝낼지, 들고 칠지 고른다. 여럿이면 선부터 차례로.
  state.presidents = [];
  for (let i = 0; i < n; i++) {
    const seat = (starter + i) % n;
    if (seat === state.out) continue;
    const byMonth = {};
    for (const id of state.hands[seat]) if (!isBonus(id)) (byMonth[monthOf(id)] ??= []).push(id);
    const four = Object.entries(byMonth).find(([, ids]) => ids.length === 4);
    if (four) state.presidents.push({ seat, month: Number(four[0]), cards: four[1] });
  }
  askPresident(state);
}

function askPresident(state) {
  const next = state.presidents[0];
  state.pending = next ? { type: 'choosePresident', player: next.seat, month: next.month } : null;
}

// 차례 처리 중이라 아직 어느 구역에도 없는 패 (고르기 대기 중에만 생긴다)
export function inFlight(state) {
  const ctx = state.ctx;
  if (!ctx) return [];
  const out = [];
  if (ctx.played && !ctx.playDone) out.push(ctx.played);
  if (ctx.flipped && !ctx.flipDone) out.push(ctx.flipped);
  if (!ctx.bonusDone) out.push(...ctx.bonus);
  return out;
}

// ---------- 낼 수 있는 행동 ----------

export function legalActions(state, seat) {
  if (state.result) return [];
  const out = [];
  const p = state.pending;
  if (p) {
    if (p.player === seat) {
      if (p.type === 'chooseFloor') for (const id of p.options) out.push({ type: 'choose', cardId: id });
      if (p.type === 'goStop') out.push({ type: 'go' }, { type: 'stop' });
      if (p.type === 'chooseGukjin') out.push({ type: 'setGukjin', as: 'yeol' }, { type: 'setGukjin', as: 'pi' });
      if (p.type === 'choosePresident') out.push({ type: 'president', as: 'win' }, { type: 'president', as: 'play' });
      if (p.type === 'sellGwang') out.push({ type: 'gwang', as: 'sell' }, { type: 'gwang', as: 'play' });
    }
  } else if (state.turn === seat) {
    for (const id of state.hands[seat]) out.push(isBonus(id) ? { type: 'useBonus', cardId: id } : { type: 'play', cardId: id });
    if (state.flipOnly[seat] > 0 && state.pile.length > 0) out.push({ type: 'flipOnly' });
    out.push(...turnStartExtras(state, seat));
  }
  return out;
}

// 차례 시작에 할 수 있는 추가 행동: 흔들기, 폭탄
function turnStartExtras(state, seat) {
  const out = [];
  const byMonth = {};
  for (const id of state.hands[seat]) if (!isBonus(id)) (byMonth[monthOf(id)] ??= []).push(id);
  for (const [m, ids] of Object.entries(byMonth)) {
    const month = Number(m);
    if (ids.length < 3) continue;
    const used = state.shakes[seat].includes(month) || state.bombs[seat].includes(month);
    const onFloor = state.floor.filter((id) => monthOf(id) === month).length;
    // 흔들기: 바닥에 짝이 없을 때 3장을 보여준다. 짝이 있으면 폭탄.
    if (!used && onFloor === 0) out.push({ type: 'shake', month });
    if (ids.length === 3 && onFloor === 1) out.push({ type: 'bomb', month });
  }
  return out;
}

const sameAction = (a, b) =>
  a.type === b.type && a.cardId === b.cardId && a.month === b.month && a.as === b.as;

// ---------- 행동 적용 ----------

export function applyAction(state, seat, action) {
  if (state.result) throw new GameError('GAME_OVER');
  const legal = legalActions(state, seat);
  if (!legal.some((a) => sameAction(a, action ?? {}))) {
    const mine = state.pending ? state.pending.player === seat : state.turn === seat;
    throw new GameError(mine ? 'ILLEGAL' : 'NOT_YOUR_TURN');
  }
  const events = [];
  switch (action.type) {
    case 'gwang': {
      if (action.as === 'sell') {
        sellGwang(state, seat, false, events);
      } else {
        events.push({ type: 'staysIn', player: seat });
        state.sale.idx += 1;
        // 두 사람이 치겠다고 하면 마지막 사람은 빠져야 한다
        if (state.sale.idx === 2) sellGwang(state, state.sale.order[2], true, events);
        else askSale(state);
      }
      return events;
    }
    case 'setGukjin':
      state.gukjinAs[seat] = action.as;
      state.gukjinChoice = null;
      state.pending = null;
      events.push({ type: 'gukjin', player: seat, as: action.as });
      break;
    case 'play':
      startTurn(state, seat, action.cardId, events);
      break;
    case 'flipOnly':
      state.flipOnly[seat] -= 1;
      startTurn(state, seat, null, events);
      break;
    case 'choose':
      chooseFloor(state, action.cardId, events);
      break;
    case 'shake': {
      state.shakes[seat].push(action.month);
      const cards = state.hands[seat].filter((id) => monthOf(id) === action.month);
      events.push({ type: 'shaken', player: seat, month: action.month, cards });
      return events;
    }
    case 'bomb':
      startBomb(state, seat, action.month, events);
      break;
    case 'president': {
      const pr = state.presidents.shift();
      if (action.as === 'win') {
        state.pending = null;
        const special = { kind: 'president', month: pr.month, cards: pr.cards };
        events.push({ type: 'president', player: seat, month: pr.month, cards: pr.cards });
        state.result = { kind: 'win', winner: seat, settlement: settleSpecial(state, seat, RULES.president, special) };
        events.push({ type: 'roundEnd', result: state.result });
      } else {
        events.push({ type: 'presidentPlayOn', player: seat, month: pr.month });
        askPresident(state);
      }
      return events;
    }
    case 'useBonus': {
      // 손의 보너스: 내 피로 내려놓고, 더미에서 한 장을 손으로 가져오고, 상대 피 1장. 차례는 계속된다.
      state.hands[seat] = state.hands[seat].filter((id) => id !== action.cardId);
      state.captured[seat].push(action.cardId);
      const drawn = state.pile.length ? state.pile.shift() : null;
      if (drawn) state.hands[seat].push(drawn);
      events.push({ type: 'bonusUsed', player: seat, card: action.cardId });
      stealPi(state, seat, RULES.steal.bonus, events);
      // 가져온 패로 손에 같은 월 4장이 되면 대통령
      if (drawn && !isBonus(drawn)) {
        const cards = state.hands[seat].filter((id) => monthOf(id) === monthOf(drawn));
        if (cards.length === 4) {
          state.presidents.push({ seat, month: monthOf(drawn), cards });
          askPresident(state);
        }
      }
      return events;
    }
    case 'go': {
      state.pending = null;
      state.goCount[seat] += 1;
      state.lastGoScore[seat] = currentScore(state, seat);
      events.push({ type: 'go', player: seat, count: state.goCount[seat] });
      passTurn(state, seat, events);
      return events;
    }
    case 'stop':
      state.pending = null;
      events.push({ type: 'stop', player: seat });
      endRound(state, { kind: 'win', winner: seat }, events);
      return events;
    default:
      throw new GameError('ILLEGAL');
  }
  resolve(state, events);
  return events;
}

function startTurn(state, seat, cardId, events) {
  state.turnsTaken[seat] += 1;
  const ctx = { player: seat, played: cardId, playedMonth: null, k: 0, flipped: null, bonus: [], playDone: cardId == null, flipDone: false, bonusDone: false, ppeokMonth: null };
  if (cardId) {
    state.hands[seat] = state.hands[seat].filter((id) => id !== cardId);
    ctx.playedMonth = monthOf(cardId);
    ctx.k = state.floor.filter((id) => monthOf(id) === ctx.playedMonth).length;
    events.push({ type: 'played', player: seat, card: cardId });
  }
  // 보너스가 나오면 뒤집은 사람이 갖고 한 장 더 뒤집는다
  while (state.pile.length > 0 && isBonus(state.pile[0])) {
    const b = state.pile.shift();
    ctx.bonus.push(b);
    events.push({ type: 'flipped', player: seat, card: b, bonus: true });
  }
  if (state.pile.length > 0) {
    ctx.flipped = state.pile.shift();
    events.push({ type: 'flipped', player: seat, card: ctx.flipped });
  } else {
    ctx.flipDone = true;
  }
  // 더미에 보너스만 남았으면 그것도 이번에 가져간다 (안 그러면 판이 끝나지 않는다)
  if (state.pile.length > 0 && state.pile.every(isBonus)) {
    for (const b of state.pile.splice(0)) {
      ctx.bonus.push(b);
      events.push({ type: 'flipped', player: seat, card: b, bonus: true });
    }
  }
  state.ctx = ctx;
}

function startBomb(state, seat, month, events) {
  const cards = state.hands[seat].filter((id) => monthOf(id) === month);
  state.hands[seat] = state.hands[seat].filter((id) => monthOf(id) !== month);
  events.push({ type: 'bomb', player: seat, month, cards });
  capture(state, seat, [...cards, ...state.floor.filter((id) => monthOf(id) === month)], events);
  stealPi(state, seat, RULES.steal.bomb, events);
  if (!state.shakes[seat].includes(month)) state.bombs[seat].push(month);
  state.flipOnly[seat] += 2;
  startTurn(state, seat, null, events);
}

function chooseFloor(state, cardId, events) {
  const p = state.pending;
  capture(state, p.player, [p.card, cardId], events);
  if (p.phase === 'play') state.ctx.playDone = true;
  else state.ctx.flipDone = true;
  state.pending = null;
}

// 한 차례를 끝까지 처리한다. 선택이 필요하면 pending을 세우고 멈춘다.
function resolve(state, events) {
  const ctx = state.ctx;
  if (!ctx) return;
  if (!ctx.playDone) {
    if (resolvePlayWithFlip(state, ctx, events)) {
      ctx.playDone = true;
      ctx.flipDone = true;
    } else {
      if (resolveCard(state, ctx.played, 'play', events) === 'pending') return;
      ctx.playDone = true;
    }
  }
  if (!ctx.flipDone) {
    if (resolveCard(state, ctx.flipped, 'flip', events) === 'pending') return;
    ctx.flipDone = true;
  }
  if (!ctx.bonusDone) {
    ctx.bonusDone = true;
    if (ctx.bonus.length) {
      // 뻑이 난 차례면 보너스는 뻑 더미에 같이 쌓인다
      if (ctx.ppeokMonth != null) {
        (state.ppeokBonus[ctx.ppeokMonth] ??= []).push(...ctx.bonus);
        events.push({ type: 'bonusStacked', player: ctx.player, month: ctx.ppeokMonth, cards: [...ctx.bonus] });
      } else {
        capture(state, ctx.player, [...ctx.bonus], events);
        stealPi(state, ctx.player, RULES.steal.bonus * ctx.bonus.length, events);
      }
    }
  }
  // 쓰리뻑: 기본점수로 바로 승리
  if (ctx.threePpeok) {
    state.ctx = null;
    const base = state.hands.length >= 3 ? RULES.goStopMin3 : RULES.goStopMin;
    events.push({ type: 'threePpeok', player: ctx.player });
    state.result = { kind: 'win', winner: ctx.player, settlement: settleSpecial(state, ctx.player, base, { kind: 'threePpeok' }) };
    events.push({ type: 'roundEnd', result: state.result });
    return;
  }
  // 국진을 먹었으면 차례를 끝내기 전에 열끗/쌍피를 고른다
  if (state.gukjinChoice != null) {
    state.pending = { type: 'chooseGukjin', player: state.gukjinChoice };
    return;
  }
  finishTurn(state, events);
}

// 낸 패와 뒤집은 패가 같은 월일 때: 뻑, 따닥, 쪽. 처리했으면 true.
function resolvePlayWithFlip(state, ctx, events) {
  const { player, played, flipped, playedMonth: month, k } = ctx;
  if (!flipped || monthOf(flipped) !== month) return false;
  const floorSame = state.floor.filter((id) => monthOf(id) === month);
  if (k === 1) {
    state.floor.push(played, flipped);
    state.ppeokOwner[month] = player;
    ctx.ppeokMonth = month;
    state.ppeokCount[player] += 1;
    events.push({ type: 'ppeok', player, month, count: state.ppeokCount[player] });
    if (state.turnsTaken[player] === 1) {
      events.push({ type: 'firstPpeok', player });
      stealPi(state, player, RULES.steal.firstPpeok, events);
    }
    if (state.ppeokCount[player] >= RULES.threePpeok) ctx.threePpeok = true;
  } else if (k === 2) {
    capture(state, player, [played, flipped, ...floorSame], events);
    // 손에 남은 마지막 1장(막패)에서는 따닥 미적용
    if (state.hands[player].length > 0) {
      events.push({ type: 'ttadak', player, month });
      stealPi(state, player, RULES.steal.ttadak, events);
    }
  } else if (k === 0) {
    capture(state, player, [played, flipped], events);
    events.push({ type: 'jjok', player, month });
    stealPi(state, player, RULES.steal.jjok, events);
  } else {
    return false;
  }
  return true;
}

function resolveCard(state, cardId, phase, events) {
  const player = state.ctx.player;
  const month = monthOf(cardId);
  const matches = state.floor.filter((id) => monthOf(id) === month);
  if (matches.length === 0) {
    state.floor.push(cardId);
    events.push({ type: 'placed', player, card: cardId });
  } else if (matches.length === 2) {
    // 같은 값의 일반 피 두 장이면 묻지 않고 하나를 가져간다
    const [a, b] = matches.map((id) => CARD_BY_ID[id]);
    if (a.kind === 'pi' && b.kind === 'pi' && a.piValue === b.piValue && !a.bonus && !b.bonus) {
      capture(state, player, [cardId, matches[0]], events);
      return 'done';
    }
    state.pending = { type: 'chooseFloor', player, phase, card: cardId, options: matches };
    return 'pending';
  } else {
    capture(state, player, [cardId, ...matches, ...(matches.length === 3 ? state.ppeokBonus[month] ?? [] : [])], events);
    if (matches.length === 3) delete state.ppeokBonus[month];
    if (matches.length === 3 && state.ppeokOwner[month] !== undefined) {
      const self = state.ppeokOwner[month] === player;
      delete state.ppeokOwner[month];
      events.push({ type: self ? 'jaPpeok' : 'ppeokEat', player, month });
      stealPi(state, player, self ? RULES.steal.jaPpeok : RULES.steal.ppeok, events);
    } else if (matches.length === 3) {
      // 처음부터 바닥에 모여 있던 3장을 먹어도 피를 받는다
      stealPi(state, player, RULES.steal.triple, events);
    }
  }
  return 'done';
}

function capture(state, player, ids, events) {
  state.floor = state.floor.filter((id) => !ids.includes(id));
  state.captured[player].push(...ids);
  if (ids.includes(GUKJIN)) state.gukjinChoice = player;
  events.push({ type: 'captured', player, cards: ids });
}

// 내 다음 차례부터 다른 사람들. 광을 팔고 빠진 자리는 없다.
export const otherSeats = (state, seat) => {
  const n = state.hands.length;
  return Array.from({ length: n - 1 }, (_, i) => (seat + 1 + i) % n).filter((s) => s !== state.out);
};

// 다른 사람 모두에게서 각각 피를 n장 가져온다: 일반 피(1점) 우선, 없으면 쌍피(2점, 피로 쓰는 국진 포함) → 쓰리피(3점) 순.
function stealPi(state, player, n, events) {
  for (const from of otherSeats(state, player)) {
    const cards = [];
    for (let i = 0; i < n; i++) {
      const isPi = (id) => CARD_BY_ID[id].kind === 'pi' || (id === GUKJIN && state.gukjinAs[from] === 'pi');
      const pool = state.captured[from].filter(isPi);
      if (!pool.length) break;
      const piVal = (id) => (id === GUKJIN ? RULES.gukjinPiValue : CARD_BY_ID[id].piValue);
      const rank = (id) => piVal(id) * 10 + (isBonus(id) ? 1 : 0); // 1점 일반피 < 2점 쌍피(11/12/국진) < 2점 보너스 < 3점 쓰리피
      const pick = pool.reduce((a, b) => (rank(b) < rank(a) ? b : a));
      state.captured[from] = state.captured[from].filter((id) => id !== pick);
      state.captured[player].push(pick);
      if (pick === GUKJIN) state.gukjinChoice = player;
      cards.push(pick);
    }
    if (cards.length) events.push({ type: 'steal', player, from, cards });
  }
}

export const isFinalTurnOver = (state) => state.hands.every((h) => h.length === 0) && state.pile.length === 0;

const currentScore = (state, seat) => scoreOf(state, seat).total;

function finishTurn(state, events) {
  const player = state.ctx.player;
  const last = isFinalTurnOver(state);
  // 손에 남은 마지막 1장(막패)에서는 싹쓸이 미적용
  if (state.floor.length === 0 && state.hands[player].length > 0) {
    events.push({ type: 'sweep', player });
    stealPi(state, player, RULES.steal.sweep, events);
  }
  state.ctx = null;
  const score = currentScore(state, player);
  const goStopMin = state.hands.length >= 3 ? RULES.goStopMin3 : RULES.goStopMin;
  if (score >= goStopMin && score > state.lastGoScore[player]) {
    // 마지막 차례이거나 내 손에 패가 없으면 고를 할 수 없다: 자동 스톱
    if (last || state.hands[player].length === 0) {
      events.push({ type: 'stop', player, auto: true });
      endRound(state, { kind: 'win', winner: player }, events);
    } else {
      state.pending = { type: 'goStop', player };
      events.push({ type: 'goStopOffered', player, score });
    }
    return;
  }
  if (last) {
    endRound(state, { kind: 'nagari' }, events);
    return;
  }
  passTurn(state, player, events);
}

function passTurn(state, player, events) {
  const n = state.hands.length;
  let next = (player + 1) % n;
  if (next === state.out) next = (next + 1) % n;
  state.turn = next;
  events.push({ type: 'turn', player: state.turn });
}

function endRound(state, result, events) {
  state.result = result.kind === 'win' ? { ...result, settlement: settle(state, result.winner) } : result;
  events.push({ type: 'roundEnd', result: state.result });
}

export { CARD_BY_ID };
