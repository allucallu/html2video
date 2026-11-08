#!/usr/bin/env node
// Server preview studio: daftar aset di /assets + presets di /presets + file statis + API presets.
import http from 'node:http';
import { readdir, readFile, access } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const port = Number(process.env.PORT || 5173);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.css': 'text/css'
};

http.createServer(async (req, res) => {
  const [pathname] = req.url.split('?');
  const url = decodeURIComponent(pathname);

  try {
    // API endpoint untuk daftar preset
    if (url === '/api/presets') {
      const presetsDir = path.join(root, 'presets');
      let files = [];
      try {
        files = (await readdir(presetsDir)).filter((f) => f.endsWith('.json'));
      } catch {}

      const list = [];
      for (const file of files) {
        try {
          const content = JSON.parse(await readFile(path.join(presetsDir, file), 'utf8'));
          list.push({
            file: `presets/${file}`,
            name: file.replace('.json', ''),
            bg: content.bg || content.params?.bg || 'black',
            title: content.meta?.title || file
          });
        } catch {}
      }
      res.setHeader('content-type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify(list));
    }

    // Homepage studio
    if (url === '/') {
      const assets = (await readdir(path.join(root, 'assets'))).filter((f) => f.endsWith('.html'));
      let presetFiles = [];
      try {
        presetFiles = (await readdir(path.join(root, 'presets'))).filter((f) => f.endsWith('.json'));
      } catch {}

      const presets = [];
      for (const file of presetFiles) {
        try {
          const content = JSON.parse(await readFile(path.join(root, 'presets', file), 'utf8'));
          presets.push({
            file: `presets/${file}`,
            name: file.replace('.json', ''),
            bg: content.bg || content.params?.bg || 'black',
            title: content.meta?.title || file
          });
        } catch {}
      }

      res.setHeader('content-type', 'text/html; charset=utf-8');
      return res.end(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>HTML Render Engine - Studio Preview</title>
  <style>
    body { background: #0c0e14; color: #e6edf3; font: 15px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 40px; margin: 0; }
    h1 { font-size: 24px; margin-bottom: 8px; color: #58a6ff; }
    p { color: #8b949e; margin-top: 0; margin-bottom: 24px; }
    .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 20px; margin-bottom: 24px; max-width: 760px; }
    h2 { font-size: 15px; margin: 0 0 14px 0; color: #f0883e; text-transform: uppercase; letter-spacing: 0.05em; }
    .asset-block { border-bottom: 1px solid #21262d; padding-bottom: 16px; margin-bottom: 16px; }
    .asset-block:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
    .asset-title { font-size: 16px; font-weight: 600; margin-bottom: 10px; display: flex; align-items: center; gap: 10px; }
    .links-grid { display: flex; flex-direction: column; gap: 8px; padding-left: 12px; }
    a { color: #58a6ff; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; font-size: 14px; }
    a:hover { text-decoration: underline; color: #79c0ff; }
    .badge { font-size: 11px; padding: 2px 7px; border-radius: 4px; font-weight: 600; }
    .badge-default { background: rgba(88,166,255,0.15); color: #79c0ff; border: 1px solid rgba(88,166,255,0.3); }
    .badge-alpha { background: rgba(163,113,247,0.15); color: #d2a8ff; border: 1px solid rgba(163,113,247,0.3); }
    .badge-black { background: rgba(240,136,62,0.15); color: #f0883e; border: 1px solid rgba(240,136,62,0.3); }
    code { background: #21262d; padding: 2px 6px; border-radius: 4px; font-size: 12px; color: #7ee787; }
  </style>
</head>
<body>
  <h1>HTML Render Engine Studio</h1>
  <p>Preview aset motion graphics secara lokal sebelum merender ke Adobe Stock via GitHub Actions.</p>

  <div class="card">
    <h2>Aset & Variasi Preset Siap Uji</h2>
    ${assets.length === 0 ? '<p style="color:#8b949e;margin:0;">Belum ada aset di folder <code>assets/</code>. Silakan letakkan file HTML aset baru Anda di folder tersebut.</p>' : assets.map((asset) => `
      <div class="asset-block">
        <div class="asset-title"><span class="badge badge-default">HTML Asset</span> ${asset}</div>
        <div class="links-grid">
          <a href="/assets/${asset}">
            <span class="badge badge-black">Default</span> Buka Preview Asli
          </a>
          ${presets.map((pr) => `
            <a href="/assets/${asset}?preset=${pr.file}">
              <span class="badge ${pr.bg === 'alpha' ? 'badge-alpha' : 'badge-black'}">${pr.bg === 'alpha' ? 'Alpha ProRes' : 'Black Solid'}</span>
              ${pr.name} &mdash; <code>${pr.file}</code>
            </a>
          `).join('')}
        </div>
      </div>
    `).join('')}
  </div>
</body>
</html>
      `);
    }

    const p = path.join(root, path.normalize(url).replace(/^(\.\.[\/\\])+/, ''));
    if (!p.startsWith(root)) throw 0;
    await access(p);
    res.setHeader('content-type', types[path.extname(p)] || 'application/octet-stream');
    res.end(await readFile(p));
  } catch {
    res.statusCode = 404;
    res.end('404 Not Found');
  }
}).listen(port, () => console.log(`Studio Preview aktif di: http://localhost:${port}`));
