import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";
import { firebaseConfig } from "./firebase-config.js";

const app = getApps()[0] || initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);

/* =========================================================
   STORAGE
========================================================= */

export async function uploadEvidence(userId, file) {
  if (!file) return { url: "", name: "" };

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `evidence/${userId}/${Date.now()}-${safeName}`;
  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, file, {
    contentType: file.type || "application/octet-stream"
  });

  const url = await getDownloadURL(storageRef);

  return {
    url,
    name: file.name
  };
}

/* =========================================================
   SUBMISSION IDENTITY
   One user + one Bingo + one Week + one Activity = one record.
   challengeIndex -1 is reserved for the weekly quiz.
========================================================= */

function buildSubmissionId({
  userId,
  variant,
  week,
  challengeIndex
}) {
  const safeVariant = String(variant).toUpperCase();
  const safeWeek = Number(week);
  const safeIndex = Number(challengeIndex);

  return `${userId}_B${safeVariant}_W${safeWeek}_C${safeIndex}`;
}

/* =========================================================
   FIRESTORE SAVE
========================================================= */

export async function saveSubmission(data) {
  if (!data?.userId) {
    throw new Error("userId is required.");
  }

  if (!["A", "B", "C"].includes(String(data.variant).toUpperCase())) {
    throw new Error("variant must be A, B, or C.");
  }

  if (!Number.isInteger(Number(data.week)) || Number(data.week) < 1) {
    throw new Error("week must be a positive integer.");
  }

  if (!Number.isInteger(Number(data.challengeIndex))) {
    throw new Error("challengeIndex must be an integer.");
  }

  const normalized = {
    ...data,
    variant: String(data.variant).toUpperCase(),
    week: Number(data.week),
    challengeIndex: Number(data.challengeIndex)
  };

  const submissionId = buildSubmissionId(normalized);
  const submissionRef = doc(db, "submissions", submissionId);

  await setDoc(submissionRef, {
    ...normalized,
    submissionId,
    createdAt: serverTimestamp()
  });

  return submissionId;
}

/* =========================================================
   USER PROFILE
========================================================= */

export async function saveProfile(user) {
  if (!user?.uid) {
    throw new Error("User UID is required.");
  }

  await setDoc(
    doc(db, "users", user.uid),
    {
      uid: user.uid,
      name: user.displayName || "",
      email: user.email || "",
      photoURL: user.photoURL || "",
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

/* =========================================================
   SUBMISSION LISTENER
   No orderBy() here: avoids requiring a composite index.
   Sorting is performed client-side.
========================================================= */

export function listenSubmissions(
  { userId, variant, week },
  callback,
  onError
) {
  const normalizedVariant = String(variant).toUpperCase();
  const normalizedWeek = Number(week);

  const q = query(
    collection(db, "submissions"),
    where("userId", "==", userId),
    where("variant", "==", normalizedVariant),
    where("week", "==", normalizedWeek)
  );

  return onSnapshot(
    q,
    snapshot => {
      const rows = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));

      rows.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });

      callback(rows);
    },
    error => {
      console.error("LISTEN SUBMISSIONS ERROR:", error);
      onError?.(error);
    }
  );
}
