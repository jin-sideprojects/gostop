// 규칙 숫자는 여기에만 둔다. 바꾸려면 이 파일과 docs/rules.md, public/regeln.de.html을 같이 고친다.
export const RULES = Object.freeze({
  goStopMin: 7, // 맞고
  goStopMin3: 3, // 3인 고스톱 (4인도 3명이 친다)
  gwang: { three: 3, threeWithBi: 2, four: 4, five: 15 },
  godori: 5,
  biGodori: 10, // 옵션: 고도리 3장 + 12월 비 열끗(제비) = 새 4마리, 고도리 대신 이 점수
  dan: 3,
  yeol: { min: 5 },
  tti: { min: 5 },
  pi: { min: 10 },
  // 1고 +1, 2고 +2, 3고부터 (기본+2) × 2^(고−2)
  go: { plusUpTo: 2, doubleFrom: 3 },
  // 상대에게서 뺏는 피 장수
  steal: { firstPpeok: 1, ppeok: 1, jaPpeok: 2, ttadak: 1, jjok: 1, sweep: 1, bomb: 1, bonus: 1 },
  mult: { shake: 2, bomb: 2, bak: 2, nagari: 2 },
  bak: { piMaxLoserPi: 5, gwangLoserGwang: 0, meongWinnerYeol: 7 },
  gukjinPiValue: 2,
  president: 15, // 대통령: 처음 손에 같은 월 4장
  firstPpeokSteal: 1, // 첫뻑: 첫 차례 뻑이면 모두에게서 피 1장
  threePpeok: 3, // 쓰리뻑: 이만큼 뻑하면 기본점수로 승리
  gwangSale: { perGwang: 1 }, // 4인 광팔기: 치는 세 사람이 각자 광 1장당 이만큼 낸다 (비광 혼자면 0)
});
