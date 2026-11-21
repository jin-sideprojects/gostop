// Erzeugt tools/preview.html: alle 48 Karten mit cardSvg() zur Sichtprüfung (node tools/make_preview.mjs)
import fs from 'fs';
globalThis.localStorage = { getItem: () => null, setItem() {} };
const { CARDS } = await import('../src/engine/cards.js');
const { setLang } = await import('../i18n.js');
setLang('ko');
const { cardSvg } = await import('../cards-svg.js');
const css = fs.readFileSync(new URL('../style.css', import.meta.url), 'utf8');
const cells = CARDS.map((c) => `<div class="cell"><span class="card">${cardSvg(c.id).replaceAll('assets/cards/', '../assets/cards/')}</span><small>${c.id}</small></div>`).join('');
fs.writeFileSync(new URL('./preview.html', import.meta.url), `<!doctype html><meta charset="utf-8"><style>${css}
body{background:#2f4a3c;display:flex;flex-wrap:wrap;gap:10px;padding:10px}.cell{width:130px;color:#fff;font:11px sans-serif;text-align:center}.cell .card{width:130px}</style>${cells}`);
console.log('ok', CARDS.length);
