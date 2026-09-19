import { readFile } from "node:fs/promises";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getSecurityRules } from "firebase-admin/security-rules";

const projectId = process.env.FIREBASE_PROJECT_ID;

if (!projectId) throw new Error("FIREBASE_PROJECT_ID is not configured.");

const app = initializeApp({
  credential: applicationDefault(),
  projectId,
});
const rules = getSecurityRules(app);

const firestoreSource = await readFile(new URL("../firestore.rules", import.meta.url));
await rules.releaseFirestoreRulesetFromSource(firestoreSource);
console.log("Firestore rules deployed.");
