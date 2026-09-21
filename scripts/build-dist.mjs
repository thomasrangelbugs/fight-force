import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');

function rmrf(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

rmrf(dist);
fs.mkdirSync(dist, { recursive: true });

const files = [
  'index.html',
  'config.js',
  'package.json',
  'netlify.toml',
  'manifest.webmanifest',
  'service-worker.js',
  'STRUCTURE.txt',
];

for (const f of files) {
  const from = path.join(root, f);
  if (fs.existsSync(from)) fs.copyFileSync(from, path.join(dist, f));
}

for (const dir of ['src', 'css', 'assets', 'emulator']) {
  copyDir(path.join(root, dir), path.join(dist, dir));
}

fs.mkdirSync(path.join(dist, 'games'), { recursive: true });
const keepExact = new Set([
  'FightingForce-data.zip',
  'FightingForce-data.cue',
  'FightingForce-Track01.bin',
]);

for (const entry of fs.readdirSync(path.join(root, 'games'))) {
  if (!keepExact.has(entry)) continue;
  fs.copyFileSync(path.join(root, 'games', entry), path.join(dist, 'games', entry));
}

const zip = path.join(dist, 'games', 'FightingForce-data.zip');
const size = fs.existsSync(zip) ? fs.statSync(zip).size : 0;
console.log('dist ready at', dist);
console.log('FightingForce-data.zip bytes:', size);
