import { RULES } from './rules-config.js';
import { scoreOf } from './score.js';

// 1고 +1, 2고 +2, 3고부터 (기본+2) × 2^(고−2)
export function goPoints(base, goCount) {
  const plus = Math.min(goCount, RULES.go.plusUpTo);
  if (goCount < RULES.go.doubleFrom) return base + plus;
  return (base + plus) * 2 ** (goCount - RULES.go.plusUpTo);
}

// 이긴 사람이 진 사람 각자에게서 받는다. 박은 진 사람마다 따로 본다.
// 맞고: 진 사람이 고를 불렀으면 고박 ×2.
// 3인: 진 사람 중 한 명만 고를 불렀으면 그 사람이 모두의 몫을 혼자 낸다(독박).
// 이긴 사람 다음 차례부터 진 사람들 (4인에서 광 판 자리는 빠진다)
const losersOf = (state, winner) => {
  const n = state.captured.length;
  return Array.from({ length: n - 1 }, (_, i) => (winner + 1 + i) % n).filter((s) => s !== state.out);
};

export function settle(state, winner) {
  const n = state.captured.length - (state.out != null ? 1 : 0); // 실제로 친 사람 수
  const sw = scoreOf(state, winner);
  const goCount = state.goCount[winner];
  const points = goPoints(sw.total, goCount);
  const bak = RULES.mult.bak;

  const winnerMult = [];
  for (let i = 0; i < state.shakes[winner].length; i++) winnerMult.push({ kind: 'shake', factor: RULES.mult.shake });
  for (let i = 0; i < state.bombs[winner].length; i++) winnerMult.push({ kind: 'bomb', factor: RULES.mult.bomb });

  const losers = losersOf(state, winner);
  const payments = losers.map((loser) => {
    const sl = scoreOf(state, loser);
    const multipliers = [...winnerMult];
    // 피박 판정에서는 진 사람의 국진을 진 사람에게 유리하게(피로) 센다
    const loserPi = Math.max(sl.counts.pi, scoreOf(state, loser, 'pi').counts.pi);
    if (sw.pi > 0 && loserPi <= RULES.bak.piMaxLoserPi) multipliers.push({ kind: 'piBak', factor: bak });
    if (sw.gwang > 0 && sl.counts.gwang === RULES.bak.gwangLoserGwang) multipliers.push({ kind: 'gwangBak', factor: bak });
    if (sw.counts.yeol >= RULES.bak.meongWinnerYeol) multipliers.push({ kind: 'meongBak', factor: bak });
    if (n === 2 && state.goCount[loser] > 0) multipliers.push({ kind: 'goBak', factor: bak });
    if (state.carry > 0) multipliers.push({ kind: 'nagari', factor: RULES.mult.nagari ** state.carry });
    return { from: loser, multipliers, amount: multipliers.reduce((x, m) => x * m.factor, points) };
  });

  if (n === 3) {
    const goers = payments.filter((p) => state.goCount[p.from] > 0);
    if (goers.length === 1) {
      const total = payments.reduce((x, p) => x + p.amount, 0);
      for (const p of payments) p.amount = 0;
      goers[0].amount = total;
      goers[0].dokbak = true;
    }
  }

  const final = payments.reduce((x, p) => x + p.amount, 0);
  // multipliers: 맞고 화면과 예전 테스트를 위한 첫 번째 진 사람의 배수
  return { base: sw.total, goCount, points, multipliers: payments[0].multipliers, payments, final };
}

// 대통령·쓰리뻑처럼 점수가 정해진 승리: 진 사람마다 같은 점수, 나가리 배수만 붙는다
export function settleSpecial(state, winner, points, special) {
  const losers = losersOf(state, winner);
  const multipliers = state.carry > 0 ? [{ kind: 'nagari', factor: RULES.mult.nagari ** state.carry }] : [];
  const payments = losers.map((from) => ({ from, multipliers: [...multipliers], amount: multipliers.reduce((x, m) => x * m.factor, points) }));
  const final = payments.reduce((x, p) => x + p.amount, 0);
  return { base: points, goCount: 0, points, multipliers: payments[0].multipliers, payments, final, special };
}
