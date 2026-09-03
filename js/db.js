import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getFirestore, collection, query, where, onSnapshot, serverTimestamp, doc, setDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
// LEGACY / FUTURE FEATURE: Firebase Storage upload imports are intentionally disabled for now.
// import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";
import { firebaseConfig } from "./firebase-config.js";

const app = getApps()[0] || initializeApp(firebaseConfig);
export const db = getFirestore(app);
// LEGACY / FUTURE FEATURE: keep Storage initialization commented until file upload is re-enabled.
// export const storage = getStorage(app);

/*
LEGACY / FUTURE FEATURE: Evidence file upload is intentionally disabled for now.
Keep the original implementation here so it can be restored when Firebase Storage
is enabled/ready. The current app does not expose the file picker, so this function
must remain as a harmless compatibility stub for the existing app import.

export async function uploadEvidence(userId, file) {
  if (!file) return { url: "", name: "" };
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storageRef = ref(storage, `evidence/${userId}/${Date.now()}-${safeName}`);
  await uploadBytes(storageRef, file, { contentType: file.type || "application/octet-stream" });
  return { url: await getDownloadURL(storageRef), name: file.name };
}
*/

// Compatibility stub: upload is disabled, so no file is sent to Firebase Storage.
export async function uploadEvidence() {
  return { url: "", name: "" };
}

function buildSubmissionId({ userId, variant, week, challengeIndex }) {
  return `${userId}_B${String(variant).toUpperCase()}_W${Number(week)}_C${Number(challengeIndex)}`;
}

export async function saveSubmission(data) {
  if (!data?.userId) throw new Error("userId is required.");
  if (!["A", "B", "C"].includes(String(data.variant).toUpperCase())) throw new Error("variant must be A, B, or C.");
  if (!Number.isInteger(Number(data.week)) || Number(data.week) < 1) throw new Error("week must be a positive integer.");
  if (!Number.isInteger(Number(data.challengeIndex))) throw new Error("challengeIndex must be an integer.");

  const isChallenge = Number(data.challengeIndex) >= 0;
  const stravaInput = isChallenge ? document.getElementById("stravaInput") : null;
  const stravaUrl = stravaInput?.value?.trim() || "";

  if (stravaUrl) {
    try {
      const parsed = new URL(stravaUrl);
      const hostname = parsed.hostname.toLowerCase();
      const allowedHosts = ["strava.com", "www.strava.com", "strava.app.link"];
      if (parsed.protocol !== "https:" || !allowedHosts.includes(hostname)) {
        throw new Error("Strava link must use a valid Strava URL.");
      }
    } catch {
      throw new Error("Masukkan link Strava yang valid: www.strava.com atau strava.app.link");
    }
  }

  const normalized = {
    ...data,
    variant: String(data.variant).toUpperCase(),
    week: Number(data.week),
    challengeIndex: Number(data.challengeIndex),
    ...(isChallenge ? { stravaUrl } : {})
  };
  const submissionId = buildSubmissionId(normalized);
  await setDoc(doc(db, "submissions", submissionId), { ...normalized, submissionId, createdAt: serverTimestamp() });

  // Clear the optional link only after a successful challenge save.
  if (stravaInput) stravaInput.value = "";

  return submissionId;
}

export async function saveProfile(user) {
  if (!user?.uid) throw new Error("User UID is required.");
  await setDoc(doc(db, "users", user.uid), { uid: user.uid, name: user.displayName || "", email: user.email || "", photoURL: user.photoURL || "", updatedAt: serverTimestamp() }, { merge: true });
}

function listenQuery(q, label, callback, onError) {
  return onSnapshot(q, snapshot => {
    const rows = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    rows.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    callback(rows);
  }, error => { console.error(`${label} ERROR:`, error); onError?.(error); });
}

/* Personal/private listener — retained for future "My Progress" page. */
export function listenSubmissions({ userId, variant, week }, callback, onError) {
  return listenQuery(query(collection(db, "submissions"), where("userId", "==", userId), where("variant", "==", String(variant).toUpperCase()), where("week", "==", Number(week))), "LISTEN PERSONAL SUBMISSIONS", callback, onError);
}

/* Shared Team Board: every authenticated participant can read the selected Bingo + Week. */
export function listenTeamSubmissions({ variant, week }, callback, onError) {
  return listenQuery(query(collection(db, "submissions"), where("variant", "==", String(variant).toUpperCase()), where("week", "==", Number(week))), "LISTEN TEAM SUBMISSIONS", callback, onError);
}

/* Statistics / Leaderboard: all authenticated submissions. */
export function listenAllSubmissions(callback, onError) {
  return listenQuery(collection(db, "submissions"), "LISTEN ALL SUBMISSIONS", callback, onError);
}

/* FUTURE GROWTH: add teamId to users/submissions and replace global reads with team-scoped queries. */
