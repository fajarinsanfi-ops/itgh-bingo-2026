import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithCredential, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { firebaseConfig, GOOGLE_CLIENT_ID } from "./firebase-config.js";

const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const provider = new GoogleAuthProvider();

let googleSignInInitialized = false;
let googleSignInAttempts = 0;
const MAX_GOOGLE_SIGNIN_ATTEMPTS = 30;
const GOOGLE_SIGNIN_RETRY_MS = 300;

function showGoogleSignInError(message) {
  const errorEl = document.getElementById("loginError");
  if (!errorEl) return;
  errorEl.textContent = message;
  errorEl.hidden = false;
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

    // Keep the previous retry behavior for slow network/script loading,
    // but stop after a finite number of attempts so the page cannot loop forever.
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
        try {
          const credential = GoogleAuthProvider.credential(response.credential);
          const result = await signInWithCredential(auth, credential);
          onSuccess?.(result.user);
        } catch (err) {
          console.error(err);
          showGoogleSignInError("Login Google gagal. Silakan coba lagi.");
          onError?.(err);
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
