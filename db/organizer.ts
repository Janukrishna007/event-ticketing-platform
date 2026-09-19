import { firebaseDb } from "@/lib/firebase-admin";

function iso(value: unknown) {
  if (value && typeof value === "object" && "toDate" in value) {
    const candidate = value as { toDate?: () => Date };
    return candidate.toDate?.().toISOString() ?? null;
  }
  return typeof value === "string" ? value : null;
}

export type OrganizerEventSummary = {
  id: string;
  slug: string;
  title: string;
  startAt: string;
  venue: string;
  status: string;
  capacity: number;
  registrations: number;
  confirmed: number;
  paymentPending: number;
  checkedIn: number;
};

export type OrganizerRegistration = {
  id: string;
  reference: string;
  fullName: string;
  email: string;
  phone: string;
  eventTitle: string;
  ticketName: string;
  status: string;
  paymentStatus: string;
  createdAt: string | null;
  checkedInAt: string | null;
};

export async function listOrganizerEvents(organizerId: string): Promise<OrganizerEventSummary[]> {
  const db = firebaseDb();
  const [eventsSnapshot, ticketsSnapshot, registrationsSnapshot] = await Promise.all([
    db.collection("events").where("organizerId", "==", organizerId).get(),
    db.collection("ticketTypes").get(),
    db.collection("registrations").get(),
  ]);
  const tickets = ticketsSnapshot.docs.reduce((map, document) => {
    const eventId = document.data().eventId as string;
    const list = map.get(eventId) ?? [];
    list.push(document.data());
    map.set(eventId, list);
    return map;
  }, new Map<string, FirebaseFirestore.DocumentData[]>());
  const registrations = registrationsSnapshot.docs.map((document) => document.data());

  return eventsSnapshot.docs.map((document) => {
    const event = document.data();
    const eventTickets = tickets.get(document.id) ?? [];
    const eventRegistrations = registrations.filter((registration) => registration.eventId === document.id);
    return {
      id: document.id,
      slug: event.slug,
      title: event.title,
      startAt: event.startAt,
      venue: event.venue,
      status: event.status,
      capacity: eventTickets.reduce((total, ticket) => total + (Number(ticket.quantity) || 0), 0),
      registrations: eventRegistrations.length,
      confirmed: eventRegistrations.filter((registration) => registration.status === "confirmed").length,
      paymentPending: eventRegistrations.filter((registration) => ["awaiting_payment", "proof_submitted"].includes(registration.paymentStatus)).length,
      checkedIn: eventRegistrations.filter((registration) => Boolean(registration.checkedInAt)).length,
    };
  }).sort((left, right) => left.startAt.localeCompare(right.startAt));
}

export type OrganizerEventShare = {
  id: string;
  slug: string;
  title: string;
  visibility: "public" | "unlisted" | "private";
  accessCode: string | null;
};

export async function getOrganizerEventShare(eventId: string, organizerId: string): Promise<OrganizerEventShare | null> {
  const snapshot = await firebaseDb().collection("events").doc(eventId).get();
  const event = snapshot.data();
  if (!snapshot.exists || !event || event.organizerId !== organizerId) return null;
  return {
    id: snapshot.id,
    slug: event.slug,
    title: event.title,
    visibility: event.visibility ?? "public",
    accessCode: typeof event.accessCode === "string" ? event.accessCode : null,
  };
}

export async function listOrganizerRegistrations(organizerId: string): Promise<OrganizerRegistration[]> {
  const db = firebaseDb();
  const [eventsSnapshot, ticketsSnapshot, registrationsSnapshot] = await Promise.all([
    db.collection("events").where("organizerId", "==", organizerId).get(),
    db.collection("ticketTypes").get(),
    db.collection("registrations").get(),
  ]);
  const events = new Map(eventsSnapshot.docs.map((document) => [document.id, document.data()]));
  const tickets = new Map(ticketsSnapshot.docs.map((document) => [document.id, document.data()]));

  return registrationsSnapshot.docs.filter((document) => events.has(document.data().eventId)).map((document) => {
    const registration = document.data();
    return {
      id: document.id,
      reference: registration.reference,
      fullName: registration.fullName,
      email: registration.email,
      phone: registration.phone,
      eventTitle: events.get(registration.eventId)?.title ?? "Event",
      ticketName: tickets.get(registration.ticketTypeId)?.name ?? "Ticket",
      status: registration.status,
      paymentStatus: registration.paymentStatus,
      createdAt: iso(registration.createdAt),
      checkedInAt: iso(registration.checkedInAt),
    };
  }).sort((left, right) => (right.createdAt ?? "").localeCompare(left.createdAt ?? ""));
}
