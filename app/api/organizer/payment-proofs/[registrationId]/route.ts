import { firebaseDb } from "@/lib/firebase-admin";
import { authorizeApi } from "@/lib/auth";

export async function GET(_request: Request, { params }: { params: Promise<{ registrationId: string }> }) {
  const authorization = await authorizeApi(["organizer"]);
  if (authorization.response) return authorization.response;
  const organizer = authorization.user;
  try {
    const { registrationId } = await params;
    const db = firebaseDb();
    const registration = await db.collection("registrations").doc(registrationId).get();
    const event = registration.exists ? await db.collection("events").doc(registration.data()?.eventId).get() : null;
    if (event?.data()?.organizerId !== organizer.uid) return new Response("Forbidden", { status: 403 });
    const proofId = registration.data()?.paymentProofId;
    if (!registration.exists || !proofId) return new Response("Payment proof not found", { status: 404 });
    const proof = await db.collection("paymentProofs").doc(proofId).get();
    const stored = proof.data();
    const data = stored?.data?.toUint8Array?.() ?? stored?.data;
    if (!proof.exists || !data) return new Response("Payment proof not found", { status: 404 });
    return new Response(new Uint8Array(data), {
      headers: {
        "content-type": stored?.contentType || "application/octet-stream",
        "content-disposition": `inline; filename="${registration.data()?.reference || "payment-proof"}"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Unable to load payment proof", error);
    return new Response("Payment proof is unavailable", { status: 500 });
  }
}
