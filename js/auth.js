import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithCredential, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { firebaseConfig, GOOGLE_CLIENT_ID } from "./firebase-config.js";

const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const provider = new GoogleAuthProvider();

let googleSignInInitialized = false;
let googleSignInAttempts = 0;
let signInInProgress = false;
const MAX_GOOGLE_SIGNIN_ATTEMPTS = 30;
const GOOGLE_SIGNIN_RETRY_MS = 300;
const FIREBASE_SIGNIN_TIMEOUT_MS = 15000;

function showGoogleSignInError(message) {
  const errorEl = document.getElementById("loginError");
  if (!errorEl) return;
  errorEl.textContent = message;
  errorEl.hidden = false;
}

function showGoogleSignInStatus(message) {
  const errorEl = document.getElementById("loginError");
  if (!errorEl) return;
  errorEl.textContent = message;
  errorEl.hidden = false;
  errorEl.style.color = "";
}

function friendlyAuthError(err) {
  const code = err?.code || "";
  const messages = {
    "auth/invalid-credential": "Credential Google tidak valid atau sudah kedaluwarsa. Silakan login lagi.",
    "auth/invalid-api-key": "Firebase API key tidak valid. Periksa konfigurasi Firebase.",
    "auth/operation-not-allowed": "Login Google belum diaktifkan di Firebase Authentication.",
    "auth/unauthorized-domain": "Domain aplikasi belum diizinkan di Firebase Authentication.",
    "auth/network-request-failed": "Koneksi ke Firebase gagal. Periksa koneksi internet lalu coba lagi.",
    "auth/too-many-requests": "Terlalu banyak percobaan login. Tunggu sebentar lalu coba lagi.",
    "auth/internal-error": "Firebase mengalami error internal. Silakan coba lagi."
  };
  return messages[code] || `Login Google gagal (${code || "unknown error"}). Silakan coba lagi.`;
}

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error("Firebase sign-in timed out");
      error.code = "auth/sign-in-timeout";
      reject(error);
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export function initGoogleSignIn({ onSuccess, onError }) {
  if (googleSignInInitialized) return;

  const buttonEl = document.getElementById("googleButton");
  if (!buttonEl) {
    showGoogleSignInError("Tombol login Google tidak dapat dimuat. Silakan refresh halaman.");
    onError?.(new Error("Google sign-in button container not found"));
    return;
  }

  if (!window.google?.accounts?.id) {
    googleSignInAttempts += 1;
    if (googleSignInAttempts <= MAX_GOOGLE_SIGNIN_ATTEMPTS) {
      setTimeout(() => initGoogleSignIn({ onSuccess, onError }), GOOGLE_SIGNIN_RETRY_MS);
      return;
    }

    const error = new Error("Google Identity Services could not be loaded");
    console.error(error);
    showGoogleSignInError("Login Google belum dapat dimuat. Pastikan koneksi internet aktif lalu refresh halaman.");
    onError?.(error);
    return;
  }

  try {
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (response) => {
        if (signInInProgress) return;
        signInInProgress = true;
        showGoogleSignInStatus("Memverifikasi akun Google...");

        try {
          if (!response?.credential) {
            const error = new Error("Google credential is missing");
            error.code = "auth/missing-google-credential";
            throw error;
          }

          const credential = GoogleAuthProvider.credential(response.credential);
          const result = await withTimeout(
            signInWithCredential(auth, credential),
            FIREBASE_SIGNIN_TIMEOUT_MS
          );

          document.getElementById("loginError")?.setAttribute("hidden", "");
          onSuccess?.(result.user);
        } catch (err) {
          console.error("GOOGLE FIREBASE SIGN-IN ERROR:", err);
          showGoogleSignInError(
            err?.code === "auth/sign-in-timeout"
              ? "Verifikasi Firebase terlalu lama (>15 detik). Periksa koneksi internet dan konfigurasi Firebase Authentication."
              : friendlyAuthError(err)
          );
          onError?.(err);
        } finally {
          signInInProgress = false;
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true
    });

    google.accounts.id.renderButton(buttonEl, {
      theme: "outline",
      size: "large",
      width: 360,
      text: "continue_with",
      shape: "pill",
      logo_alignment: "left"
    });

    googleSignInInitialized = true;
    googleSignInAttempts = 0;
  } catch (err) {
    console.error(err);
    showGoogleSignInError("Login Google belum dapat dimuat. Silakan refresh halaman.");
    onError?.(err);
  }
}

export function watchAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function logout() {
  try {
    await signOut(auth);
    if (window.google?.accounts?.id) google.accounts.id.disableAutoSelect();
  } catch (err) {
    console.error(err);
  }
}
