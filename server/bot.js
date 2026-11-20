// 컴퓨터 상대: 단순하지만 그럴듯하게 둔다. 자기 손패와 공개된 패만 본다.
import { legalActions, otherSeats } from '../src/engine/game.js';
import { CARD_BY_ID, monthOf } from '../src/engine/cards.js';
import { scoreOf } from '../src/engine/score.js';

const SETS = [
  ['m02-yeol', 'm04-yeol', 'm08-yeol'],
  ['m01-hong', 'm02-hong', 'm03-hong'],
  ['m06-cheong', 'm09-cheong', 'm10-cheong'],
  ['m04-cho', 'm05-cho', 'm07-cho'],
];

// 한 장의 가치: 종류 + 내가 모으는 족보를 채우는지
function value(id, mine) {
  const c = CARD_BY_ID[id];
  let v = { gwang: 9, yeol: 5, tti: 4, pi: 1 + c.piValue }[c.kind];
  if (c.kind === 'gwang') v += mine.filter((x) => CARD_BY_ID[x].kind === 'gwang').length * 2;
  for (const set of SETS) {
    if (!set.includes(id)) continue;
    const have = set.filter((x) => mine.includes(x)).length;
    v += 2 + have * 3;
  }
  return v;
}

// 이 패를 내면 바닥에서 무엇을 먹을 수 있나 (뒤집기는 모른다)
function playScore(state, seat, id) {
  const mine = state.captured[seat];
  const m = monthOf(id);
  const matches = state.floor.filter((x) => monthOf(x) === m);
  if (matches.length === 0) return -value(id, mine) * 0.6; // 버리는 패: 싼 패부터
  if (matches.length === 3) return value(id, mine) + matches.reduce((n, x) => n + value(x, mine), 0) + 3;
  const best = Math.max(...matches.map((x) => value(x, mine)));
  return value(id, mine) + best;
}

export function chooseAction(state, seat) {
  const legal = legalActions(state, seat);
  if (!legal.length) return null;
  const p = state.pending;
  const mine = state.captured[seat];

  if (p?.type === 'chooseFloor') {
    return legal.reduce((a, b) => (value(b.cardId, mine) > value(a.cardId, mine) ? b : a));
  }
  if (p?.type === 'choosePresident') return { type: 'president', as: 'win' };
  // 4인 광팔기: 광 2장이면 판다. 3장 이상이면 광으로 점수를 낼 수 있으니 친다.
  if (p?.type === 'sellGwang') return { type: 'gwang', as: p.gwang.length === 2 ? 'sell' : 'play' };
  if (p?.type === 'chooseGukjin') {
    const asYeol = scoreOf(state, seat, 'yeol');
    const asPi = scoreOf(state, seat, 'pi');
    const pick = asPi.total > asYeol.total || (asPi.total === asYeol.total && asPi.counts.pi >= 7) ? 'pi' : 'yeol';
    return { type: 'setGukjin', as: pick };
  }
  if (p?.type === 'goStop') {
    const opp = Math.max(...otherSeats(state, seat).map((o) => scoreOf(state, o).total));
    const near = state.hands.length >= 3 ? 2 : 5; // 상대가 이만큼 가까우면 멈춘다
    const go = state.goCount[seat] < 2 && opp < near && state.hands[seat].length >= 3;
    return { type: go ? 'go' : 'stop' };
  }

  // 내 차례: 손의 보너스는 바로 쓴다
  const bonus = legal.find((a) => a.type === 'useBonus');
  if (bonus) return bonus;
  const bomb = legal.find((a) => a.type === 'bomb');
  if (bomb) return bomb;
  const shake = legal.find((a) => a.type === 'shake');
  if (shake) return shake;
  let best = null;
  let bestScore = -Infinity;
  for (const a of legal) {
    let sc = -Infinity;
    if (a.type === 'play') sc = playScore(state, seat, a.cardId);
    else if (a.type === 'flipOnly') sc = 0.5;
    if (sc > bestScore) {
      best = a;
      bestScore = sc;
    }
  }
  return best ?? legal[0];
}
