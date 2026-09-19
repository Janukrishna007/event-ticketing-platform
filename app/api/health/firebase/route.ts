import { firebaseDb, firebaseProjectId } from "@/lib/firebase-admin";

export async function GET() {
  try {
    await firebaseDb().collection("events").limit(1).get();
    return Response.json({ connected: true, projectId: firebaseProjectId(), database: "cloud-firestore" });
  } catch (error) {
    console.error("Firebase health check failed", error);
    return Response.json({ connected: false, projectId: firebaseProjectId(), error: "Firebase credentials or Firestore are not ready." }, { status: 503 });
  }
}
