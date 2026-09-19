import { firebaseDb } from "@/lib/firebase-admin";
import type {
  EventAgendaItem,
  EventFaq,
  EventFormat,
  EventSocialLink,
  EventSpeaker,
  EventTicket,
  EventVisibility,
  RegistrationFieldDefinition,
} from "@/lib/event-types";

export type PublicEvent = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  category: string;
  format: EventFormat;
  venue: string;
  address: string;
  startAt: string;
  endAt: string;
  registrationDeadline: string;
  ticketTypeId: string;
  ticketName: string;
  pricePaise: number;
  quantity: number;
  registeredCount: number;
  paymentUpiId: string | null;
  paymentPayeeName: string | null;
  paymentQrUrl: string | null;
  visibility: EventVisibility;
  bannerUrl: string;
  logoUrl: string;
  mapUrl: string;
  onlineUrl: string;
  organizerName: string;
  organizerContactEmail: string;
  organizerPhone: string;
  timezone: string;
  terms: string;
  agenda: EventAgendaItem[];
  speakers: EventSpeaker[];
  faqs: EventFaq[];
  socialLinks: EventSocialLink[];
  registrationFields: RegistrationFieldDefinition[];
  allowTeams: boolean;
  teamMin: number;
  teamMax: number;
  certificateEnabled: boolean;
  certificateType: string;
  certificateCondition: string;
  tickets: EventTicket[];
};

type EventRecord = Omit<PublicEvent,
  "ticketTypeId" | "ticketName" | "pricePaise" | "quantity" |
  "registeredCount" | "paymentUpiId" | "paymentPayeeName" | "paymentQrUrl" | "tickets"
> & { status: string; accessCode?: string };

type TicketRecord = {
  eventId: string;
  name: string;
  pricePaise: number;
  quantity: number;
  registeredCount: number;
  paymentUpiId: string | null;
  paymentPayeeName: string | null;
  paymentQrUrl: string | null;
  isActive: boolean;
  description?: string;
  salesStart?: string | null;
  salesEnd?: string | null;
  minPerOrder?: number;
  maxPerOrder?: number;
  visibility?: "public" | "hidden";
};

async function attachTicket(id: string, event: EventRecord): Promise<PublicEvent | null> {
  const snapshot = await firebaseDb().collection("ticketTypes").where("eventId", "==", id).get();
  const activeTickets = snapshot.docs.filter((doc) => (doc.data() as TicketRecord).isActive);
  const ticketDoc = activeTickets.find((doc) => (doc.data() as TicketRecord).visibility !== "hidden") ?? activeTickets[0];
  if (!ticketDoc) return null;
  const ticket = ticketDoc.data() as TicketRecord;
  const tickets: EventTicket[] = activeTickets.map((document) => {
    const data = document.data() as TicketRecord;
    return {
      id: document.id,
      name: data.name,
      description: data.description ?? "",
      pricePaise: data.pricePaise,
      quantity: data.quantity,
      registeredCount: data.registeredCount ?? 0,
      salesStart: data.salesStart ?? null,
      salesEnd: data.salesEnd ?? null,
      minPerOrder: data.minPerOrder ?? 1,
      maxPerOrder: data.maxPerOrder ?? 1,
      visibility: data.visibility ?? "public",
      paymentUpiId: data.paymentUpiId ?? null,
      paymentPayeeName: data.paymentPayeeName ?? null,
      paymentQrUrl: data.paymentQrUrl ?? null,
    };
  });
  return {
    ...event,
    id,
    ticketTypeId: ticketDoc.id,
    ticketName: ticket.name,
    pricePaise: ticket.pricePaise,
    quantity: ticket.quantity,
    registeredCount: ticket.registeredCount ?? 0,
    paymentUpiId: ticket.paymentUpiId ?? null,
    paymentPayeeName: ticket.paymentPayeeName ?? null,
    paymentQrUrl: ticket.paymentQrUrl ?? null,
    visibility: event.visibility ?? "public",
    bannerUrl: event.bannerUrl ?? "",
    logoUrl: event.logoUrl ?? "",
    mapUrl: event.mapUrl ?? "",
    onlineUrl: event.onlineUrl ?? "",
    organizerName: event.organizerName ?? "Events by µLearn",
    organizerContactEmail: event.organizerContactEmail ?? "",
    organizerPhone: event.organizerPhone ?? "",
    timezone: event.timezone ?? "Asia/Kolkata",
    terms: event.terms ?? "",
    agenda: Array.isArray(event.agenda) ? event.agenda : [],
    speakers: Array.isArray(event.speakers) ? event.speakers : [],
    faqs: Array.isArray(event.faqs) ? event.faqs : [],
    socialLinks: Array.isArray(event.socialLinks) ? event.socialLinks : [],
    registrationFields: Array.isArray(event.registrationFields) ? event.registrationFields : [],
    allowTeams: event.allowTeams === true,
    teamMin: Number(event.teamMin) || 1,
    teamMax: Number(event.teamMax) || 1,
    certificateEnabled: event.certificateEnabled === true,
    certificateType: event.certificateType ?? "participation",
    certificateCondition: event.certificateCondition ?? "checked_in",
    tickets,
  };
}

export async function listPublishedEvents(search = "") {
  const snapshot = await firebaseDb().collection("events").where("status", "==", "published").get();
  const joined = await Promise.all(snapshot.docs.map((doc) => attachTicket(doc.id, doc.data() as EventRecord)));
  const term = search.trim().toLocaleLowerCase();
  return joined
    .filter((event): event is PublicEvent => event !== null && event.visibility === "public")
    .filter((event) => !term || [event.title, event.summary, event.category, event.venue].some((value) => value.toLocaleLowerCase().includes(term)))
    .sort((left, right) => left.startAt.localeCompare(right.startAt));
}

export async function getPublishedEvent(slug: string, accessCode = "") {
  const snapshot = await firebaseDb().collection("events")
    .where("slug", "==", slug)
    .limit(1)
    .get();
  const eventDoc = snapshot.docs[0];
  if (!eventDoc) return null;
  const event = eventDoc.data() as EventRecord;
  if (event.status !== "published") return null;
  if ((event.visibility ?? "public") === "private" && event.accessCode !== accessCode) return null;
  return attachTicket(eventDoc.id, event);
}
