# ITGH Bingo 2026 — Health Challenge

Web application untuk **ITGH Health Challenge 2026** dengan Google Sign-In, Firebase, Bingo A/B/C, challenge submission, evidence, shared team progress, Achievement & Badge, statistics, podium leaderboard, dan Quiz ITGH.

## 🌐 Live App

- Main App: https://fajarinsanfi-ops.github.io/itgh-bingo-2026/
- Statistics & Leaderboard: https://fajarinsanfi-ops.github.io/itgh-bingo-2026/stats.html

## ✨ Features

- Google Identity Services (GIS) + Firebase Authentication.
- Setiap personel bebas memilih **BINGO A, BINGO B, atau BINGO C**.
- Progress terpisah untuk **Week 1–4**.
- **Team Board:** semua user yang login dapat melihat progress dan submission anggota tim.
- Satu aktivitas tetap dapat dikerjakan oleh banyak personel; completion bersifat per-user.
- Challenge submission dengan achievement dan evidence.
- Evidence disimpan di Firebase Storage.
- Submission persisten di Cloud Firestore.
- Light / Dark mode.
- Futuristic responsive UI dan animasi.
- Achievement & Badge Center.
- Statistics dashboard, leaderboard, dan animated podium Top 3.
- **Quiz ITGH** dengan status per-person per Bingo/Week.
- Duplicate submission dicegah untuk kombinasi user + Bingo + Week + Activity.

## 👥 Team Board

Aplikasi saat ini diasumsikan digunakan oleh **satu tim**. Karena itu halaman utama menggunakan shared team view.

Untuk Bingo + Week yang sedang dipilih:

- Progress bar menunjukkan jumlah activity unik yang sudah diselesaikan tim.
- Cell yang sudah memiliki submission menampilkan nama personel.
- Activity Log menampilkan submission seluruh anggota tim.
- Personel tetap bebas memilih activity yang sama dengan personel lain.
- Data antar Bingo dan Week tetap terisolasi.

### Future multi-team

Fungsi personal/private `listenSubmissions()` di `js/db.js` sengaja dipertahankan untuk kebutuhan growth. Jika aplikasi berkembang menjadi beberapa tim, tambahkan `teamId` pada user/submission lalu scope query berdasarkan team.

## 🧠 Quiz ITGH

Quiz ITGH pada setiap board sekarang menggunakan form status sederhana:

```text
○ Belum dikerjakan   ← default
○ Sudah dikerjakan
```

Tidak ada lagi pertanyaan pilihan ganda pada UI utama.

Status disimpan di Firestore sebagai submission dengan:

```text
challengeIndex = -1
```

ID dokumen mengikuti konteks:

```text
{userId}_B{variant}_W{week}_C-1
```

Dengan demikian setiap personel dapat memiliki status Quiz sendiri untuk:

```text
Bingo A + Week 1
Bingo A + Week 2
Bingo B + Week 1
...
Bingo C + Week 4
```

Status Quiz tidak dihitung sebagai completed activity pada progress board.

> Logika quiz lama yang berupa pertanyaan/validasi jawaban sengaja tidak dihapus dari `js/app.js`; modul `js/quiz-status.js` mengambil alih UI Quiz ITGH. Ini memudahkan pengaktifan kembali model quiz berbasis pertanyaan ketika diperlukan.

## 🏅 Achievement & Badge

Badge dihitung dari submission personal:

| Badge | Syarat |
|---|---|
| 🏃 First Step | 1 aktivitas selesai |
| ⚡ Getting Active | 5 aktivitas selesai |
| 🔥 On Fire | 10 aktivitas selesai |
| 💎 25 Strong | 25 aktivitas selesai |
| 🧭 Bingo Explorer | Berpartisipasi di Bingo A, B, dan C |
| 📅 Week Warrior | Aktif pada Week 1–4 |
| 📸 Evidence Hero | 5 aktivitas dengan evidence |
| 🧠 Quiz Master | 3 Quiz ITGH selesai |

Achievement menggunakan data Firestore secara real-time.

## 🏆 Statistics & Podium

Halaman Statistics menampilkan:

- Total Submitters
- Total Submissions
- Completed Activities
- Total Points
- Your Rank
- Your Statistics
- Progress Bingo A/B/C
- Top Performers
- Submitter Statistics
- Recent Submissions
- Animated Top 3 Podium

Filter tersedia untuk Bingo dan Week.

Ranking memprioritaskan:

1. Total Points
2. Completed Activities
3. Total Submissions

## 💾 Firestore Persistence

Collection utama:

```text
users/{userId}
submissions/{submissionId}
```

Submission menggunakan deterministic document ID:

```text
{userId}_B{variant}_W{week}_C{challengeIndex}
```

Contoh:

```text
UID_BA_W1_C0
UID_BA_W2_C0
UID_BB_W3_C21
UID_BC_W4_C21
UID_BA_W1_C-1    # Quiz
```

Struktur ini memisahkan user, Bingo, Week, dan Activity serta mencegah duplicate submission pada konteks yang sama.

## 🗂️ Project Structure

```text
itgh-bingo-2026/
│
├── index.html
├── stats.html
├── README.md
├── firestore.rules
├── storage.rules
│
├── css/
│   ├── styles.css
│   ├── stats.css
│   ├── achievements.css
│   ├── team-progress.css
│   ├── podium.css
│   └── quiz-status.css
│
└── js/
    ├── app.js
    ├── auth.js
    ├── db.js
    ├── stats.js
    ├── achievements.js
    ├── team-progress.js
    ├── podium.js
    ├── quiz-status.js
    ├── firebase-config.js
    └── data/
        └── boards.js
```

## 🔥 Firebase Setup

Project menggunakan:

- Firebase Authentication / Google provider
- Cloud Firestore
- Firebase Storage

Aktifkan Google Sign-In melalui:

```text
Firebase Console
→ Authentication
→ Sign-in providers
→ Google
```

### Firestore Rules

File `firestore.rules` di GitHub adalah source file dan **tidak otomatis dipublish ke Firebase**.

Rules untuk model satu tim saat ini harus memungkinkan authenticated user membaca submission tim:

```text
allow read: if request.auth != null;
```

Create/update/delete tetap dibatasi berdasarkan Firebase UID pemilik submission.

Setelah rules berubah:

```text
Firebase Console
→ Firestore Database
→ Rules
→ Paste/verify rules
→ Publish
```

### Storage

Evidence disimpan berdasarkan path user. Jangan membuka akses Storage secara publik tanpa kebutuhan yang jelas.

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

> Jangan pernah menaruh OAuth Client Secret, service account JSON, private key, atau Firebase Admin credentials di frontend/repository.

## 🚀 GitHub Pages

Pastikan GitHub Pages menggunakan branch:

```text
main
```

Setelah commit:

1. Tunggu deployment selesai.
2. Buka URL production.
3. Jika asset lama masih tampil, lakukan hard refresh (`Ctrl + Shift + R`).

## 🌐 Google Sites Embed

Gunakan URL GitHub Pages:

```text
https://fajarinsanfi-ops.github.io/itgh-bingo-2026/
```

Di Google Sites:

```text
Insert → Embed → By URL
```

Google Sites hanya menjadi container; authentication, Firestore, Storage, dan application logic tetap berjalan dari GitHub Pages/Firebase.

## 🖥️ Local Development

Karena menggunakan ES Modules, jalankan melalui web server. Jangan membuka `index.html` langsung melalui `file://`.

Contoh:

```text
http://localhost:5500/
```

## 🛠️ Troubleshooting

### `401 invalid_client`

Periksa Web Client ID dan Authorized JavaScript origins.

### Firestore `permission-denied`

Periksa rules **yang aktif di Firebase Console**, bukan hanya `firestore.rules` di GitHub. Pastikan authenticated user dapat membaca `submissions` jika leaderboard/team board digunakan.

### Data hilang setelah reload

Periksa user sudah login, Firestore berisi dokumen, rules mengizinkan read, dan lakukan hard refresh.

### Halaman `Not Responding`

Periksa Console browser. Hindari DOM observer yang merender ulang elemen yang sama. Achievement dan Team Board saat ini tidak menggunakan `MutationObserver` untuk render loop.

### CSS tidak terbaca

Pastikan path relatif dan struktur folder benar:

```html
<link rel="stylesheet" href="./css/styles.css">
<link rel="stylesheet" href="./css/achievements.css">
<link rel="stylesheet" href="./css/team-progress.css">
<link rel="stylesheet" href="./css/quiz-status.css">
```

## 🔒 Security Notes

- Firebase Web configuration bukan password, tetapi Security Rules wajib benar.
- Jangan commit OAuth Client Secret atau service account credentials.
- Submission create/update/delete harus dibatasi berdasarkan authenticated Firebase UID.
- Evidence Storage dibatasi berdasarkan user path.
- Jika privacy leaderboard perlu diperketat saat aplikasi growth, gunakan data agregat/backend daripada mengekspos seluruh submission mentah ke browser.

## 🧭 Gamification Roadmap

```text
✅ Achievement & Badge
⬜ Streak System
⬜ Bingo Winning System
✅ Podium Leaderboard
⬜ Admin Dashboard
```

Admin Dashboard sengaja ditunda sampai jumlah participant/team berkembang. Arsitektur saat ini mempertahankan listener personal dan catatan `FUTURE / GROWTH` agar migrasi ke multi-team dapat dilakukan tanpa membuang fungsi yang sudah baik.

## 📄 License

Internal ITGH Health Challenge 2026 project.
