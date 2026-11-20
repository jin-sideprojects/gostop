// 화투 48장. id 형식: m<월 두 자리>-<종류>
// kind: gwang(광) | yeol(열끗) | tti(띠) | pi(피)
// piValue: 피로 셀 때의 장수 (광·열끗·띠는 0, 일반 피 1, 쌍피 2)

const gwang = (month, extra = {}) => ({ id: `m${pad(month)}-gwang`, month, kind: 'gwang', piValue: 0, ...extra });
const yeol = (month, extra = {}) => ({ id: `m${pad(month)}-yeol`, month, kind: 'yeol', piValue: 0, ...extra });
const tti = (month, ribbon) => ({
  id: `m${pad(month)}-${ribbon ?? 'tti'}`,
  month,
  kind: 'tti',
  piValue: 0,
  ...(ribbon ? { ribbon } : {}),
});
const pi = (month, n) => ({ id: `m${pad(month)}-pi${n}`, month, kind: 'pi', piValue: 1 });
const ssangpi = (month) => ({ id: `m${pad(month)}-ssangpi`, month, kind: 'pi', piValue: 2 });

function pad(n) {
  return String(n).padStart(2, '0');
}

export const CARDS = [
  gwang(1), tti(1, 'hong'), pi(1, 1), pi(1, 2),
  yeol(2, { godori: true }), tti(2, 'hong'), pi(2, 1), pi(2, 2),
  gwang(3), tti(3, 'hong'), pi(3, 1), pi(3, 2),
  yeol(4, { godori: true }), tti(4, 'cho'), pi(4, 1), pi(4, 2),
  yeol(5), tti(5, 'cho'), pi(5, 1), pi(5, 2),
  yeol(6), tti(6, 'cheong'), pi(6, 1), pi(6, 2),
  yeol(7), tti(7, 'cho'), pi(7, 1), pi(7, 2),
  gwang(8), yeol(8, { godori: true }), pi(8, 1), pi(8, 2),
  yeol(9, { gukjin: true }), tti(9, 'cheong'), pi(9, 1), pi(9, 2),
  yeol(10), tti(10, 'cheong'), pi(10, 1), pi(10, 2),
  gwang(11), ssangpi(11), pi(11, 1), pi(11, 2),
  gwang(12, { biGwang: true }), yeol(12), tti(12), ssangpi(12),
];

// 보너스 피 (옵션): 월이 없는 피, 각각 2·2·3장으로 센다
export const BONUS_CARDS = [
  { id: 'b-2a', month: 0, kind: 'pi', piValue: 2, bonus: true },
  { id: 'b-2b', month: 0, kind: 'pi', piValue: 2, bonus: true },
  { id: 'b-3', month: 0, kind: 'pi', piValue: 3, bonus: true },
];

export const isBonus = (id) => id.startsWith('b-');

export const CARD_BY_ID = Object.fromEntries([...CARDS, ...BONUS_CARDS].map((c) => [c.id, c]));

export const monthOf = (id) => CARD_BY_ID[id].month;
