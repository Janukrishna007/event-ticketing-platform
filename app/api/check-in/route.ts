import { FieldValue } from "firebase-admin/firestore";

import { firebaseDb } from "@/lib/firebase-admin";
import { authorizeApi, type CurrentUser } from "@/lib/auth";

async function findRegistration(reference: string) {
  const db = firebaseDb();
  const snapshot = await db.collection("registrations").where("reference", "==", reference.toUpperCase()).limit(1).get();
  return snapshot.docs[0] ?? null;
}

async function responseFor(document: FirebaseFirestore.DocumentSnapshot) {
  const db = firebaseDb();
  const registration = document.data();
  if (!document.exists || !registration) throw new Error("NOT_FOUND");
  const [eventSnapshot, ticketSnapshot] = await Promise.all([
    db.collection("events").doc(registration.eventId).get(),
    db.collection("ticketTypes").doc(registration.ticketTypeId).get(),
  ]);
  return {
    id: document.id,
    reference: registration.reference,
    fullName: registration.fullName,
    email: registration.email,
    eventTitle: eventSnapshot.data()?.title ?? "Event",
    ticketName: ticketSnapshot.data()?.name ?? "Ticket",
    status: registration.status,
    checkedInAt: registration.checkedInAt?.toDate?.().toISOString?.() ?? null,
  };
}

async function canAccessEvent(user: CurrentUser, eventId: string) {
  const db = firebaseDb();
  const event = await db.collection("events").doc(eventId).get();
  if (user.role === "organizer") return event.data()?.organizerId === user.uid;
  if (user.role === "coordinator") {
    const assignment = await db.collection("eventStaff").doc(`${eventId}_${user.uid}`).get();
    return assignment.exists && assignment.data()?.active === true;
  }
  return false;
}

export async function GET(request: Request) {
  const authorization = await authorizeApi(["organizer", "coordinator"]);
  if (authorization.response) return authorization.response;
  const staff = authorization.user;
  try {
    const reference = new URL(request.url).searchParams.get("reference")?.trim() ?? "";
    if (!reference) return Response.json({ error: "Enter a ticket reference." }, { status: 400 });
    const registration = await findRegistration(reference);
    if (!registration) return Response.json({ error: "Ticket not found." }, { status: 404 });
    if (!await canAccessEvent(staff, registration.data()?.eventId)) return Response.json({ error: "This ticket belongs to an event outside your assignment." }, { status: 403 });
    return Response.json({ ticket: await responseFor(registration) });
  } catch (error) {
    console.error("Unable to verify ticket", error);
    return Response.json({ error: "The ticket could not be verified." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authorization = await authorizeApi(["organizer", "coordinator"]);
  if (authorization.response) return authorization.response;
  const staff = authorization.user;
  try {
    const payload = await request.json() as { reference?: string };
    const reference = payload.reference?.trim().toUpperCase() ?? "";
    if (!reference) return Response.json({ error: "Enter a ticket reference." }, { status: 400 });
    const db = firebaseDb();
    const registration = await findRegistration(reference);
    if (!registration) return Response.json({ error: "Ticket not found." }, { status: 404 });
    if (!await canAccessEvent(staff, registration.data()?.eventId)) return Response.json({ error: "This ticket belongs to an event outside your assignment." }, { status: 403 });

    await db.runTransaction(async (transaction) => {
      const current = await transaction.get(registration.ref);
      const data = current.data();
      if (!current.exists || data?.status !== "confirmed") throw new Error("NOT_CONFIRMED");
      if (data.checkedInAt) throw new Error("ALREADY_CHECKED_IN");
      transaction.update(registration.ref, {
        checkedInAt: FieldValue.serverTimestamp(),
        checkInStatus: "checked_in",
        checkedInBy: staff.uid,
      });
    });
    const updated = await registration.ref.get();
    return Response.json({ ticket: await responseFor(updated), result: "checked_in" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "NOT_CONFIRMED") return Response.json({ error: "This ticket is not confirmed." }, { status: 409 });
    if (message === "ALREADY_CHECKED_IN") return Response.json({ error: "This ticket has already been checked in." }, { status: 409 });
    console.error("Unable to check in ticket", error);
    return Response.json({ error: "Check-in could not be completed." }, { status: 500 });
  }
}
