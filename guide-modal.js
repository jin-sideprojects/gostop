import { CARDS, BONUS_CARDS } from './src/engine/cards.js';
import { cardInfo, cardSvg } from './cards-svg.js';
import { getLang, T } from './i18n.js';

const MONTHS = {
  ko: [
    '', '1월 · 송학 (소나무와 학)', '2월 · 매조 (매화와 꾀꼬리)', '3월 · 벚꽃과 장막',
    '4월 · 흑싸리와 두견새', '5월 · 난초와 팔교', '6월 · 모란과 나비',
    '7월 · 홍싸리와 멧돼지', '8월 · 공산명월과 기러기', '9월 · 국화와 술잔',
    '10월 · 단풍과 사슴', '11월 · 오동과 봉황', '12월 · 비와 제비',
  ],
  en: [
    '', 'Jan · Pine & Crane', 'Feb · Plum Blossom & Warbler', 'Mar · Cherry Blossom & Curtain',
    'Apr · Wisteria & Cuckoo', 'May · Iris & Bridge', 'Jun · Peony & Butterflies',
    'Jul · Bush Clover & Boar', 'Aug · Full Moon & Geese', 'Sep · Chrysanthemum & Sake Cup',
    'Oct · Maple & Deer', 'Nov · Paulownia & Phoenix', 'Dec · Rain, Willow & Swallow',
  ],
  de: [
    '', 'Jan · Kiefer & Kranich', 'Feb · Pflaume & Buschsänger', 'Mär · Kirschblüte & Vorhang',
    'Apr · Glyzinie & Kuckuck', 'Mai · Schwertlilie & Brücke', 'Jun · Pfingstrose & Schmetterling',
    'Jul · Buschklee & Wildschwein', 'Aug · Vollmond & Wildgänse', 'Sep · Chrysantheme & Schale',
    'Okt · Ahorn & Hirsch', 'Nov · Paulownie & Phönix', 'Dez · Regen & Schwalbe',
  ],
};

const TEXTS = {
  ko: {
    title: '핵심 규칙 & 48장 화투 도감',
    tabRules: '핵심 규칙 & 점수표',
    tabEnc: '48장 화투 도감',
    filters: { all: '전체', gwang: '광 (5)', godori: '고도리 (새)', dan: '홍·청·초단', ssangpi: '쌍피·보너스' },
    bonusTitle: '보너스 패 (옵션)',
    goalTitle: '30초 게임 목표',
    goalDesc: '바닥과 손패의 같은 달을 맞춰 패를 모읍니다. 목표 점수(2인 맞고 7점 / 3·4인 고스톱 3점)에 도달하면 <b>스톱</b>(승리 확정) 또는 <b>고</b>(추가 점수·배수 도전)를 선택합니다.',
    scoreTitle: '점수 계산 요약표',
    scoreRows: [
      ['광 (Brights)', '5광 15점 · 4광 4점 · 3광 3점 (비광 포함 시 2점)'],
      ['열끗 (Animals)', '5장부터 1점 (추가 1장당 +1점) · 고도리(2·4·8월 새 3장) 5점'],
      ['띠 (Ribbons)', '5장부터 1점 (추가 1장당 +1점) · 홍단/청단/초단 각 3점'],
      ['피 (Junk)', '10장부터 1점 (추가 1장당 +1점) · 쌍피는 2장, 9월 국진은 피 전환 가능'],
    ],
    multTitle: '고(Go) 보너스 & 박(Bak) 페널티',
    multRows: [
      ['고(Go) 보너스', '1고 +1점, 2고 +2점, 3고부터 (기본+2) × 2^(고−2)'],
      ['피박 (×2)', '승자가 피로 점수 냈을 때 패자 피 5장 이하'],
      ['광박 (×2)', '승자가 광으로 점수 냈을 때 패자 광 0장'],
      ['멍박 / 고박 (×2)', '승자 열끗 7장 이상(멍박) / 고 선언 후 역전패(고박)'],
    ],
    fullRulesLink: '전체 상세 규칙 페이지 열기 ↗',
    tags: { gwang: '광', yeol: '열끗', tti: '띠', pi: '피', ssangpi: '쌍피', bonus: '보너스', godori: '고도리', biGwang: '비광', biGodori: '비고도리', gukjin: '국진(열끗/쌍피)', hong: '홍단', cheong: '청단', cho: '초단', ttiOnly: '비띠' },
  },
  en: {
    title: 'Core Rules & 48-Card Hwatu Guide',
    tabRules: 'Rules & Scoring',
    tabEnc: '48-Card Guide',
    filters: { all: 'All', gwang: 'Brights (5)', godori: 'Godori (Birds)', dan: 'Trios (Dan)', ssangpi: '2× Junk & Bonus' },
    bonusTitle: 'Bonus Cards (Optional)',
    goalTitle: '30-Second Overview',
    goalDesc: 'Match cards of the same month from your hand and the floor. Once you reach the target score (<b>7 pts</b> in 2P Matgo, <b>3 pts</b> in 3P/4P Go-Stop), choose <b>Stop</b> to win or <b>Go</b> to risk for higher multipliers.',
    scoreTitle: 'Scoring Summary',
    scoreRows: [
      ['Brights (Gwang)', '5 Brights: 15 pts · 4 Brights: 4 pts · 3 Brights: 3 pts (2 pts with Rain)'],
      ['Animals (Yeol)', '5+ cards: 1 pt (+1 each extra) · Godori (Feb/Apr/Aug birds): 5 pts'],
      ['Ribbons (Tti)', '5+ cards: 1 pt (+1 each extra) · Red/Blue/Grass Poetry Trios: +3 pts each'],
      ['Junk (Pi)', '10+ cards: 1 pt (+1 each extra) · Double Junk counts as 2; Sep Cup switches'],
    ],
    multTitle: 'Go Bonus & Bak Multipliers',
    multRows: [
      ['Go Bonus', '1 Go: +1 pt · 2 Go: +2 pts · 3+ Go: (base + 2) × 2^(Go−2)'],
      ['Junk Penalty (×2)', 'Winner scores on Junk while loser holds 5 or fewer Junk'],
      ['Bright Penalty (×2)', 'Winner scores on Brights while loser has 0 Brights'],
      ['Animal / Go-Bak (×2)', 'Winner has 7+ Animals / Loser called Go earlier'],
    ],
    fullRulesLink: 'Open full detailed rules page ↗',
    tags: { gwang: 'Bright', yeol: 'Animal', tti: 'Ribbon', pi: 'Junk', ssangpi: '2× Junk', bonus: 'Bonus', godori: 'Godori', biGwang: 'Rain Bright', biGodori: 'Bi-Godori', gukjin: 'Cup (Animal/2×)', hong: 'Red Trio', cheong: 'Blue Trio', cho: 'Grass Trio', ttiOnly: 'Plain Ribbon' },
  },
  de: {
    title: 'Regeln & 48-Karten-Hwatu-Führer',
    tabRules: 'Regeln & Punkte',
    tabEnc: '48-Karten-Lexikon',
    filters: { all: 'Alle', gwang: 'Lichter (5)', godori: 'Godori (Vögel)', dan: 'Bänder-Trios', ssangpi: 'Doppelspreu & Bonus' },
    bonusTitle: 'Bonuskarten (Optional)',
    goalTitle: 'Spielziel in 30 Sekunden',
    goalDesc: 'Sammle passende Karten desselben Monats vom Tisch. Sobald du <b>7 Punkte</b> (Matgo) bzw. <b>3 Punkte</b> (Go-Stop zu 3/4) erreichst, wähle <b>Stopp</b> zum Sieg oder <b>Go</b> für höhere Multiplikatoren.',
    scoreTitle: 'Punkteübersicht',
    scoreRows: [
      ['Lichter (Gwang)', '5 Lichter: 15 Pkt · 4 Lichter: 4 Pkt · 3 Lichter: 3 Pkt (2 Pkt mit Regen)'],
      ['Tiere (Yeol)', 'Ab 5 Karten: 1 Pkt (+1 je weitere) · Godori (Vögel Feb/Apr/Aug): 5 Pkt'],
      ['Bänder (Tti)', 'Ab 5 Karten: 1 Pkt (+1 je weitere) · Rot/Blau/Grün-Trios: je +3 Pkt'],
      ['Spreu (Pi)', 'Ab 10 Karten: 1 Pkt (+1 je weitere) · Doppelspreu zählt 2; Sep-Schale wählbar'],
    ],
    multTitle: 'Go-Bonus & Strafmultiplikatoren (Bak)',
    multRows: [
      ['Go-Bonus', '1 Go: +1 Pkt · 2 Go: +2 Pkt · Ab 3 Go: (Basis + 2) × 2^(Go−2)'],
      ['Spreu-Strafe (×2)', 'Sieger punktet mit Spreu, Verlierer hat höchstens 5 Spreu'],
      ['Licht-Strafe (×2)', 'Sieger punktet mit Lichtern, Verlierer hat 0 Lichter'],
      ['Tier- / Go-Strafe (×2)', 'Sieger hat 7+ Tiere / Verlierer hatte zuvor Go gerufen'],
    ],
    fullRulesLink: 'Ausführliche Regel-Seite öffnen ↗',
    tags: { gwang: 'Licht', yeol: 'Tier', tti: 'Band', pi: 'Spreu', ssangpi: '2× Spreu', bonus: 'Bonus', godori: 'Godori', biGwang: 'Regenlicht', biGodori: 'Bi-Godori', gukjin: 'Schale (Tier/2×)', hong: 'Rot-Trio', cheong: 'Blau-Trio', cho: 'Grün-Trio', ttiOnly: 'Regenband' },
  },
};

function cardTags(id, tags) {
  const info = cardInfo(id);
  const list = [];
  if (info.bonus) return [[tags.bonus, 'gold'], [`+${info.piValue}`, 'pi']];
  if (info.kind === 'gwang') list.push([info.biGwang ? tags.biGwang : tags.gwang, 'gold']);
  else if (info.kind === 'yeol') list.push([tags.yeol, 'yeol']);
  else if (info.kind === 'tti') list.push([tags.tti, 'tti']);
  else list.push([info.piValue === 2 ? tags.ssangpi : tags.pi, info.piValue === 2 ? 'gold' : 'pi']);

  if (info.godori) list.push([tags.godori, 'bird']);
  if (id === 'm12-yeol') list.push([tags.biGodori, 'bird']);
  if (info.gukjin) list.push([tags.gukjin, 'special']);
  if (info.ribbon) list.push([tags[info.ribbon], `rib-${info.ribbon}`]);
  else if (info.kind === 'tti') list.push([tags.ttiOnly, 'tti']);
  return list;
}

function matchesFilter(id, filter) {
  if (filter === 'all') return true;
  const info = cardInfo(id);
  if (filter === 'gwang') return info.kind === 'gwang';
  if (filter === 'godori') return info.godori || id === 'm12-yeol';
  if (filter === 'dan') return Boolean(info.ribbon);
  if (filter === 'ssangpi') return info.piValue >= 2 || info.gukjin;
  return true;
}

function renderRulesTab(tx) {
  const table = (rows) => `<table class="rules-table">${rows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}</table>`;
  return `<div class="guide-rules">
    <div class="guide-box"><h3>${tx.goalTitle}</h3><p>${tx.goalDesc}</p></div>
    <h3>${tx.scoreTitle}</h3>${table(tx.scoreRows)}
    <h3>${tx.multTitle}</h3>${table(tx.multRows)}
    <p class="guide-ext"><a href="${T.rulesHref}" target="_blank" rel="noopener">${tx.fullRulesLink}</a></p>
  </div>`;
}

function renderEncyclopediaTab(tx, lang, filter) {
  const filters = Object.entries(tx.filters)
    .map(([k, lbl]) => `<button class="guide-filter${filter === k ? ' active' : ''}" data-filter="${k}">${lbl}</button>`)
    .join('');

  const sections = [];
  for (let m = 1; m <= 12; m++) {
    const cards = CARDS.filter((c) => c.month === m && matchesFilter(c.id, filter));
    if (!cards.length) continue;
    sections.push(`<section class="enc-month">
      <h3>${MONTHS[lang][m]}</h3>
      <div class="enc-grid">${cards.map((c) => encCardHtml(c.id, tx.tags)).join('')}</div>
    </section>`);
  }
  const bonus = BONUS_CARDS.filter((c) => matchesFilter(c.id, filter));
  if (bonus.length) {
    sections.push(`<section class="enc-month">
      <h3>${tx.bonusTitle}</h3>
      <div class="enc-grid">${bonus.map((c) => encCardHtml(c.id, tx.tags)).join('')}</div>
    </section>`);
  }
  return `<div class="guide-filters">${filters}</div><div class="enc-list">${sections.join('')}</div>`;
}

function encCardHtml(id, tags) {
  const badges = cardTags(id, tags).map(([txt, cls]) => `<span class="enc-badge ${cls}">${txt}</span>`).join('');
  return `<div class="enc-card"><div class="enc-art">${cardSvg(id)}</div><div class="enc-meta">${badges}</div></div>`;
}

/**
 * 핵심 규칙 & 48장 화투 도감 모달을 연다.
 * @param {'rules'|'encyclopedia'} [initialTab='rules']
 */
export function openGuideModal(initialTab = 'rules') {
  document.getElementById('guide-modal')?.remove();
  let tab = initialTab;
  let filter = 'all';

  const el = document.createElement('div');
  el.id = 'guide-modal';
  el.className = 'overlay';
  document.body.append(el);

  const draw = () => {
    const lang = getLang();
    const tx = TEXTS[lang] ?? TEXTS.en;
    el.innerHTML = `<div class="sheet guide-sheet" role="dialog" aria-modal="true">
      <div class="guide-head">
        <h2>${tx.title}</h2>
        <button class="guide-close" id="guide-close" aria-label="${T.close}">×</button>
      </div>
      <div class="guide-tabs">
        <button class="guide-tab${tab === 'rules' ? ' active' : ''}" data-tab="rules">${tx.tabRules}</button>
        <button class="guide-tab${tab === 'encyclopedia' ? ' active' : ''}" data-tab="encyclopedia">${tx.tabEnc}</button>
      </div>
      <div class="guide-body">${tab === 'rules' ? renderRulesTab(tx) : renderEncyclopediaTab(tx, lang, filter)}</div>
    </div>`;
  };

  el.addEventListener('click', (ev) => {
    if (ev.target === el || ev.target.closest('#guide-close')) return el.remove();
    const tBtn = ev.target.closest('[data-tab]');
    if (tBtn) { tab = tBtn.dataset.tab; return draw(); }
    const fBtn = ev.target.closest('[data-filter]');
    if (fBtn) { filter = fBtn.dataset.filter; draw(); }
  });

  draw();
}
