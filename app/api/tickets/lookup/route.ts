import { firebaseDb } from "@/lib/firebase-admin";
import { authorizeApi } from "@/lib/auth";
import { FieldValue } from "firebase-admin/firestore";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const authorization = await authorizeApi();
  if (authorization.response) return authorization.response;
  const account = authorization.user;
  try {
    const payload = await request.json() as Record<string, unknown>;
    const reference = clean(payload.reference).toUpperCase();
    const email = clean(payload.email).toLowerCase();
    if (!reference || !email) return Response.json({ error: "Enter your ticket reference and registration email." }, { status: 400 });

    const db = firebaseDb();
    const registrationQuery = await db.collection("registrations").where("reference", "==", reference).limit(1).get();
    const registrationDocument = registrationQuery.docs[0];
    const registration = registrationDocument?.data();
    if (!registrationDocument || registration?.email !== email) {
      return Response.json({ error: "No registration matches those details." }, { status: 404 });
    }
    await registrationDocument.ref.update({ linkedUserIds: FieldValue.arrayUnion(account.uid) });
    const [eventSnapshot, ticketSnapshot] = await Promise.all([
      db.collection("events").doc(registration.eventId).get(),
      db.collection("ticketTypes").doc(registration.ticketTypeId).get(),
    ]);
    if (!eventSnapshot.exists || !ticketSnapshot.exists) return Response.json({ error: "Ticket details are unavailable." }, { status: 404 });
    const event = eventSnapshot.data()!;
    const ticket = ticketSnapshot.data()!;
    return Response.json({
      ticket: {
        reference: registration.reference,
        attendeeName: registration.fullName,
        eventTitle: event.title,
        ticketName: ticket.name,
        startAt: event.startAt,
        venue: event.venue,
        status: registration.status,
        paymentStatus: registration.paymentStatus,
        checkedInAt: registration.checkedInAt?.toDate?.().toISOString?.() ?? null,
      },
    });
  } catch (error) {
    console.error("Unable to look up ticket", error);
    return Response.json({ error: "The ticket could not be loaded." }, { status: 500 });
  }
}
