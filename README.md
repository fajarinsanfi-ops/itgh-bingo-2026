# ITGH Bingo 2026 — GIS + Firebase + Google Sites

Project ini merombak prototype `index(3).html` menjadi struktur yang lebih rapi:

```text
itgh-bingo-2026/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── app.js
│   ├── auth.js
│   ├── db.js
│   ├── firebase-config.js
│   └── data/
│       └── boards.js
├── firestore.rules
├── storage.rules
└── README.md
```

## 1. Yang sudah dibuat

- Google Identity Services (GIS) untuk tombol **Continue with Google**.
- Firebase Authentication untuk session login.
- Bisa login menggunakan akun Google/Gmail yang diizinkan oleh konfigurasi project.
- Firebase Firestore untuk menyimpan submission secara persisten.
- Firebase Storage untuk menyimpan file evidence.
- Data terikat ke `user.uid`, sehingga submission tidak tercampur antar personel.
- Board A, B, C dipisahkan di `js/data/boards.js` dan seluruh 25 kotak dari prototype dipertahankan.
- Light / Dark mode.
- Animasi futuristik, glow, grid, floating ambient, progress animation.
- Responsive untuk desktop/mobile.
- File HTML, CSS, JS dipisah.
- Duplicate submission untuk square yang sama pada board/week yang sama dicegah di sisi UI.

## 2. Firebase setup

1. Buka Firebase Console.
2. Create project.
3. Add Web App.
4. Copy Firebase Web App configuration ke:
   `js/firebase-config.js`
5. Authentication -> Sign-in method -> enable **Google**.
6. Firestore Database -> Create database.
7. Storage -> Get started.
8. Deploy rules:
   - `firestore.rules`
   - `storage.rules`

## 3. Google Cloud OAuth / GIS

Buat OAuth 2.0 Client ID tipe **Web application**.

Authorized JavaScript origins harus berisi domain tempat aplikasi ini di-host.

Contoh jika GitHub Pages:
```text
https://USERNAME.github.io
```

Contoh jika custom domain:
```text
https://healthchallenge.example.com
```

Masukkan Client ID ke:
```js
export const GOOGLE_CLIENT_ID =
  "1234567890-xxxxxxxx.apps.googleusercontent.com";
```

Jangan memasukkan secret client ke frontend. Web Client ID memang boleh berada di frontend.

## 4. Hosting

Pilihan paling sederhana:

### GitHub Pages

Upload seluruh folder ke repository, lalu:
Settings -> Pages -> Deploy from branch.

URL misalnya:
```text
https://username.github.io/itgh-bingo-2026/
```

Tambahkan origin tersebut ke Google Cloud OAuth Client.

### Firebase Hosting

Alternatif yang lebih cocok jika seluruh backend juga Firebase:
```bash
firebase init hosting
firebase deploy
```

## 5. Embed ke Google Sites

Google Sites dapat meng-embed halaman website melalui URL.

Di Google Sites:
`Insert -> Embed -> By URL`

Masukkan URL hosting aplikasi, misalnya:
```text
https://username.github.io/itgh-bingo-2026/
```

Atur ukuran frame sesuai kebutuhan.

## 6. Penting tentang login

Jangan memakai tombol login palsu seperti prototype lama:

```js
function login(){
  // prototype
}
```

Versi ini menggunakan:
GIS -> Google credential -> Firebase Authentication -> Firestore.

Dengan demikian identitas personel benar-benar berasal dari akun Google yang login.

## 7. Untuk akun Gmail apa pun

Jika ingin semua Google Account/Gmail dapat login:
- OAuth consent / app configuration jangan dibatasi hanya organisasi internal.
- Firebase Authentication Google provider harus aktif.
- Pastikan domain hosting masuk Authorized JavaScript origins.

Jika ini aplikasi internal perusahaan dan hanya akun Google Workspace perusahaan yang boleh masuk, tambahkan pembatasan domain/email di layer aplikasi dan rules/backend.

## 8. Catatan keamanan

Client-side Firebase config bukan password/secret. Namun Firestore dan Storage Rules wajib dipasang.

Jangan pernah menaruh:
- service account JSON
- private key
- OAuth client secret

di repository frontend.

## 9. Deploy checklist

Sebelum production:

- [ ] Firebase Auth Google enabled
- [ ] Firestore created
- [ ] Storage created
- [ ] Firestore rules deployed
- [ ] Storage rules deployed
- [ ] OAuth Web Client created
- [ ] Authorized JavaScript origins configured
- [ ] Firebase config filled
- [ ] GOOGLE_CLIENT_ID filled
- [ ] App hosted on HTTPS
- [ ] Hosted URL added to Firebase Authorized Domains
- [ ] URL tested directly before embedding in Google Sites
- [ ] Google Sites embeds the hosted URL

