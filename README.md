# ITGH Bingo 2026 — Health Challenge

Web application untuk **ITGH Health Challenge 2026** dengan Google Sign-In, Firebase, Bingo A/B/C, challenge submission, link Strava, shared team progress, Achievement & Badge, statistics, podium leaderboard, dan Quiz ITGH.

## 🌐 Live App

- Main App: https://fajarinsanfi-ops.github.io/itgh-bingo-2026/
- Statistics & Leaderboard: https://fajarinsanfi-ops.github.io/itgh-bingo-2026/stats.html

## ✨ Features

- Google Identity Services (GIS) + Firebase Authentication.
- Setiap personel bebas memilih **BINGO A, BINGO B, atau BINGO C**.
- Progress terpisah untuk **Week 1–4**.
- **Team Board:** semua user yang login dapat melihat progress dan submission anggota tim.
- Satu aktivitas tetap dapat dikerjakan oleh banyak personel; completion bersifat per-user.
- Challenge submission dengan achievement.
- Link Strava sebagai bukti tambahan.
- Evidence file upload sementara dinonaktifkan; implementasi Firebase Storage tetap dipertahankan sebagai fitur legacy/future.
- Submission persisten di Cloud Firestore.
- Light / Dark mode.
- Futuristic responsive UI dan animasi.
- Achievement & Badge Center.
- Statistics dashboard, leaderboard, dan animated podium Top 3.
- **Quiz ITGH** dengan status per-person per Bingo/Week.
- Duplicate submission dicegah untuk kombinasi user + Bingo + Week + Activity.

## 🔗 Strava Link

Field Strava bersifat opsional. Aplikasi menerima dua format link HTTPS Strava:

```text
https://www.strava.com/activities/123456789
https://strava.com/activities/123456789
https://strava.app.link/AbCdEf123
```

Link selain domain Strava tersebut akan ditolak.

Nilai link disimpan pada submission Firestore sebagai:

```text
stravaUrl
```

Link ditampilkan pada Activity Log sebagai tombol **🏃 Strava**.

## 📎 Evidence File Upload

Upload file evidence **sementara dinonaktifkan** karena Firebase Storage belum digunakan pada tahap aplikasi saat ini.

Fungsi upload tidak dihapus agar dapat diaktifkan kembali pada pengembangan berikutnya. Implementasi legacy disimpan di `js/db.js` dan tidak digunakan oleh alur submission aktif.

Rencana ketika Storage diaktifkan kembali:

- JPG / PNG.
- Maksimum 5 MB per file.
- Validasi ukuran dan tipe file sebelum upload.
- Upload ke Firebase Storage.
- Simpan URL evidence pada Firestore setelah upload berhasil.

## 🧩 Latest Bingo Board

Layout **Bingo A, B, dan C** pada aplikasi sekarang sudah disesuaikan dengan artwork board terbaru yang diberikan.

- Setiap board berisi 25 activity dalam grid **5 × 5**.
- Urutan activity mengikuti posisi **kiri → kanan, atas → bawah** pada artwork terbaru.
- Nama activity, target, bobot poin, icon, dan warna activity mengikuti board terbaru.
- Warna `orange`, `red`, dan `blue` tetap digunakan sesuai posisi/kategori pada artwork.
- **Quiz ITGH tidak termasuk dalam 25 activity** dan tetap dirender sebagai panel terpisah di sisi kanan board.
- Sumber data board berada di `js/data/boards.js`.

> Jika artwork board direvisi lagi, cukup sesuaikan data di `js/data/boards.js` tanpa mengubah mekanisme submission, progress, statistics, atau leaderboard.

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

## 🗓️ Week Schedule

```text
Minggu 1 = 7 – 13 September 2026
Minggu 2 = 14 – 20 September 2026
Minggu 3 = 21 – 27 September 2026
Minggu 4 = 28 September – 4 Oktober 2026
```

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
│   ├── quiz-status.css
│   └── strava-form.css
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
    ├── strava-form.js
    ├── firebase-config.js
    └── data/
        └── boards.js
```
