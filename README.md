# ITGH Bingo 2026 — Health Challenge

Web application untuk **ITGH Health Challenge 2026** dengan Google Sign-In, Firebase, Bingo A/B/C, challenge submission, evidence, progress, **Achievement & Badge**, statistics, dan leaderboard.

## 🌐 Live App

- Main App: https://fajarinsanfi-ops.github.io/itgh-bingo-2026/
- Statistics & Leaderboard: https://fajarinsanfi-ops.github.io/itgh-bingo-2026/stats.html

## ✨ Features

- Google Identity Services (GIS) + Firebase Authentication.
- Setiap personel bebas memilih **BINGO A, BINGO B, atau BINGO C**.
- Progress terpisah untuk **Week 1–4**.
- Challenge submission dengan achievement dan evidence.
- Evidence disimpan di Firebase Storage.
- Submission disimpan persisten di Cloud Firestore.
- Light / Dark mode.
- Futuristic responsive UI dan animasi.
- **Achievement & Badge Center** dengan milestone personal.
- Statistics dashboard dan leaderboard.
- Duplicate submission dicegah untuk kombinasi user + Bingo + Week + Activity yang sama.

## 🏅 Achievement & Badge System

Setiap personel memiliki Achievement Center pada halaman utama. Badge dihitung dari seluruh submission milik user sehingga tidak terikat pada Bingo/Week yang sedang dipilih.

Badge yang tersedia:

| Badge | Syarat |
|---|---|
| 🏃 First Step | 1 aktivitas selesai |
| ⚡ Getting Active | 5 aktivitas selesai |
| 🔥 On Fire | 10 aktivitas selesai |
| 💎 25 Strong | 25 aktivitas selesai |
| 🧭 Bingo Explorer | Berpartisipasi di Bingo A, B, dan C |
| 📅 Week Warrior | Aktif pada Week 1, 2, 3, dan 4 |
| 📸 Evidence Hero | 5 aktivitas dengan evidence |
| 🧠 Quiz Master | 3 Quiz ITGH selesai |

Badge yang belum tercapai tetap ditampilkan sebagai **locked** dengan progress menuju milestone.

Achievement dihitung dari data Firestore secara real-time sehingga badge akan berubah setelah submission berhasil tersimpan.

> Achievement & Badge adalah tahap gamification pertama. **Streak, Bingo Winning System, dan Podium Leaderboard** akan dikembangkan sebagai tahap berikutnya agar logika masing-masing fitur tetap terpisah dan mudah dipelihara.

## 🎯 Bingo & Week Context

Setiap aktivitas memiliki konteks unik:

```text
Google User + Bingo + Week + Activity
```

Contoh:

```text
BINGO A + Week 1 + Activity #1
BINGO A + Week 2 + Activity #1
BINGO B + Week 1 + Activity #1
BINGO C + Week 4 + Activity #1
```

Keempatnya merupakan submission yang berbeda. Progress pada satu Bingo/Week tidak boleh terbawa ke Bingo atau Week lain.

## 📝 Challenge Submission

User dapat memilih challenge lalu mengisi:

- Hasil / achievement
- Evidence file (opsional sesuai challenge/form)

Setelah berhasil disimpan:

1. Submission masuk ke Firestore.
2. Modal challenge ditutup.
3. Form di-reset.
4. Challenge menjadi completed.
5. Progress dan activity log diperbarui.
6. Achievement Center menerima data submission terbaru.

Jika save/upload gagal, modal tetap terbuka agar input tidak hilang.

## 💾 Firestore Persistence

Collection utama:

```text
users/{userId}
submissions/{submissionId}
```

Submission baru menggunakan deterministic document ID berdasarkan:

```text
{userId}_B{variant}_W{week}_C{challengeIndex}
```

Contoh:

```text
UID_BA_W1_C0
UID_BA_W1_C4
UID_BB_W3_C21
UID_BC_W4_C21
```

Hal ini memisahkan data antar user, Bingo, Week, dan Activity sekaligus mencegah duplicate submission untuk konteks yang sama.

## 📊 Statistics & Leaderboard

Dashboard tersedia di:

```text
https://fajarinsanfi-ops.github.io/itgh-bingo-2026/stats.html
```

Menampilkan:

- Total Submitters
- Total Submissions
- Completed Activities
- Total Points
- Your Rank
- Your Statistics
- Progress BINGO A/B/C
- Top Performers
- Submitter Statistics
- Recent Submissions

Filter:

- All Bingo / Bingo A / Bingo B / Bingo C
- All Weeks / Week 1 / Week 2 / Week 3 / Week 4

Ranking memprioritaskan:

1. Total Points
2. Completed Activities
3. Total Submissions

## 🗂️ Project Structure

```text
itgh-bingo-2026/
│
├── index.html                 # Main application
├── stats.html                 # Statistics & leaderboard
├── README.md
├── firestore.rules            # Firestore security rules
├── storage.rules              # Firebase Storage security rules
│
├── css/
│   ├── styles.css             # Main application styles
│   ├── stats.css              # Statistics page styles
│   └── achievements.css       # Achievement & badge styles
│
└── js/
    ├── app.js                 # Main application logic
    ├── auth.js                # Google/Firebase authentication
    ├── db.js                  # Firestore & Storage data layer
    ├── stats.js               # Statistics & leaderboard logic
    ├── achievements.js        # Achievement & badge logic
    ├── firebase-config.js      # Firebase Web configuration
    │
    └── data/
        └── boards.js           # Bingo board and challenge data
```

## 🔥 Firebase Setup

Project menggunakan:

- Firebase Authentication
- Google Authentication Provider
- Cloud Firestore
- Firebase Storage

### Authentication

Enable Google pada:

```text
Firebase Console
→ Authentication
→ Sign-in providers
→ Google
```

### Firestore

Gunakan database Firestore yang sudah ada pada project. **Tidak perlu membuat database kedua dengan database ID yang sama.**

### Rules

`firestore.rules` di repository adalah source file untuk rules, tetapi perubahan di GitHub **tidak otomatis dipublish ke Firebase**.

Setelah rules berubah:

```text
Firebase Console
→ Firestore Database
→ Rules
→ Paste/verify rules
→ Publish
```

Statistics/leaderboard membutuhkan authenticated user dapat membaca submission yang diperlukan untuk perhitungan ranking. Achievement Center hanya membutuhkan submission milik user yang sedang login.

## 🔑 Google OAuth / GIS

Buat OAuth 2.0 Client ID tipe **Web application**.

Production Authorized JavaScript origin:

```text
https://fajarinsanfi-ops.github.io
```

Local development:

```text
http://localhost:5500
http://127.0.0.1:5500
```

Client ID digunakan di `js/firebase-config.js`/konfigurasi auth sesuai implementasi aplikasi.

> **Jangan pernah menaruh OAuth Client Secret, service account JSON, private key, atau Firebase Admin credentials di frontend/repository.**

Web Client ID sendiri bukan secret dan memang dapat digunakan di frontend.

## 🚀 GitHub Pages Deployment

Repository menggunakan GitHub Pages.

Pastikan Pages menggunakan branch:

```text
main
```

Setelah commit:

1. Tunggu GitHub Pages selesai deploy.
2. Buka URL production.
3. Gunakan hard refresh (`Ctrl + Shift + R`) bila browser masih menyimpan asset lama.

## 🌐 Google Sites Embed

Main app:

```text
https://fajarinsanfi-ops.github.io/itgh-bingo-2026/
```

Statistics:

```text
https://fajarinsanfi-ops.github.io/itgh-bingo-2026/stats.html
```

Di Google Sites:

```text
Insert → Embed → By URL
```

Masukkan URL GitHub Pages di atas.

Aplikasi tetap menjalankan authentication, Firestore, Storage, dan application logic dari hosting/Firebase; Google Sites berfungsi sebagai container/embed.

## 🖥️ Local Development

Karena menggunakan ES Modules, jalankan melalui web server. Jangan membuka `index.html` langsung melalui `file://`.

Contoh VS Code Live Server:

```text
http://localhost:5500/
```

Pastikan origin lokal tersebut sudah terdaftar pada Google OAuth jika login Google diuji secara lokal.

## 🛠️ Troubleshooting

### `401 invalid_client`

Periksa:

- OAuth Client ID adalah Web Client ID.
- Client ID tidak salah ketik.
- Authorized JavaScript origins sesuai domain yang sedang dibuka.
- Domain production menggunakan HTTPS.
- Jangan menggunakan Client Secret sebagai Client ID.

### Firestore `permission-denied`

Periksa rules yang **aktif di Firebase Console**, bukan hanya file `firestore.rules` di GitHub.

Jika Statistics membaca seluruh `submissions`, authenticated user harus memiliki permission read yang sesuai untuk kebutuhan leaderboard.

Setelah memperbarui rules di Firebase Console, klik **Publish**.

### Data hilang setelah reload

Periksa:

- User sudah login.
- Firestore database sudah dibuat.
- Collection `submissions` berisi dokumen.
- Firestore Rules mengizinkan read untuk user yang sesuai.
- Browser tidak sedang menggunakan versi JavaScript lama; lakukan hard refresh.

### CSS tidak terbaca

Gunakan path relatif dan perhatikan huruf besar/kecil:

```html
<link rel="stylesheet" href="./css/styles.css">
<link rel="stylesheet" href="./css/achievements.css">
```

Struktur harus sesuai:

```text
index.html
css/styles.css
css/achievements.css
js/app.js
js/achievements.js
```

## 🔒 Security Notes

- Firebase Web configuration bukan password, tetapi Security Rules wajib dikonfigurasi dengan benar.
- Jangan commit OAuth Client Secret atau service account credentials.
- Submission create/update/delete harus dibatasi berdasarkan authenticated Firebase UID.
- Evidence Storage harus dibatasi berdasarkan user path.
- Jika leaderboard production perlu privacy lebih ketat, pertimbangkan membuat statistik agregat melalui backend/Cloud Functions sehingga browser tidak perlu membaca seluruh submission mentah.

## 📌 Application Flow

```text
Google Sign-In
      │
      ▼
Firebase Authentication
      │
      ▼
Authenticated User
      │
      ├───────────────┬────────────────┐
      ▼               ▼                ▼
 BINGO A/B/C      Statistics      Achievements
      │               │                │
      ▼               ▼                ▼
  Week 1–4       Leaderboard       Badge System
      │
      ▼
   Activity
      │
      ├── Achievement
      └── Evidence
      │
      ▼
Firestore + Storage
```

## 🧭 Gamification Roadmap

```text
PHASE 1
✅ Achievement & Badge

PHASE 2
⬜ Streak System
⬜ Bingo Winning System

PHASE 3
⬜ Podium Leaderboard

PHASE 4
⬜ Admin Dashboard
```

Admin Dashboard sengaja ditunda sampai jumlah participant/team berkembang sehingga arsitektur admin dapat dibuat berdasarkan kebutuhan operasional yang lebih nyata.

## 📄 License

Internal ITGH Health Challenge 2026 project.
