import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export const firebaseClientApp = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

export const firebaseClientDb = getFirestore(firebaseClientApp);
export const firebaseClientAuth = getAuth(firebaseClientApp);

let analytics: Analytics | null = null;

export async function getFirebaseAnalytics() {
  if (typeof window === "undefined" || !(await isSupported())) return null;
  analytics ??= getAnalytics(firebaseClientApp);
  return analytics;
}
