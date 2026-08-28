import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithCredential, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { firebaseConfig, GOOGLE_CLIENT_ID } from "./firebase-config.js";

const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const provider = new GoogleAuthProvider();

export function initGoogleSignIn({ onSuccess, onError }) {
  if (!window.google?.accounts?.id) {
    setTimeout(() => initGoogleSignIn({onSuccess,onError}), 300);
    return;
  }

  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: async (response) => {
      try {
        const credential = GoogleAuthProvider.credential(response.credential);
        const result = await signInWithCredential(auth, credential);
        onSuccess?.(result.user);
      } catch (err) {
        console.error(err);
        onError?.(err);
      }
    },
    auto_select: false,
    cancel_on_tap_outside: true
  });

  google.accounts.id.renderButton(document.getElementById("googleButton"), {
    theme: "outline",
    size: "large",
    width: 360,
    text: "continue_with",
    shape: "pill",
    logo_alignment: "left"
  });
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
