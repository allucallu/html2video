# 🚀 HTML Render Engine: Pabrik Dolar Microstock Modal Canvas & Kemiskinan

> *"Ngapain bayar langganan Adobe After Effects tiap bulan cuma buat ngerender animasi lingkaran muter-muter sama partikel emas? Mending kita perbudak server gratisan Microsoft."*

---

## 🧐 Apaan Ini Sebenernya?

Selamat datang di **HTML Render Engine**, sebuah solusi over-engineered nan jenius buat Anda yang ingin jualan video footage di **Adobe Stock, Shutterstock, atau Pond5**, tapi:
1. Laptop kentang, kipasnya bunyi kayak helikopter mau take-off tiap buka After Effects / Blender.
2. Dompet tipis, malas bayar langganan bulanan software motion design.
3. Lebih jago nulis `Math.sin(t * 3)` daripada narik-narik kurva bezier di timeline editing.

Engine ini membuka file HTML5 Canvas di browser headless (Playwright), membekukan waktu fisik, lalu menjajah waktu virtual `t` frame demi frame untuk disuntikkan langsung ke mulut pipa **FFmpeg**. Hasilnya? Video 4K 60fps/30fps murni, **100% bit-identical loop**, tanpa drama frame drop, tanpa lag, dan siap panen royalti dollar.

---

## ✨ Fitur Sakti (Kenapa Engine Ini Lebih Pinter dari After Effects?)

* **⏱️ Waktu Virtual yang Kejam:**  
  Engine ini nggak peduli laptop Anda ngos-ngosan ngerender cuma 1 frame per detik. Waktu browser dikontrol manual, jadi hasil akhir videonya dijamin 30 atau 60 FPS super mulus tanpa patah-patah sedetik pun.
* **☁️ Perbudakan Massal Server GitHub (Matrix Parallelism):**  
  Punya 14 aset video yang mau dirender? Jangan buang umur nungguin laptop ngerender satu-satu. Lempar ke GitHub Actions! 14 virtual machine cloud bakal kerja rodi serentak di server Microsoft. Render 14 video 4K kelar cuma dalam ~2–3 menit. Biar Bill Gates yang nanggung tagihan listriknya.
* **📦 Download Sekali Klik (All-in-One Artifact):**  
  Setelah GitHub selesai kerja bakti, semua video MP4, poster thumbnail 4K, dan file CSV metadata bakal dibungkus rapi jadi satu file `.zip`. Anda tinggal download sekali, ekstrak, lalu seret ke Adobe Stock sambil rebahan.
* **🏷️ Pabrik Metadata Anti-Ditolak Kurator:**  
  Dilengkapi validator metadata cerdas. Otomatis ngecek batas 70 karakter judul tanpa koma haram, menyusun tepat 49 keywords teroptimasi algoritma Adobe Sensei, dan menyaring kata-kata terlarang (`alpha`, `transparent`, dsb.) biar aset Anda nggak kena razia kurator galak.
* **🌑 Mode Black Solid & Alpha ProRes:**  
  Mendukung render latar hitam pekat `#000000` (mode favorit video editor untuk blend *Screen/Add*) serta transparan murni Apple ProRes 4444 jika Anda memang butuh alpha channel.

---

## 🛠️ Cara Pake (Gampang, Bocil Juga Paham)

### 1. Instalasi (Cuma Sekali Seumur Hidup)

```bash
# Clone repo ini, lalu pasang dependensinya
npm install

# Kalau di laptop belum ada Google Chrome / Edge, install chromium:
npx playwright install chromium
```

### 2. Buka Studio Preview Lokal

Pengen liat animasi HTML Anda sebelum dipanggang jadi video? Buka studio dashboard:
```bash
npm run preview
```
Buka browser di `http://localhost:5173`. Anda bisa gonta-ganti aset dan utak-atik preset secara instan tanpa perlu F5 sampai keyboard jebol.

### 3. Cek Kesehatan Aset

Pastikan aset Anda patuh standar microstock (durasi 5–60 detik, resolusi genap, dsb.):
```bash
node core/render.mjs assets/nama_aset.html --info
```

### 4. Render Manual di Laptop Sendiri (Kalau Lagi Gabut)

```bash
# Render Black Solid H.264 4K (Standar Stock Footage Overlay)
node core/render.mjs assets/nama_aset.html --bg black --out out/video-kece.mp4

# Render Transparan Murni (Apple ProRes 4444 MOV)
node core/render.mjs assets/nama_aset.html --bg alpha --out out/video-transparan.mov

# Cuma mau ambil 1 lembar poster 4K buat thumbnail? Cepat kilat:
node core/render.mjs assets/nama_aset.html --poster-only --out out/poster.jpg
```

---

## ☁️ Cara Sultan: Render Otomatis di GitHub Actions

Ini cara paling elegan buat orang yang menghargai waktu tidur:

1. **Taruh semua file HTML Anda** di dalam folder `assets/`.
2. **Push ke GitHub:**
   ```bash
   git add .
   git commit -m "feat: aset baru siap panen"
   git push origin main
   ```
3. **Pencet Tombol Ajaib:**
   - Masuk ke tab **Actions** di repositori GitHub Anda.
   - Pilih workflow **Render Video Aset**.
   - Klik **Run workflow** (biarkan `asset` tetap terisi `all` dan `bg` tetap `black`).
4. **Tidur / Ngopi Santai:**
   - Puluhan runner virtual machine di cloud bakal bekerja serentak merender semua file HTML Anda secara paralel.
5. **Download Hasil Panen:**
   - Saat workflow kelar, gulir ke bawah ke bagian **Artifacts**.
   - Klik **`all-rendered-videos`**.
   - Tara! Anda dapet satu file zip berisi seluruh video 4K, thumbnail 4K, plus file CSV metadata yang tinggal Anda lempar ke Adobe Stock.

---

## 📁 Struktur Folder (Biar Gak Nyasar)

```text
├── assets/             # Taruh file HTML5 Canvas Anda di sini (jangan aneh-aneh)
├── core/
│   ├── render.mjs      # Otak utama: pengendali Playwright & pipa FFmpeg
│   ├── serve.mjs       # Server lokal buat nongkrongin preview
│   └── batch.mjs       # Skrip batch lokal
├── metadata/           # Gudang metadata CSV, laporan riset, & preview audit
│   ├── adobe_stock_metadata.csv   # File CSV resmi yang disuapkan ke Adobe Stock
│   └── previews/                  # Screenshot bukti visual t=2.5s
├── .github/workflows/
│   └── render.yml      # Mandor GitHub Actions (Matrix parallel execution)
└── package.json        # Surat izin mengemudi Node.js
```

---

## 💡 FAQ (Pertanyaan yang Sering Ditanyain Orang Malas Baca)

**T: Kenapa videonya berlatar hitam solid, bukan transparan (alpha)?**  
*J: Karena di dunia video editor, klip kilau emas, api, dan partikel glow jauh lebih bersih dan bebas noda abu-abu kotor (*dark fringing*) kalau dirender di atas latar hitam pekat. Pembeli tinggal ubah Blend Mode ke **Screen** atau **Add** di Premiere/CapCut/DaVinci, dan latarnya langsung lenyap seketika.*

**T: Boleh nggak bikin yang beneran transparan?**  
*J: Boleh banget! Tapi pastikan kode HTML Canvas Anda pakai `ctx.clearRect()` bukan `ctx.fillRect('#000000')`. Kalau kanvasnya udah dicat hitam dari sononya, dirender pakai codec malaikat pun hasilnya bakal tetep hitam.*

**T: Apakah saya bakal kaya raya setelah pakai engine ini?**  
*J: Tergantung seberapa rajin Anda nyuruh AI bikin animasi HTML Canvas dan seberapa hoki aset Anda dibeli agensi luar negeri. Tapi yang jelas, laptop Anda nggak bakal meledak lagi gara-gara ngerender After Effects.*

---

*Dibuat dengan rasa malas merender lokal, secangkir kopi, dan algoritma matematika Canvas 2D.*
