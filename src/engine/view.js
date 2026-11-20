import { legalActions, inFlight, otherSeats } from './game.js';
import { scoreOf } from './score.js';

// 한 자리에서 보이는 것만 담는다. 다른 사람 손패와 더미의 카드 id는 넣지 않는다.
// others: 내 다음 차례부터 순서대로 다른 사람들. theirs/opponent* 는 맞고용(첫 번째 다른 사람).
export function viewFor(state, seat) {
  const p = state.pending;
  const others = otherSeats(state, seat).map((o) => ({
    seat: o,
    handCount: state.hands[o].length,
    captured: [...state.captured[o]],
    score: scoreOf(state, o),
    goCount: state.goCount[o],
    shakes: [...state.shakes[o]],
    bombs: [...state.bombs[o]],
    gukjinAs: state.gukjinAs[o],
  }));
  const opp = others[0];
  const hideFloor = p?.type === 'sellGwang';
  return {
    you: seat,
    players: state.hands.length,
    hand: [...state.hands[seat]],
    others,
    opponentHandCount: opp.handCount,
    floor: hideFloor ? [] : [...state.floor],
    floorHidden: hideFloor ? state.floor.length : 0, // 4인: 광팔기를 정하는 동안 바닥은 덮여 있다
    sitOut: state.gwangSale ? structuredClone(state.gwangSale) : null,
    pileCount: state.pile.length,
    inFlight: inFlight(state),
    captured: { mine: [...state.captured[seat]], theirs: opp.captured },
    turn: state.turn,
    pending: !p ? null : p.player === seat ? { ...p } : { type: 'opponentDeciding', player: p.player, about: p.type },
    scores: { mine: scoreOf(state, seat), theirs: opp.score },
    goCount: { mine: state.goCount[seat], theirs: opp.goCount },
    shakes: { mine: [...state.shakes[seat]], theirs: opp.shakes },
    bombs: { mine: [...state.bombs[seat]], theirs: opp.bombs },
    flipOnly: state.flipOnly[seat],
    ppeokMonths: Object.keys(state.ppeokOwner).map(Number),
    ppeokBonus: structuredClone(state.ppeokBonus ?? {}),
    gukjinAs: { mine: state.gukjinAs[seat], theirs: opp.gukjinAs },
    carry: state.carry,
    result: state.result,
    legal: legalActions(state, seat),
  };
}
