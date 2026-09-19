import { FieldValue } from "firebase-admin/firestore";

import { attemptEmailDelivery } from "@/lib/email";
import { firebaseDb } from "@/lib/firebase-admin";
import { authorizeApi } from "@/lib/auth";

export async function PATCH(request: Request, { params }: { params: Promise<{ registrationId: string }> }) {
  const authorization = await authorizeApi(["organizer"]);
  if (authorization.response) return authorization.response;
  const organizer = authorization.user;
  try {
    const { registrationId } = await params;
    const body = await request.json() as { decision?: string; reason?: string };
    if (!body.decision || !["approve", "reject"].includes(body.decision)) {
      return Response.json({ error: "Choose approve or reject." }, { status: 400 });
    }
    const db = firebaseDb();
    const registrationRef = db.collection("registrations").doc(registrationId);
    const emailRef = db.collection("emailOutbox").doc();
    await db.runTransaction(async (transaction) => {
      const registrationSnapshot = await transaction.get(registrationRef);
      if (!registrationSnapshot.exists) throw new Error("NOT_FOUND");
      const registration = registrationSnapshot.data()!;
      if (registration.paymentStatus !== "proof_submitted") throw new Error("ALREADY_REVIEWED");
      const eventSnapshot = await transaction.get(db.collection("events").doc(registration.eventId));
      if (eventSnapshot.data()?.organizerId !== organizer.uid) throw new Error("FORBIDDEN");
      const eventTitle = eventSnapshot.data()?.title ?? "Event";
      const approved = body.decision === "approve";
      transaction.update(registrationRef, {
        status: approved ? "confirmed" : "awaiting_payment",
        paymentStatus: approved ? "verified" : "rejected",
        ticketIssuedAt: approved ? FieldValue.serverTimestamp() : null,
        paymentReviewedAt: FieldValue.serverTimestamp(),
        paymentRejectionReason: approved ? null : (body.reason?.trim() || null),
      });
      transaction.create(emailRef, {
        registrationId, type: approved ? "payment_confirmed" : "payment_rejected",
        recipient: registration.email,
        subject: approved ? `Payment confirmed — ${eventTitle}` : `Payment needs attention — ${eventTitle}`,
        payload: {
          reference: registration.reference, eventTitle,
          fullName: registration.fullName, reason: body.reason?.trim() || null,
        },
        status: "queued", attempts: 0, createdAt: FieldValue.serverTimestamp(), lastError: null,
      });
    });
    await attemptEmailDelivery(emailRef.id);
    return Response.json({ paymentStatus: body.decision === "approve" ? "verified" : "rejected" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "NOT_FOUND") return Response.json({ error: "Registration not found." }, { status: 404 });
    if (message === "ALREADY_REVIEWED") return Response.json({ error: "This payment has already been reviewed." }, { status: 409 });
    if (message === "FORBIDDEN") return Response.json({ error: "You cannot review payments for this event." }, { status: 403 });
    console.error("Unable to review payment", error);
    return Response.json({ error: "The payment review could not be saved." }, { status: 500 });
  }
}
