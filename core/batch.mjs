#!/usr/bin/env node
/**
 * Batch render engine: merender seluruh preset untuk satu aset secara berurutan.
 * Berguna untuk merender banyak variasi aset sekaligus ke out/ untuk keperluan portofolio microstock.
 */
import { readdir, access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

function parseArgs(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (!k.startsWith('--')) { a._.push(k); continue; }
    const key = k.slice(2);
    if (key === 'help' || key === 'dry-run' || key === 'poster-only') { a[key] = true; continue; }
    a[key] = argv[++i];
  }
  return a;
}

const args = parseArgs(process.argv.slice(2));
const assetFile = args._[0] || 'assets/ghost-pack-4k.html';

if (args.help) {
  console.log(`Pemakaian: node core/batch.mjs [aset.html] [opsi]
  --presets dir         folder preset (default: presets)
  --poster-only         hanya buat poster 4K untuk semua preset (sangat cepat)
  --dry-run             tampilkan daftar job tanpa mengeksekusi
  --res 3840x2160       override resolusi seluruh batch
  --fps 30              override fps seluruh batch`);
  process.exit(0);
}

const assetPath = path.resolve(assetFile);
const presetsDir = path.resolve(args.presets || 'presets');

let presetFiles = [];
try {
  presetFiles = (await readdir(presetsDir))
    .filter((f) => f.endsWith('.json'))
    .map((f) => path.join('presets', f));
} catch {}

// Tambahkan default render config jika ada
const baseConfig = assetFile.replace(/\.html$/, '.render.json');
try {
  await access(baseConfig);
  presetFiles.unshift(baseConfig);
} catch {}

if (presetFiles.length === 0) {
  console.error(`Tidak ada file preset yang ditemukan di ${presetsDir}`);
  process.exit(1);
}

console.log(`\n==================================================`);
console.log(` BATCH RENDER: ${path.basename(assetPath)}`);
console.log(` Jumlah preset ditemukan: ${presetFiles.length}`);
console.log(` Mode: ${args['poster-only'] ? 'Ekspor Poster 4K Saja' : 'Render Penuh'}`);
console.log(`==================================================\n`);

presetFiles.forEach((p, idx) => {
  console.log(` [${idx + 1}/${presetFiles.length}] ${p}`);
});
console.log('');

if (args['dry-run']) {
  console.log('[Dry Run Selesai]');
  process.exit(0);
}

function runRender(preset) {
  return new Promise((resolve, reject) => {
    const outName = path.basename(preset, '.json').replace('.render', '-default');
    const cmdArgs = [
      'core/render.mjs',
      assetPath,
      '--config', preset,
      '--out', `out/${outName}`
    ];
    if (args['poster-only']) cmdArgs.push('--poster-only');
    if (args.res) cmdArgs.push('--res', args.res);
    if (args.fps) cmdArgs.push('--fps', args.fps);

    console.log(`\n>>> Menjalankan job: ${preset} ...`);
    const proc = spawn('node', cmdArgs, { stdio: 'inherit' });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Render gagal dengan kode keluar ${code}`));
    });
  });
}

const tStart = Date.now();
for (let i = 0; i < presetFiles.length; i++) {
  const p = presetFiles[i];
  console.log(`\n--- Memproses [${i + 1}/${presetFiles.length}]: ${p} ---`);
  try {
    await runRender(p);
  } catch (err) {
    console.error(`Error pada job ${p}:`, err.message);
  }
}

const totalTime = ((Date.now() - tStart) / 1000).toFixed(1);
console.log(`\n==================================================`);
console.log(` Seluruh batch selesai dalam ${totalTime}s! Hasil ada di folder: out/`);
console.log(`==================================================\n`);

