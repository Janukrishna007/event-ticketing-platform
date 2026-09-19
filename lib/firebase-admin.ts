import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const projectId = process.env.FIREBASE_PROJECT_ID || "events-e2eb4";

function canUseApplicationDefaultCredentials() {
  return Boolean(
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.K_SERVICE ||
    process.env.FUNCTION_TARGET ||
    process.env.GAE_ENV ||
    process.env.FIREBASE_CONFIG,
  );
}

export function firebaseAdminApp() {
  const existing = getApps()[0];
  if (existing) return existing;

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const credential = clientEmail && privateKey
    ? cert({ projectId, clientEmail, privateKey })
    : canUseApplicationDefaultCredentials()
      ? applicationDefault()
      : null;

  if (!credential) {
    throw new Error(
      "Firebase Admin credentials are not configured. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.",
    );
  }

  return initializeApp({
    credential,
    projectId,
  });
}

export function firebaseDb() {
  return getFirestore(firebaseAdminApp());
}

export function firebaseProjectId() {
  return projectId;
}
