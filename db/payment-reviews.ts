import { firebaseDb } from "@/lib/firebase-admin";

export type PaymentReview = {
  id: string;
  reference: string;
  fullName: string;
  email: string;
  phone: string;
  eventTitle: string;
  amountPaise: number;
  paymentReference: string;
  submittedAt: string | null;
};

export async function listPaymentReviews(organizerId: string): Promise<PaymentReview[]> {
  const db = firebaseDb();
  const snapshot = await db.collection("registrations").where("paymentStatus", "==", "proof_submitted").get();
  const reviews = await Promise.all(snapshot.docs.map(async (document) => {
    const registration = document.data();
    const [eventSnapshot, ticketSnapshot] = await Promise.all([
      db.collection("events").doc(registration.eventId).get(),
      db.collection("ticketTypes").doc(registration.ticketTypeId).get(),
    ]);
    if (eventSnapshot.data()?.organizerId !== organizerId) return null;
    return {
      id: document.id,
      reference: registration.reference,
      fullName: registration.fullName,
      email: registration.email,
      phone: registration.phone,
      eventTitle: eventSnapshot.data()?.title ?? "Event",
      amountPaise: ticketSnapshot.data()?.pricePaise ?? 0,
      paymentReference: registration.paymentReference,
      submittedAt: registration.paymentProofSubmittedAt?.toDate?.().toISOString?.() ?? null,
    };
  }));
  return reviews.filter((review): review is PaymentReview => Boolean(review));
}
