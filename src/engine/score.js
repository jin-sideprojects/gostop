import { CARD_BY_ID } from './cards.js';
import { RULES } from './rules-config.js';

const over = (count, min) => (count >= min ? count - min + 1 : 0);

// 먹은 패의 점수. gukjinAs: 국진(9월 열끗)을 'yeol' 또는 'pi'로 센다.
// opts.biGodori: 비고도리(새 4마리) 규칙을 쓸지
export function scoreCaptured(ids, gukjinAs = 'yeol', opts = {}) {
  const cards = ids.map((id) => CARD_BY_ID[id]);
  const gwangCards = cards.filter((c) => c.kind === 'gwang');
  const yeolCards = cards.filter((c) => c.kind === 'yeol' && !(c.gukjin && gukjinAs === 'pi'));
  const ttiCards = cards.filter((c) => c.kind === 'tti');
  let piCount = cards.filter((c) => c.kind === 'pi').reduce((n, c) => n + c.piValue, 0);
  if (gukjinAs === 'pi' && cards.some((c) => c.gukjin)) piCount += RULES.gukjinPiValue;

  const g = gwangCards.length;
  let gwang = 0;
  if (g === 5) gwang = RULES.gwang.five;
  else if (g === 4) gwang = RULES.gwang.four;
  else if (g === 3) gwang = gwangCards.some((c) => c.biGwang) ? RULES.gwang.threeWithBi : RULES.gwang.three;

  const birds = cards.filter((c) => c.godori).length;
  const swallow = opts.biGodori && ids.includes('m12-yeol');
  const godori = birds === 3 ? (swallow ? RULES.biGodori : RULES.godori) : 0;
  const dan = (r) => (ttiCards.filter((c) => c.ribbon === r).length === 3 ? RULES.dan : 0);
  const hong = dan('hong');
  const cheong = dan('cheong');
  const cho = dan('cho');
  const yeol = over(yeolCards.length, RULES.yeol.min);
  const tti = over(ttiCards.length, RULES.tti.min);
  const pi = over(piCount, RULES.pi.min);

  return {
    gwang, godori, hong, cheong, cho, yeol, tti, pi,
    total: gwang + godori + hong + cheong + cho + yeol + tti + pi,
    counts: { gwang: g, yeol: yeolCards.length, tti: ttiCards.length, pi: piCount },
  };
}

// 게임 상태에 맞는 점수 규칙
export const scoreOpts = (state) => ({ biGodori: Boolean(state.biGodori) });
export const scoreOf = (state, seat, gukjinAs = state.gukjinAs[seat]) => scoreCaptured(state.captured[seat], gukjinAs, scoreOpts(state));
