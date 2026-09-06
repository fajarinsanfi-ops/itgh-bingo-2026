# ITGH Bingo 2026 — Health Challenge

Web application untuk **ITGH Health Challenge 2026** dengan Google Sign-In, Firebase, Bingo A/B/C, challenge submission, optional activity booking, link Strava, shared team progress, Achievement & Badge, statistics, podium leaderboard, Quiz ITGH, serta **Outdoor Activity Check**.

## 🌐 Live App

- Main App: https://fajarinsanfi-ops.github.io/itgh-bingo-2026/
- Statistics & Leaderboard: https://fajarinsanfi-ops.github.io/itgh-bingo-2026/stats.html

## ✨ Features

- Google Identity Services (GIS) + Firebase Authentication.
- Setiap personel bebas memilih **BINGO A, BINGO B, atau BINGO C**.
- Progress terpisah untuk **Week 1–4**.
- **Team Board:** semua user yang login dapat melihat progress dan submission anggota tim.
- Satu aktivitas tetap dapat dikerjakan oleh banyak personel; completion bersifat per-user.
- **Activity Booking opsional:** personel dapat booking activity dari challenge modal, tetapi tetap dapat langsung menyelesaikan activity tanpa booking.
- Booking ditampilkan pada board beserta jumlah personel yang sudah booking.
- Challenge submission dengan achievement.
- Link Strava sebagai bukti tambahan.
- **Outdoor Activity Check:** cuaca saat ini, kualitas udara/AQI, PM2.5, dan rekomendasi aktivitas outdoor.
- Default lokasi **Jakarta**, dengan pilihan kota lain dan opsi menggunakan lokasi perangkat.
- Evidence file upload sementara dinonaktifkan; implementasi Firebase Storage tetap dipertahankan sebagai fitur legacy/future.
- Submission dan booking persisten di Cloud Firestore.
- Light / Dark mode.
- Responsive UI dengan animated LED dot-matrix background.
- Typography menggunakan **Inter** sebagai font utama dan **Plus Jakarta Sans** untuk elemen UI yang sebelumnya menggunakan Orbitron.
- Achievement & Badge Center.
- Statistics dashboard, leaderboard, dan animated podium Top 3.
- **Quiz ITGH** dengan status per-person per Bingo/Week.
- Duplicate submission dicegah untuk kombinasi user + Bingo + Week + Activity.

## 🌤️ Outdoor Activity Check

Fitur ini membantu peserta menilai apakah kondisi lingkungan saat ini cukup mendukung aktivitas outdoor.

Informasi yang ditampilkan:

- Suhu dan kondisi cuaca saat ini.
- Apparent temperature / suhu terasa.
- Kelembapan.
- Curah hujan saat ini.
- Kecepatan angin.
- Air Quality Index (AQI).
- PM2.5.
- Rekomendasi: **Baik untuk Outdoor / Pertimbangkan / Batasi / Kurang Ideal / Tidak Disarankan**.

Lokasi default adalah **Jakarta, Indonesia**. Peserta dapat memilih kota lain dari daftar atau meminta koordinat perangkat melalui browser Geolocation.

Data saat ini diambil dari **Open-Meteo Weather API dan Open-Meteo Air Quality API**. API digunakan langsung dari browser dan tidak membutuhkan API key.

> Rekomendasi bersifat panduan umum, bukan diagnosis atau pengganti keputusan medis/profesional. Kondisi lokal dapat berubah dan peserta tetap perlu menggunakan penilaian pribadi yang wajar.

## 🛠️ Tech Stack

| Technology | Usage |
|---|---|
| **HTML5** | Struktur halaman Bingo & Statistics |
| **CSS3** | UI styling, responsive layout, theme, glassmorphism, animations |
| **JavaScript (ES Modules)** | Logic aplikasi frontend menggunakan native browser JavaScript |
| **Firebase Authentication** | Google Sign-In |
| **Cloud Firestore** | User profile, submissions, bookings, statistics |
| **Firebase Storage** | Disiapkan untuk future evidence upload |
| **Open-Meteo API** | Data cuaca dan kualitas udara |

### Frontend approach

Aplikasi menggunakan **Vanilla JavaScript** dengan native ES Modules dan tidak menggunakan framework frontend seperti React, Vue, atau Angular.

## 🔗 Strava Link

Field Strava bersifat opsional. Aplikasi menerima format link HTTPS Strava berikut:

```text
https://www.strava.com/activities/123456789
https://strava.com/activities/123456789
https://strava.app.link/AbCdEf123
```

Link selain domain Strava tersebut akan ditolak.

Nilai link disimpan pada submission Firestore sebagai `stravaUrl` dan ditampilkan pada Activity Log sebagai tombol **🏃 Strava**.

## 📌 Activity Booking

Booking activity bersifat **opsional**, bukan syarat untuk completion.

Alur pengguna:

1. Buka salah satu activity pada Bingo Board.
2. Pilih **📌 Book Activity** jika ingin mengambil activity tersebut.
3. Activity tetap dapat langsung disubmit meskipun belum pernah di-book.
4. Jika user sudah booking activity tersebut, tombol berubah menjadi **✓ You Booked**.
5. Satu activity dapat di-book oleh banyak personel secara independen.
6. Board menampilkan jumlah booking dan jumlah completion untuk activity tersebut.

Booking disimpan pada collection `bookings/{bookingId}` dengan document ID `{userId}_B{variant}_W{week}_C{challengeIndex}`.

> **Catatan Firebase:** collection `bookings` harus memiliki rule Firestore yang mengizinkan user terautentikasi membuat/membaca booking sesuai ownership. File `firestore.rules` di repository sudah mencakup rule tersebut.

## 📎 Evidence File Upload

Upload file evidence **sementara dinonaktifkan** karena Firebase Storage belum digunakan pada tahap aplikasi saat ini.

Fungsi upload tidak dihapus agar dapat diaktifkan kembali pada pengembangan berikutnya. Implementasi legacy disimpan di `js/db.js`.

## 🧩 Latest Bingo Board

Layout **Bingo A, B, dan C** sudah disesuaikan dengan artwork board terbaru.

- Setiap board berisi 25 activity dalam grid **5 × 5**.
- Urutan activity mengikuti posisi **kiri → kanan, atas → bawah**.
- Nama activity, target, bobot poin, icon, dan warna activity mengikuti board terbaru.
- Quiz ITGH tidak termasuk dalam 25 activity dan tetap dirender sebagai panel terpisah.
- Sumber data board berada di `js/data/boards.js`.

## 👥 Team Board

Aplikasi saat ini diasumsikan digunakan oleh **satu tim**. Untuk Bingo + Week yang sedang dipilih:

- Progress bar menunjukkan jumlah activity unik yang sudah diselesaikan tim.
- Activity Log menampilkan submission seluruh anggota tim.
- Booking menampilkan jumlah personel yang sudah mengambil activity.
- Personel tetap bebas memilih activity yang sama dengan personel lain.
- Data antar Bingo dan Week tetap terisolasi.

### Future multi-team

Fungsi personal/private `listenSubmissions()` di `js/db.js` sengaja dipertahankan untuk kebutuhan growth. Jika aplikasi berkembang menjadi beberapa tim, tambahkan `teamId` pada user/submission/booking lalu scope query berdasarkan team.

## 🧠 Quiz ITGH

Quiz ITGH menggunakan status per-person per Bingo/Week. Status disimpan di Firestore sebagai submission dengan `challengeIndex = -1` dan tidak dihitung sebagai completed activity pada progress board.

## 🏅 Achievement & Badge

Badge dihitung dari submission personal, termasuk First Step, Getting Active, On Fire, 25 Strong, Bingo Explorer, Week Warrior, Evidence Hero, dan Quiz Master.

## 🏆 Statistics & Podium

Halaman Statistics menampilkan Total Submitters, Total Submissions, Completed Activities, Total Points, Your Rank, statistik personal, Progress Bingo A/B/C, Top Performers, Submitter Statistics, Recent Submissions, dan animated Top 3 Podium.

Ranking memprioritaskan:

1. Total Points
2. Completed Activities
3. Total Submissions

## 💾 Firestore Persistence

Collection utama:

```text
users/{userId}
submissions/{submissionId}
bookings/{bookingId}
```

Submission menggunakan deterministic document ID `{userId}_B{variant}_W{week}_C{challengeIndex}`. Booking menggunakan pola ID yang sama dengan `challengeIndex` activity.

## 🗓️ Week Schedule

```text
Minggu 1 = 7 – 13 September 2026
Minggu 2 = 14 – 20 September 2026
Minggu 3 = 21 – 27 September 2026
Minggu 4 = 28 September – 4 Oktober 2026
```

## 🎨 UI / Visual

Tampilan saat ini menggunakan:

- **Inter** sebagai font utama untuk body dan general UI.
- **Plus Jakarta Sans** untuk label, metric, heading, button, dan elemen emphasis.
- Animated **LED dot-matrix background** dengan nuansa electric blue.
- Glassmorphism surface dan responsive layout.
- Light / Dark mode.
- Old corner ambient gradients tetap tersedia di CSS sebagai legacy code tetapi tidak ditampilkan pada UI aktif.

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
│   ├── typography.css
│   ├── stats.css
│   ├── achievements.css
│   ├── team-progress.css
│   ├── podium.css
│   ├── quiz-status.css
│   ├── strava-form.css
│   ├── booking.css
│   ├── outdoor-conditions.css
│   └── led-background.css
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
    ├── export-excel.js
    ├── booking.js
    ├── outdoor-conditions.js
    ├── led-background.js
    ├── firebase-config.js
    └── data/
        └── boards.js
```

## 🔐 Firebase Configuration

Aplikasi menggunakan Firebase Authentication untuk Google Sign-In dan Cloud Firestore untuk profile, submission, serta booking. Firebase Storage disiapkan untuk future evidence upload.

> Jangan menghapus fungsi legacy yang masih dikomentari hanya karena belum aktif. Beberapa bagian sengaja dipertahankan untuk memudahkan pengembangan fitur berikutnya tanpa mengganggu alur aktif saat ini.
