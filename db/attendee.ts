import { firebaseDb } from "@/lib/firebase-admin";

function iso(value: unknown) {
  if (value && typeof value === "object" && "toDate" in value) {
    return (value as { toDate?: () => Date }).toDate?.().toISOString() ?? null;
  }
  return typeof value === "string" ? value : null;
}

export type AttendeeRegistration = {
  id: string;
  reference: string;
  attendeeName: string;
  eventTitle: string;
  ticketName: string;
  startAt: string;
  endAt: string;
  venue: string;
  status: string;
  paymentStatus: string;
  checkedInAt: string | null;
};

export async function listAttendeeRegistrations(uid: string, verifiedEmail: string): Promise<AttendeeRegistration[]> {
  const db = firebaseDb();
  const [owned, linked, sameEmail] = await Promise.all([
    db.collection("registrations").where("userId", "==", uid).get(),
    db.collection("registrations").where("linkedUserIds", "array-contains", uid).get(),
    db.collection("registrations").where("email", "==", verifiedEmail).get(),
  ]);
  const documents = new Map([...owned.docs, ...linked.docs, ...sameEmail.docs].map((document) => [document.id, document]));
  const records = await Promise.all([...documents.values()].map(async (document) => {
    const registration = document.data();
    const [event, ticket] = await Promise.all([
      db.collection("events").doc(registration.eventId).get(),
      db.collection("ticketTypes").doc(registration.ticketTypeId).get(),
    ]);
    if (!event.exists || !ticket.exists) return null;
    const eventData = event.data()!;
    return {
      id: document.id,
      reference: registration.reference,
      attendeeName: registration.fullName,
      eventTitle: eventData.title,
      ticketName: ticket.data()!.name,
      startAt: eventData.startAt,
      endAt: eventData.endAt,
      venue: eventData.venue,
      status: registration.status,
      paymentStatus: registration.paymentStatus,
      checkedInAt: iso(registration.checkedInAt),
    } satisfies AttendeeRegistration;
  }));
  return records.filter((record): record is AttendeeRegistration => Boolean(record)).sort((left, right) => left.startAt.localeCompare(right.startAt));
}
