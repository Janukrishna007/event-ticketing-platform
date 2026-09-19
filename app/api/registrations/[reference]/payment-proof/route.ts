import { FieldValue } from "firebase-admin/firestore";

import { attemptEmailDelivery } from "@/lib/email";
import { firebaseDb } from "@/lib/firebase-admin";
import { authorizeApi } from "@/lib/auth";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const maximumProofSize = 700 * 1024;

export async function POST(request: Request, { params }: { params: Promise<{ reference: string }> }) {
  const authorization = await authorizeApi();
  if (authorization.response) return authorization.response;
  const account = authorization.user;
  try {
    const { reference } = await params;
    const form = await request.formData();
    const paymentReference = String(form.get("paymentReference") ?? "").trim();
    const proof = form.get("proof");
    if (!paymentReference) return Response.json({ error: "Enter the UPI transaction reference." }, { status: 400 });
    if (!(proof instanceof File) || proof.size === 0) return Response.json({ error: "Attach the payment screenshot or receipt." }, { status: 400 });
    if (!allowedTypes.has(proof.type) || proof.size > maximumProofSize) {
      return Response.json({ error: "Use a JPG, PNG, WebP, or PDF file up to 700 KB." }, { status: 400 });
    }

    const db = firebaseDb();
    const registrationQuery = await db.collection("registrations").where("reference", "==", reference).limit(1).get();
    const registrationDoc = registrationQuery.docs[0];
    if (!registrationDoc) return Response.json({ error: "Registration not found." }, { status: 404 });
    const registration = registrationDoc.data();
    const linkedUserIds = Array.isArray(registration.linkedUserIds) ? registration.linkedUserIds : [];
    if (registration.userId !== account.uid && !linkedUserIds.includes(account.uid)) {
      return Response.json({ error: "This registration is not linked to your account." }, { status: 403 });
    }
    if (!["awaiting_payment", "rejected"].includes(registration.paymentStatus)) {
      return Response.json({ error: "This registration cannot accept payment proof." }, { status: 409 });
    }
    const usedReference = await db.collection("registrations").where("paymentReference", "==", paymentReference).limit(1).get();
    if (!usedReference.empty && usedReference.docs[0].id !== registrationDoc.id) {
      return Response.json({ error: "This transaction reference has already been submitted." }, { status: 409 });
    }
    const eventSnapshot = await db.collection("events").doc(registration.eventId).get();
    const eventTitle = eventSnapshot.data()?.title ?? "Event";
    const proofRef = db.collection("paymentProofs").doc(registrationDoc.id);
    const emailRef = db.collection("emailOutbox").doc();
    const batch = db.batch();
    batch.set(proofRef, {
      registrationId: registrationDoc.id,
      contentType: proof.type,
      size: proof.size,
      data: Buffer.from(await proof.arrayBuffer()),
      updatedAt: FieldValue.serverTimestamp(),
    });
    batch.update(registrationDoc.ref, {
      paymentReference, paymentProofId: proofRef.id,
      paymentProofSubmittedAt: FieldValue.serverTimestamp(), paymentStatus: "proof_submitted",
    });
    batch.create(emailRef, {
      registrationId: registrationDoc.id, type: "payment_proof_received",
      recipient: registration.email, subject: `Payment proof received — ${eventTitle}`,
      payload: { reference, eventTitle, fullName: registration.fullName },
      status: "queued", attempts: 0, createdAt: FieldValue.serverTimestamp(), lastError: null,
    });
    await batch.commit();
    await attemptEmailDelivery(emailRef.id);
    return Response.json({ paymentStatus: "proof_submitted" });
  } catch (error) {
    console.error("Unable to save payment proof", error);
    return Response.json({ error: "The payment proof could not be saved. Try a smaller file or try again." }, { status: 500 });
  }
}
