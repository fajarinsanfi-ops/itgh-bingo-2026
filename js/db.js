import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getFirestore, collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, doc, setDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";
import { firebaseConfig } from "./firebase-config.js";

const app = getApps()[0] || initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

export async function uploadEvidence(userId, file) {
  if (!file) return { url: "", name: "" };
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `evidence/${userId}/${Date.now()}-${safeName}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type || "application/octet-stream" });
  const url = await getDownloadURL(storageRef);
  return { url, name: file.name };
}

export async function saveSubmission(data) {
  const refDoc = await addDoc(collection(db, "submissions"), {
    ...data,
    createdAt: serverTimestamp()
  });
  return refDoc.id;
}

export async function saveProfile(user) {
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    name: user.displayName || "",
    email: user.email || "",
    photoURL: user.photoURL || "",
    updatedAt: serverTimestamp()
  }, { merge: true });
}

export function listenSubmissions({ userId, variant, week }, callback) {
  const q = query(
    collection(db, "submissions"),
    where("userId", "==", userId),
    where("variant", "==", variant),
    where("week", "==", week),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id:d.id, ...d.data() }))), err => {
    console.error(err);
    callback([]);
  });
}
