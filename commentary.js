// Spielbericht (was ist passiert?) und Chancen (was fehlt noch?) – nur Text, keine Darstellung.
import { T } from './i18n.de.js';
import { cardInfo } from './cards-svg.js';

const ALL = [];
for (let m = 1; m <= 12; m++) {
  const mm = String(m).padStart(2, '0');
  const parts = {
    1: ['gwang', 'hong', 'pi1', 'pi2'], 2: ['yeol', 'hong', 'pi1', 'pi2'], 3: ['gwang', 'hong', 'pi1', 'pi2'],
    4: ['yeol', 'cho', 'pi1', 'pi2'], 5: ['yeol', 'cho', 'pi1', 'pi2'], 6: ['yeol', 'cheong', 'pi1', 'pi2'],
    7: ['yeol', 'cho', 'pi1', 'pi2'], 8: ['gwang', 'yeol', 'pi1', 'pi2'], 9: ['yeol', 'cheong', 'pi1', 'pi2'],
    10: ['yeol', 'cheong', 'pi1', 'pi2'], 11: ['gwang', 'ssangpi', 'pi1', 'pi2'], 12: ['gwang', 'yeol', 'tti', 'ssangpi'],
  }[m];
  for (const p of parts) ALL.push(`m${mm}-${p}`);
}

export function cardName(id) {
  const c = cardInfo(id);
  if (c.bonus) return `${T.bonusName} +${c.piValue}`;
  const kind = c.piValue === 2 ? T.doubleSpreu : T.kindShort[c.kind];
  return `${c.month} ${T.plants[c.month]}-${kind}`;
}

const list = (ids) => ids.map(cardName).join(T.and);

// Ereignisse eines Zuges → deutsche Sätze
// nameOf(seat): optional, für Go-Stop zu dritt (sonst „Gegner“)
export function describeTurn(events, me, nameOf = null) {
  const nm = (seat) => (nameOf ? nameOf(seat) : 'Gegner');
  const lines = [];
  let played = null;
  let flipped = null;
  for (const e of events) {
    const mine = e.player === me;
    switch (e.type) {
      case 'played':
        played = e.card;
        break;
      case 'flipped':
        if (e.bonus) lines.push(T.bonusFlip(mine, cardName(e.card), nm(e.player)));
        else flipped = e.card;
        break;
      case 'placed':
        if (e.card === played) lines.push(T.play(mine, cardName(e.card), nm(e.player)) + T.noPartner);
        else if (e.card === flipped) lines.push(T.flipNone(cardName(e.card)));
        break;
      case 'captured': {
        if (e.cards.every((id) => id.startsWith('b-'))) break; // Bonus schon beim Aufdecken erwähnt
        const [first, ...rest] = e.cards.filter((id) => !id.startsWith('b-'));
        if (played && flipped && e.cards.includes(played) && e.cards.includes(flipped)) {
          lines.push(`${T.play(mine, cardName(played), nm(e.player))}. ${T.flipMatch(cardName(flipped), cardName(played)).replace(/\.$/, '')}. ${T.takeAll(mine, e.cards.length, nm(e.player))}`);
        } else if (first === played) lines.push(T.play(mine, cardName(first), nm(e.player)) + T.hits(mine, list(rest)));
        else if (first === flipped) lines.push(T.flipMatch(cardName(first), list(rest)));
        else lines.push(T.takeWith(mine, cardName(first), list(rest), nm(e.player)));
        break;
      }
      case 'bonusUsed':
        lines.push(T.bonusUsedLine(mine, cardName(e.card), nm(e.player)));
        break;
      case 'steal':
        lines.push(T.stealLine(mine, e.cards.length, nm(e.player), nameOf && e.from !== me ? nm(e.from) : null));
        break;
      case 'ppeok': case 'ppeokEat': case 'jaPpeok': case 'ttadak': case 'jjok': case 'sweep': case 'firstPpeok': case 'threePpeok':
        lines.push(`${mine ? T.you : nm(e.player)}: ${T.events[e.type]}`);
        break;
      default:
        break;
    }
  }
  return lines;
}

// ---------- Chancen ----------
const SETS = {
  godori: ['m02-yeol', 'm04-yeol', 'm08-yeol'],
  hong: ['m01-hong', 'm02-hong', 'm03-hong'],
  cheong: ['m06-cheong', 'm09-cheong', 'm10-cheong'],
  cho: ['m04-cho', 'm05-cho', 'm07-cho'],
};
const SET_POINTS = { godori: 5, hong: 3, cheong: 3, cho: 3 };
const MIN = { yeol: 5, tti: 5, pi: 10 };

function gwangPoints(ids) {
  const n = ids.length;
  if (n === 5) return 15;
  if (n === 4) return 4;
  if (n === 3) return ids.includes('m12-gwang') ? 2 : 3;
  return 0;
}

// Wie viel zählt eine Karte in einer Gruppe (Gukjin als Tier oder Doppelspreu)
function counts(ids, gukjinAs) {
  const c = { gwang: [], yeol: 0, tti: 0, pi: 0 };
  for (const id of ids) {
    const i = cardInfo(id);
    if (i.gukjin && gukjinAs === 'pi') c.pi += 2;
    else if (i.kind === 'gwang') c.gwang.push(id);
    else if (i.kind === 'pi') c.pi += i.piValue;
    else c[i.kind] += 1;
  }
  return c;
}

export function prospects(mine, theirs, gukjinAs = 'yeol') {
  const out = [];
  const have = counts(mine, gukjinAs);
  const taken = new Set([...mine, ...theirs]);
  const free = ALL.filter((id) => !taken.has(id));

  // Lichter
  const g = have.gwang.length;
  const theirGwang = theirs.filter((id) => cardInfo(id).kind === 'gwang').length;
  if (g >= 3) out.push(item('gwang', g, 3, [], true, gwangPoints(have.gwang)));
  else if (g === 2) out.push(item('gwang', g, 3, [], 5 - theirGwang >= 3, 0));

  // Kombinationen aus drei Karten
  for (const [key, ids] of Object.entries(SETS)) {
    const got = ids.filter((id) => mine.includes(id) && !(id === 'm09-yeol' && gukjinAs === 'pi'));
    if (got.length < 2) continue;
    const missing = ids.filter((id) => !got.includes(id));
    const possible = missing.every((id) => !theirs.includes(id));
    out.push(item(key, got.length, 3, missing, possible, got.length === 3 ? SET_POINTS[key] : 0));
  }

  // Zählkarten
  const freeCount = counts(free, 'pi'); // freier Gukjin könnte als Spreu zählen
  const freeYeol = counts(free, 'yeol').yeol;
  for (const key of ['yeol', 'tti', 'pi']) {
    const n = have[key];
    const min = MIN[key];
    if (n >= min) out.push(item(key, n, min, [], true, n - min + 1));
    else if (n >= min - 2) {
      const left = key === 'yeol' ? freeYeol : freeCount[key];
      out.push(item(key, n, min, [], n + left >= min, 0));
    }
  }
  return out;
}

function item(key, have, need, missing, possible, points) {
  let text = `${T.setLabel[key]}: `;
  if (points > 0) text += T.scoring(have, points);
  else {
    text += T.ofNeed(have, need);
    if (!possible) text += T.impossible;
    else if (missing.length) text += T.missing(list(missing));
  }
  return { key, have, need, missing, possible, points, text };
}
