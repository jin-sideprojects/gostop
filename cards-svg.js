// Karten-Infos aus der id (m09-yeol → Monat 9, Tier) und Kartenbilder nach den
// traditionellen Hwatu-Motiven, als einfache eigene SVG-Zeichnungen.
import { T } from './i18n.js';

export function cardInfo(id) {
  if (id.startsWith('b-')) return { id, month: 0, kind: 'pi', piValue: id === 'b-3' ? 3 : 2, part: 'bonus', bonus: true };
  const month = Number(id.slice(1, 3));
  const part = id.slice(4);
  const info = { id, month, kind: 'pi', piValue: 1, part };
  if (part === 'gwang') Object.assign(info, { kind: 'gwang', piValue: 0, biGwang: month === 12 });
  else if (part === 'yeol') Object.assign(info, { kind: 'yeol', piValue: 0, godori: [2, 4, 8].includes(month), gukjin: month === 9 });
  else if (['hong', 'cheong', 'cho', 'tti'].includes(part)) Object.assign(info, { kind: 'tti', piValue: 0, ribbon: part === 'tti' ? null : part });
  else if (part === 'ssangpi') info.piValue = 2;
  return info;
}

const INK = '#1d1a17';
const RED = '#c8202b';
export const RIBBON = { hong: '#c8202b', cheong: '#1f4c9e', cho: '#2e8b3e', null: '#b5532a' };
const FACE = '#fffaf0';

// ---------- kleine Zeichenhelfer ----------
const c = (x, y, r, f, extra = '') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}" ${extra}/>`;
const e = (x, y, rx, ry, f, extra = '') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${f}" ${extra}/>`;
const p = (d, f, extra = '') => `<path d="${d}" fill="${f}" ${extra}/>`;
const line = (d, stroke, w) => `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round"/>`;

function blossom(x, y, r, petal, center) {
  let s = '';
  for (let i = 0; i < 5; i++) {
    const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
    s += c((x + Math.cos(a) * r * 0.55).toFixed(1), (y + Math.sin(a) * r * 0.55).toFixed(1), (r * 0.5).toFixed(1), petal);
  }
  return s + c(x, y, (r * 0.28).toFixed(1), center);
}
function pineClump(x, y, w) {
  return e(x, y, w, w * 0.45, '#1f5a34') + e(x, y - w * 0.12, w * 0.8, w * 0.3, '#2f7a45') + line(`M${x - w * 0.6} ${y} H${x + w * 0.6}`, '#16402a', 0.8);
}
function maple(x, y, s, f) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const r = i % 2 === 0 ? s : s * 0.45;
    pts.push(`${(x + Math.cos(a) * r).toFixed(1)} ${(y + Math.sin(a) * r).toFixed(1)}`);
  }
  return p(`M${pts.join(' L')}Z`, f);
}
function ribbon(color, { text = false, x = 30, y = 10, angle = 0 } = {}) {
  const marks = text
    ? `<path d="M${x - 2} ${y + 8} h4 M${x} ${y + 6} v8 M${x - 2.5} ${y + 18} h5 M${x - 1} ${y + 16} l2 6 M${x - 2} ${y + 28} h4 M${x} ${y + 26} v7" stroke="${INK}" stroke-width="1.3" fill="none"/>`
    : '';
  return `<g transform="rotate(${angle} ${x} ${y + 20})"><path d="M${x - 5} ${y} H${x + 5} V${y + 38} L${x} ${y + 34} L${x - 5} ${y + 38}Z" fill="${color}" stroke="rgba(0,0,0,.35)" stroke-width="0.6"/>${marks}</g>`;
}
function bird(x, y, s, body, wing, flip = false) {
  const t = flip ? `translate(${x * 2} 0) scale(-1 1)` : '';
  return `<g transform="${t}">${e(x, y, 7 * s, 4.5 * s, body)}${c(x + 6 * s, y - 3 * s, 3 * s, body)}${p(`M${x + 8.5 * s} ${y - 3.5 * s} l3 ${1 * s} l-3 ${1 * s}Z`, '#e0a020')}${c(x + 6.8 * s, y - 3.6 * s, 0.7 * s, INK)}${p(`M${x - 4 * s} ${y - 1 * s} Q${x} ${y - 9 * s} ${x + 3 * s} ${y - 1 * s}Z`, wing)}${p(`M${x - 6 * s} ${y} l-6 ${-3 * s} l1 ${5 * s}Z`, wing)}</g>`;
}

// ---------- Motive pro Monat: Grundbild (Pflanze) ----------
// ---------- Motive pro Monat im Tuschestil (수묵화): Tusche + eine Akzentfarbe pro Monat ----------
const SUMI = '#1d1a17';
const WASH = 'rgba(29,26,23,.18)';
const brush = (d, w, col = SUMI, op = 1) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" opacity="${op}"/>`;
// spitz zulaufendes Blatt / Pinselstrich zwischen zwei Punkten
const blade = (x1, y1, cx, cy, x2, y2, wdt, col = SUMI) => p(`M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2} Q${cx + wdt} ${cy + wdt} ${x1} ${y1}Z`, col);
const inkDab = (x, y, rx, ry, rot = 0, col = SUMI, op = 0.9) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${col}" opacity="${op}" transform="rotate(${rot} ${x} ${y})"/>`;
const mx = (v, x) => (v ? 60 - x : x); // pi2 gespiegelt

const BASE = {
  // 1 松 Kiefer: dicker Tuschestamm, flache Nadelwolken, rote Sonne
  1: (v) => `${c(mx(v, 44), 18, 11, '#c8202b', 'opacity=".9"')}
    ${brush(`M${mx(v, 18)} 78 Q${mx(v, 22)} 60 ${mx(v, 30)} 50 Q${mx(v, 36)} 40 ${mx(v, 30)} 28`, 5)}
    ${brush(`M${mx(v, 29)} 50 Q${mx(v, 42)} 46 ${mx(v, 50)} 48`, 2.4)}
    ${[[mx(v, 30), 26, 16], [mx(v, 46), 44, 13], [mx(v, 16), 46, 12], [mx(v, 30), 64, 15]].map(([x, y, w]) => `${inkDab(x, y, w, 4.5, -4)}${inkDab(x + 2, y - 3, w * 0.75, 3, -4, '#2f5a3a', 0.85)}${brush(`M${x - w * 0.8} ${y + 2} h${w * 1.6}`, 0.8, '#000', 0.6)}`).join('')}`,
  // 2 梅 Pflaume: knorriger Zickzack-Ast, rote Blüten
  2: (v) => `${brush(`M${mx(v, 4)} 74 L${mx(v, 18)} 58 L${mx(v, 14)} 46 L${mx(v, 30)} 34 L${mx(v, 28)} 22 L${mx(v, 46)} 10`, 4)}
    ${brush(`M${mx(v, 18)} 58 L${mx(v, 36)} 60 L${mx(v, 48)} 50`, 2.2)}
    ${[[14, 44], [30, 33], [26, 20], [44, 10], [36, 60], [50, 48]].map(([x, y]) => blossom(mx(v, x), y, 6.5, '#d6334a', '#f6d24a')).join('')}
    ${[[22, 52], [40, 22]].map(([x, y]) => c(mx(v, x), y, 2, '#d6334a')).join('')}`,
  // 3 櫻 Kirsche: rosa Blütenwolken über Nebelbändern, ohne Ast
  3: (v) => `${p('M0 46 Q20 40 34 46 T60 44 V52 Q40 48 26 54 T0 52Z', WASH)}${p('M0 64 Q24 58 40 64 T60 62 V68 Q36 64 18 70 T0 70Z', WASH)}
    ${[[10, 14], [24, 10], [38, 14], [52, 10], [16, 26], [32, 24], [48, 26], [8, 36], [24, 36], [42, 38], [56, 36]].map(([x, y], i) => blossom(mx(v, x), y + (i % 2), 6, i % 3 ? '#f6b8c8' : '#f19ab2', '#c8202b')).join('')}`,
  // 4 藤 Glyzinie (흑싸리): schwarze hängende Trauben an feinen Ranken
  4: (v) => `${brush('M0 4 Q30 10 60 3', 2.2)}
    ${[6, 17, 28, 39, 50].map((x, i) => { const len = 36 + (i % 2) * 14; let d = ''; for (let k = 0; k < 7; k++) d += inkDab(mx(v, x) + (k % 2 ? 2 : -2), 10 + k * (len / 7), 3.2 - k * 0.25, 2.2, 0); return brush(`M${mx(v, x)} 6 Q${mx(v, x + 3)} ${len / 2} ${mx(v, x)} ${len + 8}`, 1, SUMI, 0.7) + d; }).join('')}
    ${brush('M2 76 Q30 66 58 76', 2.4, SUMI, 0.8)}`,
  // 5 蘭 Orchidee/Iris: lange geschwungene Tuscheblätter (사군자 난초), violette Blüten
  5: (v) => `${blade(mx(v, 10), 78, mx(v, 6), 30, mx(v, 34), 6, v ? -2.6 : 2.6)}${blade(mx(v, 18), 78, mx(v, 30), 34, mx(v, 56), 22, v ? -2.4 : 2.4)}
    ${blade(mx(v, 24), 78, mx(v, 20), 50, mx(v, 6), 40, v ? 2 : -2)}${blade(mx(v, 30), 78, mx(v, 44), 58, mx(v, 58), 56, v ? -1.8 : 1.8)}
    ${[[mx(v, 36), 30], [mx(v, 46), 42]].map(([x, y]) => `${e(x, y, 4, 6.5, '#6a3fa0')}${e(x - 4.5, y + 3, 3.4, 2, '#8d63c4')}${e(x + 4.5, y + 3, 3.4, 2, '#8d63c4')}${c(x, y + 1, 1.2, '#f2c23c')}`).join('')}`,
  // 6 牡丹 Pfingstrose: große rote Blüte, Tuscheblätter
  6: (v) => `${blade(mx(v, 6), 72, mx(v, 10), 56, mx(v, 26), 54, 3)}${blade(mx(v, 54), 74, mx(v, 50), 58, mx(v, 36), 56, -3)}${blade(mx(v, 30), 78, mx(v, 24), 66, mx(v, 30), 58, 2)}
    ${[16, 12, 8].map((r, i) => c(mx(v, 32), 36, r, ['#9e0f26', '#c8202b', '#e04a5f'][i])).join('')}
    ${[0, 1, 2, 3, 4].map((i) => { const a = (i * 2 * Math.PI) / 5; return e((mx(v, 32) + Math.cos(a) * 11).toFixed(1), (36 + Math.sin(a) * 11).toFixed(1), 6, 4, '#b3122e', `transform="rotate(${i * 72} ${(mx(v, 32) + Math.cos(a) * 11).toFixed(1)} ${(36 + Math.sin(a) * 11).toFixed(1)})"`); }).join('')}
    ${c(mx(v, 32), 36, 4, '#f2c23c')}${c(mx(v, 50), 14, 5, '#c8202b', 'opacity=".8"')}`,
  // 7 萩 Buschklee: dunkler Erdhügel, feine braune Bögen mit roten Blättchen
  7: (v) => `${p('M0 78 V66 Q20 58 34 64 Q48 70 60 62 V78Z', SUMI, 'opacity=".85"')}
    ${[[4, 66, 40, 8, 58, 14], [12, 66, 30, 22, 56, 32], [20, 66, 16, 30, 4, 18]].map(([x1, y1, cx, cy, x2, y2]) => brush(`M${mx(v, x1)} ${y1} Q${mx(v, cx)} ${cy} ${mx(v, x2)} ${y2}`, 1.4, '#7a4a2a')).join('')}
    ${[[18, 44], [26, 30], [36, 20], [46, 14], [30, 46], [42, 34], [50, 30], [12, 34], [8, 24]].map(([x, y]) => inkDab(mx(v, x), y, 2.6, 1.6, 30, '#c8202b', 1) + inkDab(mx(v, x) + 2.4, y + 2.6, 1.6, 1.1, -20, '#7a8a3a', 1)).join('')}`,
  // 8 月 Mond-Monat: roter Himmel, schwarzer Hügel mit Grasstrichen
  8: () => `${p('M0 0 H60 V44 H0Z', '#c8202b')}${p('M0 46 Q30 24 60 46 V78 H0Z', SUMI)}
    ${[6, 13, 20, 27, 34, 41, 48, 55].map((x, i) => brush(`M${x} 60 Q${x + 2} ${46 - (i % 3) * 3} ${x + 7} ${36 + (i % 2) * 4}`, 0.9, '#5a5a5a')).join('')}`,
  // 9 菊 Chrysantheme (사군자 국화): goldene Blüten, Tuscheblätter
  9: (v) => `${brush(`M${mx(v, 30)} 78 Q${mx(v, 28)} 60 ${mx(v, 30)} 40 M${mx(v, 30)} 62 Q${mx(v, 18)} 56 ${mx(v, 14)} 46 M${mx(v, 30)} 56 Q${mx(v, 42)} 50 ${mx(v, 46)} 40`, 1.8)}
    ${[[mx(v, 20), 64], [mx(v, 40), 66], [mx(v, 22), 52]].map(([x, y]) => blade(x - 6, y, x, y - 8, x + 7, y - 2, 2.4)).join('')}
    ${[[mx(v, 30), 32, 12], [mx(v, 13), 42, 8], [mx(v, 47), 36, 8]].map(([x, y, r]) => petals(x, y, r, '#f2b51e', '#d3561a')).join('')}`,
  // 10 楓 Ahorn: großer roter Ahorn an Tuscheast
  10: (v) => `${brush(`M${mx(v, 0)} 10 Q${mx(v, 26)} 20 ${mx(v, 60)} 8 M${mx(v, 26)} 18 Q${mx(v, 30)} 34 ${mx(v, 22)} 50`, 2.4)}
    ${[[10, 18, 9, '#b3122e'], [30, 28, 11, '#d8341f'], [50, 16, 9, '#b3122e'], [18, 46, 8, '#e0601e'], [40, 48, 9, '#d8341f'], [28, 66, 7, '#e0901e']].map(([x, y, sz, col]) => maple(mx(v, x), y, sz, col)).join('')}`,
  // 11 桐 Paulownie
  11: (v) => paulownia(v),
  // 12 雨 Regen: Weidenruten in Tusche, schräger grauer Regen
  12: (v) => `${p('M0 0 H60 V78 H0Z', 'rgba(90,110,140,.10)')}
    ${brush(`M${mx(v, 50)} 0 Q${mx(v, 42)} 30 ${mx(v, 48)} 78`, 2.6)}
    ${[0, 1, 2, 3, 4, 5].map((i) => brush(`M${mx(v, 48 - i)} ${6 + i * 10} Q${mx(v, 34 - i * 2)} ${14 + i * 10} ${mx(v, 26 - i)} ${26 + i * 11}`, 1.2, '#2f5a3a')).join('')}
    ${[[8, 6], [20, 16], [12, 34], [26, 46], [8, 58], [34, 26], [18, 64]].map(([x, y]) => brush(`M${mx(v, x)} ${y} l-3 8`, 1, '#5a7fb0')).join('')}`,
};

// Hintergrund: Reispapier, großes blasses Schriftzeichen des Monats
const KANJI = ['', '松', '梅', '櫻', '藤', '蘭', '牡', '萩', '月', '菊', '楓', '桐', '雨'];
function paper(month) {
  return `<rect x="0" y="0" width="60" height="80" fill="#f7f1e3"/><text x="30" y="58" text-anchor="middle" font-size="44" font-weight="700" fill="${SUMI}" opacity=".07" font-family="'Noto Serif CJK KR','Noto Serif KR','Batang','SimSun',serif">${KANJI[month]}</text>`;
}
// rotes Siegel unten rechts im Bild
function seal(month) {
  return `<rect x="47" y="64" width="10" height="11" rx="1.2" fill="#b3122e" opacity=".88"/><text x="52" y="72.6" text-anchor="middle" font-size="7.5" fill="#fff7e8" font-family="'Noto Serif CJK KR','Noto Serif KR','Batang','SimSun',serif">${KANJI[month]}</text>`;
}

function petals(x, y, r, f, center) {
  let s = '';
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    const px = (x + Math.cos(a) * r * 0.6).toFixed(1);
    const py = (y + Math.sin(a) * r * 0.6).toFixed(1);
    s += e(px, py, (r * 0.45).toFixed(1), (r * 0.2).toFixed(1), f, `transform="rotate(${i * 30} ${px} ${py})"`);
  }
  return s + c(x, y, (r * 0.35).toFixed(1), center);
}

// ---------- Besondere Bilder: Lichter, Tiere, Bänder, Doppelspreu ----------
const SPECIAL = {
  'm01-gwang': () => `${c(38, 20, 14, RED)}${BASE[1](0)}${crane(20, 40)}`,
  'm03-gwang': () => `${BASE[3]()}${curtain()}`,
  'm08-gwang': () => `${BASE[8]()}${c(30, 22, 13, '#fff6dc')}`,
  'm11-gwang': () => `${BASE[11](0)}${phoenix()}`,
  'm12-gwang': () => `${p('M0 0 H60 V78 H0Z', '#2a2a2a')}${line('M48 0 Q38 30 46 78', '#5a5a5a', 2)}${rainMan()}`,
  'm02-yeol': () => `${BASE[2](0)}<g class="bird">${warbler(30, 34)}</g>`,
  'm04-yeol': () => `${BASE[4](0)}${c(44, 48, 10, RED)}<g class="bird">${cuckoo(28, 52)}</g>`,
  'm05-yeol': () => `${BASE[5](0)}${bridge()}`,
  'm06-yeol': () => `${BASE[6](0)}${butterfly(16, 18, 1)}${butterfly(46, 24, 0.8)}`,
  'm07-yeol': () => `${BASE[7](0)}${boar()}`,
  'm08-yeol': () => `${BASE[8]()}<g class="bird">${goose(14, 14, 1.15)}${goose(42, 9, 1.2)}${goose(27, 23, 1.3)}</g>`,
  'm09-yeol': () => `${BASE[9](1)}${sakeCup()}`,
  'm10-yeol': () => `${BASE[10](0)}${deer()}`,
  'm12-yeol': () => `${BASE[12](1)}<g class="bird">${swallow(30, 40)}</g>`,
  'm12-tti': () => `${BASE[12](1)}${ribbon(RIBBON.null, { x: 28, y: 18, angle: -10 })}`,
  'm11-ssangpi': () => `${p('M0 0 H60 V78 H0Z', '#f2d23a')}${BASE[11](1)}`,
  'm12-ssangpi': () => thunderDrum(),
  'b-2a': () => bonusArt(2),
  'b-2b': () => bonusArt(2),
  'b-3': () => bonusArt(3),
};

function crane(x, y) {
  return `${e(x, y + 10, 9, 6, '#fff')}${p(`M${x - 8} ${y + 10} q-6 6 -2 12 l8 -6Z`, INK)}${line(`M${x + 6} ${y + 6} Q${x + 10} ${y - 6} ${x + 4} ${y - 14}`, '#fff', 3)}${line(`M${x + 6} ${y + 6} Q${x + 10} ${y - 6} ${x + 4} ${y - 14}`, INK, 1)}${c(x + 4, y - 15, 2.6, '#fff')}${c(x + 4, y - 17, 1.4, RED)}${p(`M${x + 6} ${y - 15} l6 1 l-6 1Z`, '#5a4a2a')}${line(`M${x - 2} ${y + 16} v10 M${x + 2} ${y + 16} v10`, INK, 1)}`;
}
function curtain() {
  let stripes = '';
  for (let i = 0; i < 6; i++) stripes += p(`M${4 + i * 9} 50 h9 v22 h-9Z`, i % 2 ? '#fff' : RED);
  return `${stripes}${line('M4 50 H58', INK, 1.5)}${[8, 26, 44].map((x) => c(x + 4, 61, 3, 'none', `stroke="${INK}" stroke-width="1"`)).join('')}`;
}
function phoenix() {
  return `${p('M30 20 Q46 18 50 34 Q40 30 36 40 Q34 52 22 56 Q28 42 22 34 Q16 26 30 20Z', '#d8344a')}${p('M22 34 Q10 40 8 56 Q16 50 22 50Z', '#2f8a5a')}${p('M36 40 Q48 46 52 62 Q42 56 34 54Z', '#f2b51e')}${c(38, 24, 3.5, '#f2b51e')}${c(39, 23.5, 1, INK)}${p('M41 24 l5 2 l-5 1Z', '#e0a020')}`;
}
function rainMan() {
  return `${p('M14 30 Q30 14 46 30Z', RED)}${line('M30 30 V58', '#c8a060', 1.4)}${c(30, 36, 4, '#f0d0a8')}${p('M24 40 H36 L38 62 H22Z', '#3a4f8a')}${line('M26 62 v8 M34 62 v8', '#f0d0a8', 1.6)}${e(14, 70, 5, 3, '#4a8a3a')}${c(12, 68.5, 1, '#fff')}`;
}
function bridge() {
  let planks = '';
  for (let i = 0; i < 4; i++) planks += p(`M${4 + i * 13} ${46 + (i % 2) * 8} l14 ${i % 2 ? -8 : 8} l0 4 l-14 ${i % 2 ? 8 : -8}Z`, '#9a6a3a', `stroke="#5a3a1a" stroke-width="0.6"`);
  return planks;
}
function butterfly(x, y, s) {
  return `${e(x - 4 * s, y - 2 * s, 5 * s, 4 * s, '#f2b51e')}${e(x + 4 * s, y - 2 * s, 5 * s, 4 * s, '#f2b51e')}${e(x - 3 * s, y + 4 * s, 3.5 * s, 3 * s, '#d8344a')}${e(x + 3 * s, y + 4 * s, 3.5 * s, 3 * s, '#d8344a')}${line(`M${x} ${y - 5 * s} v12`, INK, 1.4 * s)}`;
}
function boar() {
  return `${p('M10 66 Q12 48 32 48 Q50 48 52 60 L56 62 L52 66 Z', '#6b4226')}${p('M32 48 Q36 42 44 46', '#4a2a16')}${c(48, 56, 1.2, '#fff')}${line('M16 66 v8 M24 66 v8 M40 66 v8 M48 66 v8', '#4a2a16', 2.4)}${line('M53 63 l4 -3', '#fff', 1.2)}`;
}
function goose(x, y, k = 1) {
  // fliegende Wildgans: Körper, weit ausgebreitete Flügel, langer Hals
  return `<g transform="translate(${x} ${y}) scale(${k})">${p('M-9 1 Q-2 -1 6 0 Q9 0 11 -2 L12 -1 Q9 2 6 3 Q-2 4 -9 1Z', INK)}${p('M-2 1 Q-6 -9 -14 -11 Q-6 -4 -4 2Z', INK)}${p('M1 1 Q4 -10 12 -14 Q7 -4 3 2Z', '#2a2a2a')}${c(11, -1.6, 0.5, '#fff')}</g>`;
}
function warbler(x, y) {
  // Buschsänger (꾀꼬리/휘파람새) auf dem Pflaumenzweig, olivgrün mit hellem Bauch
  return `<g transform="translate(${x} ${y}) scale(1.6)">${e(0, 0, 8, 5.4, '#7f8f1c')}${e(1, 2, 5.5, 3, '#d9d36a')}${c(7, -3.5, 3.8, '#7f8f1c')}${p('M10.4 -4 l3.6 1 l-3.6 1.2Z', '#3a2a10')}${c(8.2, -4.4, 0.9, INK)}${line('M6.5 -5.6 Q8.5 -6.2 10 -4.8', '#f4f0c0', 0.6)}${p('M-3 -2 Q1 -9 5 -3Z', '#5d6a12')}${p('M-7 -1 L-15 -5 L-14 1 Z', '#5d6a12')}${line('M-1 5 l-1 3 M2 5 l1 3', '#3a2a10', 0.8)}</g>`;
}
function cuckoo(x, y) {
  // Kuckuck im Flug vor dem roten Mond: graue Schwingen, gestreifter Bauch
  return `<g transform="translate(${x} ${y}) scale(1.5)">${p('M-4 0 Q-12 -14 -20 -16 Q-12 -6 -8 2Z', '#3a3a3a')}${p('M2 -1 Q8 -14 18 -18 Q12 -6 5 2Z', '#4a4a4a')}${e(0, 1, 9, 4, '#5a5a5a')}${[ -3, 0, 3].map((k) => line(`M${k} 2 l1 2.5`, '#fff', 0.6)).join('')}${c(8.5, -1, 3, '#5a5a5a')}${p('M11 -1.5 l3.5 0.8 l-3.5 0.9Z', '#e0a020')}${c(9.4, -1.8, 0.7, '#ffcc00')}${p('M-8 1 L-17 4 L-9 4.5Z', '#3a3a3a')}</g>`;
}
function paulownia(v) {
  // Paulownie (오동): große, rundlich gelappte schwarze Blätter und darüber aufrechte Blütenstände
  const leaf = (x, y, r, rot) => `<g transform="translate(${x} ${y}) rotate(${rot})">${p(`M0 ${r} C${-r * 1.3} ${r * 0.3} ${-r * 1.1} ${-r} 0 ${-r * 0.55} C${r * 1.1} ${-r} ${r * 1.3} ${r * 0.3} 0 ${r}Z`, INK)}${line(`M0 ${r} V${-r * 0.4} M0 ${r * 0.2} L${-r * 0.6} ${-r * 0.3} M0 ${r * 0.2} L${r * 0.6} ${-r * 0.3}`, '#555', 0.8)}</g>`;
  const spike = (x, y) => `${line(`M${x} ${y + 16} V${y}`, '#3a2a20', 1.2)}${[0, 1, 2, 3].map((i) => c(x + (i % 2 ? 2.4 : -2.4), y + 2 + i * 3.4, 2.1, '#9b6fc8')).join('')}${c(x, y - 1, 1.8, '#b98ce0')}`;
  return `${spike(v ? 18 : 22, 6)}${spike(30, 2)}${spike(v ? 40 : 38, 8)}${leaf(16, 50, 13, -18)}${leaf(44, 50, 13, 18)}${leaf(30, 60, 15, 0)}`;
}
function bonusArt(n) {
  return `${p('M0 0 H60 V78 H0Z', '#f2c23c')}${p('M0 0 H60 V78 H0Z', 'none', `stroke="#b8861b" stroke-width="3"`)}${[[10, 12], [50, 18], [12, 62], [48, 64]].map(([x, y]) => p(`M${x} ${y - 5} L${x + 1.5} ${y - 1.5} L${x + 5} ${y} L${x + 1.5} ${y + 1.5} L${x} ${y + 5} L${x - 1.5} ${y + 1.5} L${x - 5} ${y} L${x - 1.5} ${y - 1.5}Z`, '#fff8d0')).join('')}<text x="30" y="48" text-anchor="middle" font-size="26" font-weight="700" fill="${RED}" font-family="Georgia, serif">+${n}</text><text x="30" y="62" text-anchor="middle" font-size="9" font-weight="700" fill="#7a5a10" font-family="system-ui, sans-serif">BONUS</text>`;
}
function sakeCup() {
  return `${p('M14 52 H46 Q44 66 30 68 Q16 66 14 52Z', RED, `stroke="${INK}" stroke-width="0.8"`)}${e(30, 52, 16, 3.5, '#e8505a', `stroke="${INK}" stroke-width="0.8"`)}${p('M24 68 H36 L34 72 H26Z', RED)}<text x="30" y="63" text-anchor="middle" font-size="9" fill="#f2c23c" font-family="serif" font-weight="700">壽</text>`;
}
function deer() {
  return `${p('M14 70 Q14 54 28 54 Q40 54 42 62 L42 70Z', '#b5651d')}${p('M40 58 Q44 48 48 46 L52 50 Q48 54 44 62Z', '#b5651d')}${line('M47 46 l-2 -8 m2 8 l4 -7 m-6 1 l-3 -3', '#6b4226', 1.2)}${c(49, 48.5, 0.8, INK)}${line('M18 70 v6 M24 70 v6 M36 70 v6 M40 70 v6', '#6b4226', 1.8)}${[20, 26, 32].map((x) => c(x, 60, 1, '#fff')).join('')}`;
}
function swallow(x, y) {
  // Schwalbe: blauschwarzer Rücken, weiße Brust, rote Kehle, langer Gabelschwanz
  return `<g transform="translate(${x} ${y}) scale(1.35)">${p('M-16 -6 Q-6 -10 2 -4 Q-6 -2 -10 2Z', '#1a2440')}${p('M10 -10 Q4 -4 0 -2 Q6 0 14 -4Z', '#1a2440')}${e(0, 0, 9, 4.2, '#1a2440')}${e(1, 1.6, 6, 2.2, '#fff')}${c(8, -1.5, 3.2, '#1a2440')}${e(9, 0.6, 2, 1.4, RED)}${p('M11 -1.8 l4 1 l-4 1Z', INK)}${c(8.8, -2.4, 0.7, '#fff')}${p('M-8 0 L-19 7 L-12 0.5 L-20 3 Z', '#1a2440')}</g>`;
}
function thunderDrum() {
  // Regen-Doppelspreu: Gewitter mit Donnertrommel und Blitzen (nicht wie der Mond-Monat)
  const rain = [4, 12, 20, 28, 36, 44, 52].map((x, i) => line(`M${x + 6} ${2 + (i % 3) * 4} l-5 14 M${x + 3} ${40 + (i % 2) * 6} l-5 14`, '#8fa6c8', 1)).join('');
  const bolt = (x, y, sc) => p(`M${x} ${y} l${6 * sc} 0 l${-3 * sc} ${8 * sc} l${5 * sc} 0 l${-10 * sc} ${14 * sc} l${3 * sc} ${-10 * sc} l${-5 * sc} 0Z`, '#ffd23a', `stroke="#b88a00" stroke-width="0.5"`);
  return `${p('M0 0 H60 V78 H0Z', '#3b4a63')}${rain}${p('M0 0 H60 V12 Q44 18 30 12 Q16 6 0 14Z', '#262f40')}
  ${e(30, 50, 17, 13, '#b5532a', `stroke="${INK}" stroke-width="1.2"`)}${e(30, 50, 12, 9, '#d8a040')}
  ${p('M30 42 a8 8 0 0 1 0 16 a4 4 0 0 1 0 -8 a4 4 0 0 0 0 -8Z', RED)}${c(30, 46, 1.4, '#d8a040')}${c(30, 54, 1.4, RED)}
  ${[16, 22, 30, 38, 44].map((x) => c(x, x === 30 ? 37.5 : 39, 1.1, '#f2d23a')).join('')}
  ${bolt(6, 16, 1)}${bolt(44, 14, 0.9)}`;
}

// ---------- Zusammensetzen ----------
function art(info) {
  if (info.bonus) return SPECIAL[info.id]();
  return paper(info.month) + artBody(info) + seal(info.month);
}

function artBody(info) {
  if (SPECIAL[info.id]) return SPECIAL[info.id]();
  const v = info.part === 'pi2' ? 1 : 0;
  const base = BASE[info.month](v);
  if (info.kind === 'tti') {
    const text = info.ribbon === 'hong' || info.ribbon === 'cheong';
    return base + ribbon(RIBBON[info.ribbon], { text, x: 30, y: 12, angle: info.month % 2 ? -8 : 8 });
  }
  return base;
}

function kindMark(info) {
  if (info.kind === 'gwang') {
    return `<circle cx="48" cy="12" r="8.5" fill="${RED}" stroke="#fff" stroke-width="1"/><text x="48" y="16.2" text-anchor="middle" font-size="11" font-weight="700" fill="#fff" font-family="serif">光</text>`;
  }
  if (info.piValue === 2) {
    return `<circle cx="48" cy="12" r="7.5" fill="#fff" stroke="${INK}" stroke-width="1"/><text x="48" y="15.5" text-anchor="middle" font-size="9" font-weight="700" fill="${INK}" font-family="Georgia, serif">2×</text>`;
  }
  return '';
}

function bandColor(info) {
  if (info.bonus) return '#b8861b';
  if (info.kind === 'gwang') return '#b8861b';
  if (info.kind === 'yeol') return '#3d6a4b';
  if (info.kind === 'tti') return RIBBON[info.ribbon ?? 'null'];
  return '#7b746a';
}

export function cardLabel(id) {
  const info = cardInfo(id);
  if (info.bonus) return `${T.bonusName} +${info.piValue}`;
  let kind = T.kindShort[info.kind];
  if (info.piValue === 2) kind = `2× ${kind}`;
  return `${info.month} ${kind}`;
}

let clipSeq = 0;

// Kartenvorderseite
export function cardSvg(id) {
  const info = cardInfo(id);
  const kind = info.bonus ? `${T.bonusName} +${info.piValue}` : info.piValue === 2 ? `2× ${T.kindShort.pi}` : T.kindShort[info.kind];
  const clip = `clip-${id}-${++clipSeq}`; // eindeutig: dieselbe Karte kann mehrfach im Bild sein
  // Hervorhebung: Lichter glänzen golden, die Vögel (Godori und die Schwalbe für Bi-Godori) leuchten blau und hüpfen
  const fx = info.godori || id === 'm12-yeol' ? ' k-bird' : ''; // nur die Vögel leuchten; Lichter (광) ohne Extra-Effekt
  const shine = '';
  const sweep = '';
  const delay = fx ? ` style="--d:${(-0.9 * info.month).toFixed(1)}s"` : ''; // nicht alle im Gleichtakt
  return `<svg viewBox="0 0 60 92" class="card-svg${fx}"${delay} role="img" aria-label="${cardLabel(id)}">
<defs><clipPath id="${clip}"><rect x="1" y="1" width="58" height="78" rx="4.5"/></clipPath>${shine}</defs>
<rect x="1" y="1" width="58" height="90" rx="5" fill="${FACE}" stroke="#a89c82" stroke-width="1"/>
<g clip-path="url(#${clip})">${info.bonus ? art(info) : `<image href="assets/cards/${id}.webp" x="1" y="1" width="58" height="78" preserveAspectRatio="xMidYMid slice"/>`}${sweep}</g>
${info.bonus ? '' : kindMark(info)}
${info.bonus ? '' : `<circle cx="9" cy="10" r="7.5" fill="rgba(255,250,240,.88)"/>
<text x="9" y="14" text-anchor="middle" font-size="11" font-weight="700" fill="${INK}" font-family="Georgia, 'Times New Roman', serif">${info.month}</text>`}
<path d="M1 79 H59 V86 A5 5 0 0 1 54 91 H6 A5 5 0 0 1 1 86Z" fill="${bandColor(info)}"/>
<text x="30" y="88.4" text-anchor="middle" font-size="9" font-weight="700" fill="#fff" font-family="system-ui, sans-serif">${kind}</text>
</svg>`;
}

export function cardBackSvg() {
  return `<svg viewBox="0 0 60 92" class="card-svg" aria-hidden="true"><rect x="1" y="1" width="58" height="90" rx="5" fill="#a5122b" stroke="#6e0b1c"/><rect x="7" y="7" width="46" height="78" rx="3" fill="none" stroke="#d8475c" stroke-width="1.2"/></svg>`;
}
