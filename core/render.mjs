#!/usr/bin/env node
/**
 * Render engine: membuka aset HTML (kontrak window.asset, window.renderFrame, atau CSS/SVG animation),
 * menggerakkan waktu t secara manual, mengambil tiap frame, dan memipakannya ke FFmpeg.
 * Mendukung latar black solid (#000000), white, custom, dan latar transparan (Alpha ProRes 4444).
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// ---------- argumen ----------
function parseArgs(argv) {
  const a = { params: {}, _: [] };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (!k.startsWith('--')) { a._.push(k); continue; }
    const key = k.slice(2);
    if (key === 'info' || key === 'help' || key === 'alpha' || key === 'no-poster' || key === 'poster-only' || key === 'check-loop') {
      a[key] = true;
      continue;
    }
    const v = argv[++i];
    if (key === 'param') {
      const eq = v.indexOf('=');
      a.params[v.slice(0, eq)] = v.slice(eq + 1);
    } else a[key] = v;
  }
  return a;
}
const num = (v) => (v !== '' && !isNaN(Number(v)) ? Number(v) : v === 'true' ? true : v === 'false' ? false : v);

const args = parseArgs(process.argv.slice(2));
if (args.help || !args._[0]) {
  console.log(`Pemakaian: node core/render.mjs <aset.html> [opsi]
  --bg black|alpha      latar belakang: black (#000000) atau alpha (transparan); default black
  --alpha               shortcut untuk --bg alpha
  --codec h264|prores|prores4444  codec (default h264 untuk black, prores4444 untuk alpha)
  --out file.[mp4|mov]  file keluaran (default out/<nama>.[mp4|mov])
  --config file.json    {params, res, fps, duration, crf, codec, bg}; CLI menang atas config
  --param k=v           override parameter aset (boleh berulang)
  --res 3840x2160       resolusi keluaran (default 3840x2160)
  --fps 30              frame per detik (default 30)
  --duration S          detik; default params.duration milik aset
  --poster-only         hanya ekspor 1 poster thumbnail 4K (JPG/PNG) lalu selesai tanpa render video
  --time S              detik frame yang diekspor untuk --poster-only (default durasi/2)
  --no-poster           jangan simpan poster saat merender video
  --chunk i/n           render potongan ke-i (mulai 0) dari n, untuk GitHub Actions
  --crf 14 --preset slow  kualitas h264 (default crf 14, preset slow)
  --check-loop          uji determinisme dan selisih piksel (t=0 vs t=durasi) lalu keluar
  --limit N             render N frame pertama saja (uji cepat)
  --info                cetak info konfigurasi dan frame lalu keluar
  --chrome path         jalur Chromium kustom (atau env CHROME_PATH)`);
  process.exit(args._[0] ? 0 : 1);
}

const assetPath = path.resolve(args._[0]);
const cfg = args.config ? JSON.parse(await readFile(args.config, 'utf8')) : {};
const pick = (k, d) => args[k] ?? cfg[k] ?? cfg.params?.[k] ?? d;

// Tentukan mode background (black vs alpha)
const bg = (args.alpha || args.bg === 'alpha' || (!args.bg && (cfg.bg === 'alpha' || cfg.params?.bg === 'alpha')))
  ? 'alpha'
  : (args.bg ?? cfg.bg ?? cfg.params?.bg ?? 'black');

// Gabungkan parameter aset
const params = Object.fromEntries(
  Object.entries({ ...(cfg.params || {}), ...args.params }).map(([k, v]) => [k, typeof v === 'string' ? num(v) : v])
);
params.bg = bg;

const [W, H] = String(pick('res', '3840x2160')).split('x').map(Number);
const FPS = Number(pick('fps', 30));

// Tentukan codec default sesuai latar belakang
const defaultCodec = (bg === 'alpha') ? 'prores4444' : 'h264';
const codec = pick('codec', defaultCodec);

if (bg === 'alpha' && codec === 'h264') {
  console.warn('\n[Peringatan] Codec H.264 standar tidak mendukung Alpha channel (transparansi).');
  console.warn('Latar belakang transparan akan otomatis dialihkan ke ProRes 4444 (.mov) agar tidak rusak.\n');
}

const crf = String(pick('crf', 14));
const preset = String(pick('preset', 'slow'));

// ---------- browser launch ----------
const launchArgs = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--force-color-profile=srgb',
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding'
];

let browser;
if (args.chrome || process.env.CHROME_PATH) {
  browser = await chromium.launch({
    executablePath: args.chrome || process.env.CHROME_PATH,
    args: launchArgs,
  });
} else {
  try {
    browser = await chromium.launch({ args: launchArgs });
  } catch {
    // Fallback otomatis ke Google Chrome atau Microsoft Edge lokal jika playwright chromium belum diinstall
    try {
      browser = await chromium.launch({ channel: 'chrome', args: launchArgs });
    } catch {
      browser = await chromium.launch({ channel: 'msedge', args: launchArgs });
    }
  }
}

const page = await browser.newPage({ viewport: { width: W, height: H } });
page.on('pageerror', (e) => console.error('[aset] error:', e.message));

// Hentikan requestAnimationFrame preview dan inject parameter CLI SEBELUM script aset dieksekusi
await page.addInitScript((initParams) => {
  window.requestAnimationFrame = () => 0;
  window.__cliParams = initParams;
}, params);

await page.goto(pathToFileURL(assetPath).href);

// Tunggu hingga canvas, map/topojson, Web Animations, atau fungsi render tersedia
await page.waitForFunction(() => {
  return (
    window.mapReady === true ||
    window.assetReady === true ||
    window.__assetReady === true ||
    typeof window.renderFrame === 'function' ||
    typeof window.renderAtTime === 'function' ||
    typeof window.render === 'function' ||
    (window.asset && typeof window.asset.render === 'function') ||
    document.getAnimations().length > 0 ||
    document.querySelector('canvas') !== null
  );
}, null, { timeout: 20000 }).catch(() => {});

// Tunggu web fonts (Google Fonts) selesai loading agar teks tidak berubah di tengah rendering
await page.evaluate(async () => {
  if (document.fonts && document.fonts.ready) {
    try {
      await Promise.race([
        document.fonts.ready,
        new Promise((res) => setTimeout(res, 4000))
      ]);
    } catch (_) {}
  }
});

// Deteksi apakah aset berbasis Canvas atau DOM/CSS
const hasCanvas = await page.evaluate(() => {
  return !!(document.querySelector('canvas') || (window.asset && window.asset.canvas));
});

let detectedDuration = 6;
const baseName = path.basename(assetPath, '.html');
const durationMap = {
  'noise_cartography_4d': 20,
  'celestial_meridian': 24,
  'earth_venus_epicycle': 32,
  'equirectangular_proj': 14,
  'great_circle_arcs': 16,
  'explainer_3_scenes': 10,
  'liquid_silk_dither_1': 10,
  'liquid_silk_dither_2': 10
};
if (durationMap[baseName]) {
  detectedDuration = durationMap[baseName];
}

// Sinkronkan parameter akhir & ukuran canvas / CSS
await page.evaluate(({ p, w, h, isCanvas, defDur, fps }) => {
  window.__isCanvas = isCanvas;
  if (isCanvas) {
    const c = (window.asset && window.asset.canvas) || document.querySelector('canvas');
    if (c) {
      c.width = w;
      c.height = h;
      window.__engineCanvas = c;
    }

    const renderFrameFn = typeof window.renderFrame === 'function' ? window.renderFrame : null;
    const renderFn =
      typeof window.render === 'function' ? window.render :
      typeof window.renderAtTime === 'function' ? window.renderAtTime : null;
    const origAssetRender = (window.asset && typeof window.asset.render === 'function') ? window.asset.render : null;

    const dur = window.DURATION_SEC || window.DURATION || defDur;

    window.asset = {
      canvas: c,
      render: (t, f, totalF) => {
        if (renderFrameFn) {
          renderFrameFn(f, totalF);
        } else if (renderFn) {
          const progress = (t % dur) / dur;
          renderFn(progress);
        } else if (origAssetRender) {
          origAssetRender(t);
        }
      },
      params: { duration: dur, fps: window.FPS || fps },
      meta: { duration: dur, fps: window.FPS || fps }
    };

    if (p) Object.assign(window.asset.params, p);
  } else {
    // Mode DOM / CSS Animation
    // Inject style untuk full viewport tanpa batasan max-width 1920
    const style = document.createElement('style');
    style.textContent = `
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        width: 100vw !important;
        height: 100vh !important;
      }
      .canvas {
        max-width: none !important;
        max-height: none !important;
        width: 100vw !important;
        height: 100vh !important;
      }
    `;
    document.head.appendChild(style);

    // Pause all animations
    const anims = document.getAnimations();
    anims.forEach(a => a.pause());

    // Hitung durasi loop dari CSS jika ada
    let maxDur = defDur;
    if (window.DURATION) {
      maxDur = window.DURATION;
    } else {
      for (const a of anims) {
        const d = a.effect?.getComputedTiming()?.duration;
        if (typeof d === 'number' && d > 0) {
          const s = d / 1000;
          if (s > maxDur) maxDur = s;
        }
      }
    }

    window.asset = {
      render: (t) => {
        const ms = t * 1000;
        document.getAnimations().forEach(a => { a.currentTime = ms; });
      },
      params: { duration: maxDur, fps },
      meta: { duration: maxDur, fps }
    };
    if (p) Object.assign(window.asset.params, p);
  }
  window.__assetReady = true;
}, { p: params, w: W, h: H, isCanvas: hasCanvas, defDur: detectedDuration, fps: FPS });

const durationS = Number(pick('duration', await page.evaluate(() => window.asset?.params?.duration ?? window.asset?.meta?.duration ?? window.DURATION ?? 6)));

// ---------- validasi kepatuhan microstock ----------
if (W % 2 !== 0 || H % 2 !== 0) {
  throw new Error(`[Microstock Error] Resolusi ${W}x${H} tidak valid. Dimensi lebar dan tinggi harus genap (divisible by 2) untuk encoding YUV.`);
}

const STOCK_FPS = [23.976, 23.98, 24, 25, 29.97, 30, 50, 59.94, 60];
if (!STOCK_FPS.includes(FPS)) {
  console.warn(`\n[Microstock Warning] FPS ${FPS} bukan standar broadcast. Standar Adobe Stock: 24, 25, 29.97, 30, atau 60 fps.`);
}

if (durationS < 5.0 || durationS > 60.0) {
  console.warn(`\n[Microstock Warning] Durasi ${durationS}s berada di luar standar Adobe Stock (wajib antara 5s hingga 60s). Video berisiko ditolak kurator.`);
}

// Loop seamless: frame di t=duration sama dengan frame 0, jadi TIDAK dirender ulang.
const total = Math.round(durationS * FPS);

let from = 0, to = total;
if (args.chunk) {
  const [i, n] = args.chunk.split('/').map(Number);
  from = Math.floor((total * i) / n);
  to = Math.floor((total * (i + 1)) / n);
}
if (args.limit) to = Math.min(to, from + Number(args.limit));

if (args.info) {
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  const g = gcd(W, H);
  console.log(JSON.stringify({
    asset: path.basename(assetPath),
    mode: hasCanvas ? 'canvas' : 'css/dom',
    bg,
    codec,
    width: W,
    height: H,
    aspectRatio: `${W / g}:${H / g}`,
    fps: FPS,
    duration: durationS,
    frames: total,
    stockCompliant: durationS >= 5.0 && durationS <= 60.0 && STOCK_FPS.includes(FPS) && W % 2 === 0 && H % 2 === 0,
    params
  }, null, 2));
  await browser.close();
  process.exit(0);
}

// Mode khusus: ekspor hanya 1 poster thumbnail 4K lalu selesai
if (args['poster-only']) {
  const posterExt = bg === 'alpha' ? '.png' : '.jpg';
  let rawOut;
  if (args.out) {
    rawOut = (args.out.endsWith('.jpg') || args.out.endsWith('.png'))
      ? args.out
      : `${args.out}-poster${posterExt}`;
  } else {
    rawOut = `out/${path.basename(assetPath, '.html')}-poster${posterExt}`;
  }
  const posterOut = path.resolve(rawOut);
  await mkdir(path.dirname(posterOut), { recursive: true });
  const captureTime = args.time !== undefined ? Number(args.time) : durationS / 2;

  if (hasCanvas) {
    const mime = bg === 'alpha' ? 'image/png' : 'image/jpeg';
    const posterDataUrl = await page.evaluate(({ t, m, f, totalF }) => {
      window.asset.render(t, f, totalF);
      return window.__engineCanvas.toDataURL(m, 0.95);
    }, { t: captureTime, m: mime, f: Math.round(captureTime * FPS), totalF: total });
    await writeFile(posterOut, Buffer.from(posterDataUrl.split(',')[1], 'base64'));
  } else {
    await page.evaluate((t) => {
      window.asset.render(t);
    }, captureTime);
    const posterBuf = await page.screenshot({
      type: posterExt === '.png' ? 'png' : 'jpeg',
      quality: posterExt === '.png' ? undefined : 95
    });
    await writeFile(posterOut, posterBuf);
  }
  console.log(`Poster 4K tersimpan: ${posterOut}\n(Waktu: t=${captureTime.toFixed(2)}s, Latar: ${bg.toUpperCase()}, Ukuran: ${W}x${H})`);
  await browser.close();
  process.exit(0);
}

// ---------- konfigurasi encoding FFmpeg ----------
const isProRes = codec === 'prores' || codec === 'prores4444' || (bg === 'alpha' && codec === 'h264');
const ext = isProRes ? '.mov' : '.mp4';
const out = path.resolve(args.out || `out/${path.basename(assetPath, '.html')}${ext}`);
await mkdir(path.dirname(out), { recursive: true });

let enc = [];
let color = [];
const scaleFilter = 'scale=in_range=pc:out_range=tv:in_color_matrix=bt709:out_color_matrix=bt709:flags=accurate_rnd+full_chroma_int+spline:sws_dither=bayer';

if (codec === 'prores4444' || (bg === 'alpha' && codec === 'h264')) {
  // Apple ProRes 4444 dengan Alpha Channel
  enc = [
    '-c:v', 'prores_ks',
    '-profile:v', '4',
    '-pix_fmt', 'yuva444p10le',
    '-vendor', 'apl0',
    '-movflags', '+write_colr'
  ];
  color = [
    '-vf', 'setsar=1:1',
    '-colorspace', 'bt709',
    '-color_primaries', 'bt709',
    '-color_trc', 'bt709'
  ];
} else if (codec === 'prores') {
  // Apple ProRes 422 HQ 10-bit tanpa Alpha
  enc = [
    '-c:v', 'prores_ks',
    '-profile:v', '3',
    '-pix_fmt', 'yuv422p10le',
    '-vendor', 'apl0',
    '-movflags', '+write_colr'
  ];
  color = [
    '-vf', `${scaleFilter},setsar=1:1`,
    '-colorspace', 'bt709',
    '-color_primaries', 'bt709',
    '-color_trc', 'bt709'
  ];
} else {
  // H.264 Broadcast/Stock MP4 (8-bit) dengan tuning aq-mode=3
  enc = [
    '-c:v', 'libx264',
    '-preset', preset,
    '-crf', crf,
    '-pix_fmt', 'yuv420p',
    '-profile:v', 'high',
    '-level', '5.1',
    '-g', String(Math.round(FPS)),
    '-keyint_min', String(Math.round(FPS / 2)),
    '-sc_threshold', '0',
    '-movflags', '+faststart',
    '-x264-params', 'colorprim=bt709:transfer=bt709:colormatrix=bt709:fullrange=off:aq-mode=3:aq-strength=1.1'
  ];
  color = [
    '-vf', `${scaleFilter},setsar=1:1`,
    '-colorspace', 'bt709',
    '-color_primaries', 'bt709',
    '-color_trc', 'bt709'
  ];
}

// Argumen FFmpeg: Selalu sertakan -an untuk memastikan tidak ada audio stream kotor
const ffArgs = [
  '-y',
  '-loglevel', 'error',
  '-f', 'image2pipe',
  '-framerate', String(FPS),
  '-c:v', 'png',
  '-i', '-',
  '-sws_flags', 'accurate_rnd+full_chroma_int+spline',
  '-an',
  ...color,
  ...enc,
  out
];

const ff = spawn('ffmpeg', ffArgs, { stdio: ['pipe', 'inherit', 'inherit'] });
const ffDone = new Promise((res, rej) => {
  ff.on('error', (err) => rej(new Error('Gagal mengeksekusi ffmpeg: ' + err.message)));
  ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg keluar dengan kode ' + c))));
});
ff.stdin.on('error', () => {});

// ---------- loop render frame ----------
console.log(`Render ${path.basename(assetPath)} → ${out}`);
console.log(`Mode: ${hasCanvas ? 'Canvas 2D' : 'DOM/SVG CSS'} | Latar: ${bg.toUpperCase()} | Codec: ${codec} | ${W}x${H} @${FPS}fps | frame ${from}..${to - 1} dari ${total} (${durationS}s)`);

const posterMidFrame = Math.floor((from + to) / 2);
let posterSaved = false;

const t0 = Date.now();
for (let f = from; f < to; f++) {
  // Simpan otomatis poster 4K pada frame tengah jika bukan render chunk paralel terpotong
  if (!args['no-poster'] && !posterSaved && f >= posterMidFrame && (!args.chunk || args.chunk.startsWith('0/'))) {
    const posterExt = bg === 'alpha' ? '.png' : '.jpg';
    const posterOut = path.resolve(path.dirname(out), `${path.basename(out, path.extname(out))}-poster${posterExt}`);
    if (hasCanvas) {
      const mime = bg === 'alpha' ? 'image/png' : 'image/jpeg';
      const posterDataUrl = await page.evaluate(({ m, fIdx, tot }) => {
        return window.__engineCanvas.toDataURL(m, 0.95);
      }, { m: mime, fIdx: f, tot: total });
      await writeFile(posterOut, Buffer.from(posterDataUrl.split(',')[1], 'base64'));
    } else {
      const posterBuf = await page.screenshot({
        type: posterExt === '.png' ? 'png' : 'jpeg',
        quality: posterExt === '.png' ? undefined : 95
      });
      await writeFile(posterOut, posterBuf);
    }
    posterSaved = true;
    process.stdout.write(`\n  [Poster 4K Tersimpan] → ${path.basename(posterOut)}\n`);
  }

  let frameBuffer;
  if (hasCanvas) {
    const b64 = await page.evaluate(({ t, fIdx, tot }) => {
      window.asset.render(t, fIdx, tot);
      return window.__engineCanvas.toDataURL('image/png').slice(22);
    }, { t: f / FPS, fIdx: f, tot: total });
    frameBuffer = Buffer.from(b64, 'base64');
  } else {
    await page.evaluate((t) => {
      window.asset.render(t);
    }, f / FPS);
    frameBuffer = await page.screenshot({ type: 'png' });
  }

  if (!ff.stdin.write(frameBuffer)) {
    await new Promise((r) => ff.stdin.once('drain', r));
  }

  const done = f - from + 1;
  if (done % 15 === 0 || f === to - 1) {
    const el = (Date.now() - t0) / 1000;
    const eta = (el / done) * (to - from - done);
    process.stdout.write(`\r  ${done}/${to - from} frame  ${el.toFixed(0)}s  sisa ~${eta.toFixed(0)}s   `);
  }
}

ff.stdin.end();
await ffDone;
await browser.close();
console.log(`\nSelesai: ${out}`);
