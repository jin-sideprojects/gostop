// 경량 순수 JS QR 코드 SVG 생성기 (ISO/IEC 18004, Byte 모드, ECC Level M, Version 1~6)

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
for (let i = 0, x = 1; i < 255; i++) {
  EXP[i] = EXP[i + 255] = x;
  LOG[x] = i;
  x = x & 0x80 ? (x << 1) ^ 0x11d : x << 1;
}

const gfMul = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);

function rsPoly(deg) {
  let p = [1];
  for (let i = 0; i < deg; i++) {
    const next = new Array(p.length + 1).fill(0);
    for (let j = 0; j < p.length; j++) {
      next[j] ^= p[j];
      next[j + 1] ^= gfMul(p[j], EXP[i]);
    }
    p = next;
  }
  return p;
}

function rsEncode(data, ecLen) {
  const gen = rsPoly(ecLen);
  const res = new Uint8Array(data.length + ecLen);
  res.set(data);
  for (let i = 0; i < data.length; i++) {
    const coef = res[i];
    if (coef === 0) continue;
    for (let j = 0; j < gen.length; j++) res[i + j] ^= gfMul(gen[j], coef);
  }
  return res.slice(data.length);
}

// Version 1~6 (ECC Level M): [version, size, totalDataBytes, ecBytesPerBlock, blocks, alignPositions]
const VERSIONS = [
  [1, 21, 16, 10, 1, []],
  [2, 25, 28, 16, 1, [6, 18]],
  [3, 29, 44, 26, 1, [6, 22]],
  [4, 33, 64, 18, 2, [6, 26]],
  [5, 37, 86, 24, 2, [6, 30]],
  [6, 41, 108, 16, 4, [6, 34]],
];

function encodeData(bytes) {
  const spec = VERSIONS.find((v) => v[2] >= bytes.length + 2);
  if (!spec) throw new Error('URL too long for QR');
  const [, , totalData, ecPerBlock, blocks] = spec;
  const bits = [];
  const push = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1); };
  push(0b0100, 4); // Byte mode
  push(bytes.length, 8);
  for (const b of bytes) push(b, 8);
  const maxBits = totalData * 8;
  push(0, Math.min(4, maxBits - bits.length));
  while (bits.length % 8) bits.push(0);
  const data = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    data.push(b);
  }
  for (let pad = 0; data.length < totalData; pad++) data.push(pad % 2 === 0 ? 0xec : 0x11);

  const blockSize = Math.floor(totalData / blocks);
  const dataBlocks = [];
  const ecBlocks = [];
  for (let b = 0, off = 0; b < blocks; b++) {
    const len = blockSize + (b >= blocks - (totalData % blocks) ? 1 : 0);
    const slice = data.slice(off, off + len);
    off += len;
    dataBlocks.push(slice);
    ecBlocks.push(rsEncode(slice, ecPerBlock));
  }
  const codewords = [];
  const maxD = Math.max(...dataBlocks.map((b) => b.length));
  for (let i = 0; i < maxD; i++) for (const b of dataBlocks) if (i < b.length) codewords.push(b[i]);
  for (let i = 0; i < ecPerBlock; i++) for (const b of ecBlocks) codewords.push(b[i]);
  return { spec, codewords };
}

function buildMatrix(spec, codewords) {
  const [, size, , , , align] = spec;
  const m = Array.from({ length: size }, () => new Int8Array(size).fill(-1));
  const fixed = Array.from({ length: size }, () => new Uint8Array(size));
  const set = (r, c, v) => { m[r][c] = v; fixed[r][c] = 1; };

  const finder = (r0, c0) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = r0 + dr;
        const c = c0 + dc;
        if (r < 0 || r >= size || c < 0 || c >= size) continue;
        const on = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6 && (dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4));
        set(r, c, on ? 1 : 0);
      }
    }
  };
  finder(0, 0);
  finder(0, size - 7);
  finder(size - 7, 0);

  for (const r of align) {
    for (const c of align) {
      if (fixed[r][c]) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          set(r + dr, c + dc, Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0) ? 1 : 0);
        }
      }
    }
  }

  for (let i = 8; i < size - 8; i++) {
    if (!fixed[6][i]) set(6, i, i % 2 === 0 ? 1 : 0);
    if (!fixed[i][6]) set(i, 6, i % 2 === 0 ? 1 : 0);
  }
  set(size - 8, 8, 1);
  for (let i = 0; i < 9; i++) {
    if (i !== 6) { fixed[8][i] = 1; fixed[i][8] = 1; }
  }
  for (let i = 0; i < 8; i++) { fixed[8][size - 1 - i] = 1; fixed[size - 1 - i][8] = 1; }

  let bitIdx = 0;
  const totalBits = codewords.length * 8;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (let step = 0; step < size; step++) {
      const r = ((size - 1 - col) >> 1) % 2 === 0 ? size - 1 - step : step;
      for (let dx = 0; dx < 2; dx++) {
        const c = col - dx;
        if (fixed[r][c]) continue;
        const bit = bitIdx < totalBits ? (codewords[bitIdx >> 3] >> (7 - (bitIdx & 7))) & 1 : 0;
        bitIdx++;
        m[r][c] = bit;
      }
    }
  }
  return { m, fixed, size };
}

const MASKS = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (_, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

function applyFormat(grid, size, maskId) {
  let d = (0b00 << 3) | maskId; // ECC Level M = 00
  let rem = d << 10;
  for (let i = 4; i >= 0; i--) if (rem & (1 << (i + 10))) rem ^= 0x537 << i;
  const fmt = ((d << 10) | rem) ^ 0x5412;
  for (let i = 0; i < 15; i++) {
    const bit = (fmt >> i) & 1;
    grid[i < 6 ? i : i < 8 ? i + 1 : size - 15 + i][8] = bit;
    grid[8][i < 8 ? size - 1 - i : i < 9 ? 7 : 14 - i] = bit;
  }
}

function penalty(g, size) {
  let score = 0;
  for (let r = 0; r < size; r++) {
    let run = 1;
    for (let c = 1; c < size; c++) {
      run = g[r][c] === g[r][c - 1] ? run + 1 : (score += run >= 5 ? run - 2 : 0, 1);
    }
    if (run >= 5) score += run - 2;
  }
  for (let c = 0; c < size; c++) {
    let run = 1;
    for (let r = 1; r < size; r++) {
      run = g[r][c] === g[r - 1][c] ? run + 1 : (score += run >= 5 ? run - 2 : 0, 1);
    }
    if (run >= 5) score += run - 2;
  }
  return score;
}

/**
 * URL 문자열을 표준 QR 코드 SVG 마크업으로 변환한다.
 * @param {string} text
 * @param {number} [px=220]
 * @returns {string}
 */
export function qrSvg(text, px = 220) {
  const bytes = new TextEncoder().encode(text);
  const { spec, codewords } = encodeData(bytes);
  const { m, fixed, size } = buildMatrix(spec, codewords);

  let best = null;
  let bestScore = Infinity;
  for (let maskId = 0; maskId < 8; maskId++) {
    const g = m.map((row, r) => row.map((v, c) => (fixed[r][c] ? v : v ^ (MASKS[maskId](r, c) ? 1 : 0))));
    applyFormat(g, size, maskId);
    const sc = penalty(g, size);
    if (sc < bestScore) { bestScore = sc; best = g; }
  }

  let paths = '';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (best[r][c]) paths += `M${c},${r}h1v1h-1z`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 ${size + 4} ${size + 4}" width="${px}" height="${px}" shape-rendering="crispEdges" role="img" aria-label="QR Code"><rect x="-2" y="-2" width="${size + 4}" height="${size + 4}" fill="#fff"/><path d="${paths}" fill="#111"/></svg>`;
}
