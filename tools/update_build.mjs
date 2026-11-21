// sw.js의 캐시 대상 파일 총 용량을 계산해 config.js(version, size)와 sw.js(CACHE)를 자동 갱신한다.
// 실행: node tools/update_build.mjs
import fs from 'node:fs';

const sw = fs.readFileSync('sw.js', 'utf8');
const match = sw.match(/const FILES = (\[[^\]]+\])/);
if (!match) throw new Error('FILES list not found in sw.js');

const files = JSON.parse(match[1]);
let totalBytes = 0;
for (const f of files) {
  const path = f === './' ? 'index.html' : f.replace(/^\.\//, '');
  if (fs.existsSync(path)) totalBytes += fs.statSync(path).size;
}

const sizeMB = `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const version = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
const cacheId = `matgo-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;

fs.writeFileSync('config.js', `// automatisch erzeugt (node tools/update_build.mjs)\nexport const CONFIG = { mode: 'app', version: '${version}', size: '${sizeMB}' };\n`);
fs.writeFileSync('sw.js', sw.replace(/const CACHE = '[^']+';/, `const CACHE = '${cacheId}';`));

console.log(`Updated config.js (version: ${version}, size: ${sizeMB}) and sw.js (cache: ${cacheId})`);
