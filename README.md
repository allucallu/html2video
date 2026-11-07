# HTML Render Engine

Engine pembuatan aset video microstock (Adobe Stock, Pond5, Shutterstock) dari kode HTML Canvas. 
Engine menggerakkan waktu virtual `t` sendiri (bukan clock fisik), menjamin hasil render deterministik, bit-identical loop, dan tanpa frame-drop.

Mendukung ekspor:
- **Black Solid (#000000)**: Cocok untuk elemen grafis gelap / mode blend *Screen* (Codec: H.264 MP4 atau ProRes 422 HQ MOV).
- **Transparent (Alpha)**: Transparan murni dengan saluran Alpha penuh (Codec: Apple ProRes 4444 MOV).

---

## Perintah Cepat

```bash
# 1. Instalasi dependensi
npm install
npx playwright install chromium    # opsional di lokal jika sudah punya Google Chrome / Edge

# 2. Preview Studio Lokal (http://localhost:5173)
npm run preview

# 3. Cek info durasi & frame aset
npm run info assets/ghost-pack-4k.html

# 4. Ekspor Thumbnail Poster 4K Saja (JPG / PNG)
npm run poster assets/ghost-pack-4k.html --out out/poster.jpg

# 5. Batch Render Semua Preset (Menghasilkan seluruh variasi video sekaligus)
npm run batch assets/ghost-pack-4k.html

# 6. Render Manual: Black Solid (H.264 4K)
node core/render.mjs assets/ghost-pack-4k.html --bg black --out out/final-black.mp4

# 7. Render Manual: Transparan Alpha (Apple ProRes 4444 4K)
node core/render.mjs assets/ghost-pack-4k.html --bg alpha --out out/final-alpha.mov
```

---

## Opsi Perintah CLI (`core/render.mjs`)

| Opsi | Default | Deskripsi |
| :--- | :--- | :--- |
| `--bg black\|alpha` | `black` | Mode latar belakang: `black` (#000000 murni) atau `alpha` (transparan). |
| `--alpha` | - | Pintasan untuk `--bg alpha`. |
| `--codec` | `h264` / `prores4444` | Codec: `h264`, `prores` (422 HQ), atau `prores4444` (dengan Alpha). |
| `--out file.[mp4\|mov]` | `out/<aset>` | File keluaran. Otomatis menyimpan poster 4K (`-poster.jpg` / `-poster.png`). |
| `--poster-only` | - | Hanya ekspor 1 frame poster 4K lalu selesai tanpa encoding video. |
| `--time S` | `durasi/2` | Waktu frame yang diekspor saat menggunakan `--poster-only`. |
| `--no-poster` | - | Jangan simpan file poster saat merender video. |
| `--res` | `3840x2160` | Resolusi keluaran (mis. `3840x2160`, `1920x1080`). |
| `--fps` | `30` | Frame rate per detik (standar broadcast: 24, 25, 29.97, 30, 60). |
| `--config` | - | Jalur file JSON config / preset. |
| `--param k=v` | - | Override parameter aset spesifik (mis. `--param seed=999`). |
| `--crf` | `14` | CRF untuk encoding H.264 (semakin kecil semakin tinggi kualitasnya). |
| `--preset` | `slow` | Preset encoder x264 (`slow`, `medium`, `veryfast`). |
| `--info` | - | Mencetak metadata kepatuhan stock & frame lalu keluar. |
| `--chrome path` | - | Jalur biner Chromium kustom (atau gunakan env `CHROME_PATH`). |

---

## Studio Preview (`npm run preview`)

Jalankan `npm run preview` untuk membuka **Studio Dashboard** di `http://localhost:5173`.
* Menampilkan daftar semua aset HTML dan preset variasi yang tersedia.
* Mengklik link preset akan langsung membuka preview dengan preset tersebut dimuat.
* Di dalam panel UI preview, terdapat menu **Preset Studio** untuk berganti variasi preset secara instan tanpa me-reload browser.

---

## Batch Render (`npm run batch`)

Jalankan perintah ini untuk memproduksi portofolio dalam jumlah banyak:
```bash
node core/batch.mjs assets/ghost-pack-4k.html
```
Engine akan secara otomatis mencari seluruh preset di folder `presets/` dan merender setiap variasi satu per satu ke folder `out/`.
* Gunakan flag `--poster-only` untuk mengekstrak thumbnail 4K seluruh preset dalam hitungan detik.

---

## Render di GitHub Actions

Di GitHub Actions:
1. Buka tab **Actions** → pilih workflow **Render aset** → klik **Run workflow**.
2. Masukkan parameter:
   - **Latar Belakang**: pilih `black` atau `alpha`.
   - **Codec**: pilih `auto` (otomatis H.264 untuk black, ProRes 4444 untuk alpha).
   - **Jumlah job**: default `1` (sangat direkomendasikan untuk durasi 5–30s guna menghindari risiko cacat *concat PTS/DTS*).
3. Setelah workflow selesai, unduh artifact `final-video` yang berisi video 4K master dan thumbnail poster 4K yang siap diunggah.
