import { FieldValue } from "firebase-admin/firestore";

import { authorizeApi, requestHasTrustedOrigin } from "@/lib/auth";
import { firebaseDb } from "@/lib/firebase-admin";

function chunks<T>(values: T[], size: number) {
  return Array.from({ length: Math.ceil(values.length / size) }, (_, index) => values.slice(index * size, (index + 1) * size));
}

export async function DELETE(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  if (!requestHasTrustedOrigin(request)) return Response.json({ error: "This request did not come from the application." }, { status: 403 });
  const authorization = await authorizeApi(["organizer"]);
  if (authorization.response) return authorization.response;
  const organizer = authorization.user;

  try {
    const { eventId } = await params;
    const payload = await request.json() as { confirmTitle?: unknown };
    const confirmTitle = typeof payload.confirmTitle === "string" ? payload.confirmTitle.trim() : "";
    const db = firebaseDb();
    const eventRef = db.collection("events").doc(eventId);
    const eventSnapshot = await eventRef.get();
    const event = eventSnapshot.data();

    if (!eventSnapshot.exists || !event) return Response.json({ error: "Event not found." }, { status: 404 });
    if (event.organizerId !== organizer.uid) return Response.json({ error: "Only the event owner can delete this event." }, { status: 403 });
    if (!confirmTitle || confirmTitle !== event.title) {
      return Response.json({ error: "Enter the event name exactly to confirm deletion." }, { status: 400 });
    }

    const [tickets, registrations, auditLogs, staff] = await Promise.all([
      db.collection("ticketTypes").where("eventId", "==", eventId).get(),
      db.collection("registrations").where("eventId", "==", eventId).get(),
      db.collection("eventAuditLogs").where("eventId", "==", eventId).get(),
      db.collection("eventStaff").where("eventId", "==", eventId).get(),
    ]);
    const registrationIds = registrations.docs.map((document) => document.id);
    const outboxSnapshots = await Promise.all(chunks(registrationIds, 30).map((ids) => db.collection("emailOutbox").where("registrationId", "in", ids).get()));
    const writer = db.bulkWriter();

    for (const document of tickets.docs) writer.delete(document.ref);
    for (const document of registrations.docs) {
      writer.delete(document.ref);
      writer.delete(db.collection("paymentProofs").doc(document.id));
    }
    for (const snapshot of outboxSnapshots) for (const document of snapshot.docs) writer.delete(document.ref);
    for (const document of auditLogs.docs) writer.delete(document.ref);
    for (const document of staff.docs) writer.delete(document.ref);
    writer.delete(eventRef);
    writer.set(db.collection("systemAuditLogs").doc(), {
      action: "event_deleted", eventId, eventTitle: event.title,
      actorId: organizer.uid, actorEmail: organizer.email,
      deletedCounts: { tickets: tickets.size, registrations: registrations.size, staff: staff.size },
      createdAt: FieldValue.serverTimestamp(),
    });
    await writer.close();

    return Response.json({ deleted: true, eventId });
  } catch (error) {
    console.error("Unable to delete event", error);
    return Response.json({ error: "The event could not be deleted. Nothing else should be changed until you try again." }, { status: 500 });
  }
}
