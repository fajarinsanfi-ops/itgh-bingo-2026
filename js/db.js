import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getFirestore, collection, query, where, onSnapshot, serverTimestamp, doc, setDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";
import { firebaseConfig } from "./firebase-config.js";

const app = getApps()[0] || initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

export async function uploadEvidence(userId, file) {
  if (!file) return { url: "", name: "" };
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storageRef = ref(storage, `evidence/${userId}/${Date.now()}-${safeName}`);
  await uploadBytes(storageRef, file, { contentType: file.type || "application/octet-stream" });
  return { url: await getDownloadURL(storageRef), name: file.name };
}

function buildSubmissionId({ userId, variant, week, challengeIndex }) {
  return `${userId}_B${String(variant).toUpperCase()}_W${Number(week)}_C${Number(challengeIndex)}`;
}

export async function saveSubmission(data) {
  if (!data?.userId) throw new Error("userId is required.");
  if (!["A", "B", "C"].includes(String(data.variant).toUpperCase())) throw new Error("variant must be A, B, or C.");
  if (!Number.isInteger(Number(data.week)) || Number(data.week) < 1) throw new Error("week must be a positive integer.");
  if (!Number.isInteger(Number(data.challengeIndex))) throw new Error("challengeIndex must be an integer.");
  const normalized = { ...data, variant: String(data.variant).toUpperCase(), week: Number(data.week), challengeIndex: Number(data.challengeIndex) };
  const submissionId = buildSubmissionId(normalized);
  await setDoc(doc(db, "submissions", submissionId), { ...normalized, submissionId, createdAt: serverTimestamp() });
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
