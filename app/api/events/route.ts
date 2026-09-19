import { FieldValue } from "firebase-admin/firestore";

import { firebaseDb } from "@/lib/firebase-admin";
import { authorizeApi } from "@/lib/auth";
import type { RegistrationFieldType } from "@/lib/event-types";

function text(value: unknown, limit = 10_000) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function integer(value: unknown, fallback = 0) {
  const candidate = Number(value);
  return Number.isInteger(candidate) ? candidate : fallback;
}

function slugify(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64);
}

function validUrl(value: string) {
  if (!value) return true;
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
}

function objectArray(value: unknown, maximum: number) {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object").slice(0, maximum) : [];
}

const fieldTypes = new Set<RegistrationFieldType>(["text", "email", "phone", "number", "date", "url", "textarea", "select", "radio", "checkbox"]);

export async function POST(request: Request) {
  const authorization = await authorizeApi(["organizer"]);
  if (authorization.response) return authorization.response;
  const organizer = authorization.user;

  try {
    const payload = await request.json() as Record<string, unknown>;
    const title = text(payload.title, 120);
    const summary = text(payload.summary, 180);
    const description = text(payload.description, 20_000);
    const category = text(payload.category, 80);
    const format = text(payload.format);
    const visibility = text(payload.visibility) || "public";
    const venue = text(payload.venue, 160);
    const address = text(payload.address, 500);
    const mapUrl = text(payload.mapUrl, 1_000);
    const onlineUrl = text(payload.onlineUrl, 1_000);
    const bannerUrl = text(payload.bannerUrl, 1_000);
    const logoUrl = text(payload.logoUrl, 1_000);
    const organizerName = text(payload.organizerName, 120) || "Events by µLearn";
    const organizerContactEmail = text(payload.organizerContactEmail, 254) || organizer.email;
    const organizerPhone = text(payload.organizerPhone, 40);
    const timezone = text(payload.timezone, 80) || "Asia/Kolkata";
    const terms = text(payload.terms, 12_000);
    const startAt = text(payload.startAt);
    const endAt = text(payload.endAt);
    const registrationStart = text(payload.registrationStart) || new Date().toISOString();
    const registrationDeadline = text(payload.registrationDeadline);
    const allowTeams = payload.allowTeams === true;
    const teamMin = integer(payload.teamMin, 1);
    const teamMax = integer(payload.teamMax, 1);
    const certificateEnabled = payload.certificateEnabled === true;
    const certificateType = text(payload.certificateType, 80) || "participation";
    const certificateCondition = text(payload.certificateCondition, 80) || "checked_in";

    if (!title || !summary || !description || !category || !organizerName || !organizerContactEmail) {
      return Response.json({ error: "Complete all required event details." }, { status: 400 });
    }
    if (!["offline", "online", "hybrid"].includes(format)) {
      return Response.json({ error: "Choose a valid event format." }, { status: 400 });
    }
    if (!["public", "unlisted", "private"].includes(visibility)) {
      return Response.json({ error: "Choose a valid event visibility." }, { status: 400 });
    }
    if ((format === "offline" || format === "hybrid") && !venue) {
      return Response.json({ error: "Offline and hybrid events require a venue." }, { status: 400 });
    }
    if (format === "online" && !onlineUrl) {
      return Response.json({ error: "Online events require a joining link." }, { status: 400 });
    }
    if (![startAt, endAt, registrationStart, registrationDeadline].every((value) => Number.isFinite(Date.parse(value)))) {
      return Response.json({ error: "Enter valid event and registration dates." }, { status: 400 });
    }
    if (Date.parse(endAt) <= Date.parse(startAt) || Date.parse(registrationDeadline) > Date.parse(startAt) || Date.parse(registrationDeadline) <= Date.parse(registrationStart)) {
      return Response.json({ error: "Check the event timeline and registration window." }, { status: 400 });
    }
    if (![mapUrl, onlineUrl, bannerUrl, logoUrl].every(validUrl)) {
      return Response.json({ error: "Image, map, and joining links must use valid http or https URLs." }, { status: 400 });
    }
    if (!/^\S+@\S+\.\S+$/.test(organizerContactEmail)) {
      return Response.json({ error: "Enter a valid organizer contact email." }, { status: 400 });
    }
    if (allowTeams && (teamMin < 2 || teamMax < teamMin || teamMax > 100)) {
      return Response.json({ error: "Team limits must be between 2 and 100 members." }, { status: 400 });
    }

    const tickets = objectArray(payload.tickets, 12).map((ticket) => ({
      name: text(ticket.name, 100),
      description: text(ticket.description, 500),
      quantity: integer(ticket.quantity),
      pricePaise: Math.round(Number(ticket.priceRupees) * 100),
      salesStart: text(ticket.salesStart) || registrationStart,
      salesEnd: text(ticket.salesEnd) || registrationDeadline,
      minPerOrder: integer(ticket.minPerOrder, 1),
      maxPerOrder: integer(ticket.maxPerOrder, 1),
      visibility: text(ticket.visibility) === "hidden" ? "hidden" as const : "public" as const,
      paymentUpiId: text(ticket.paymentUpiId, 120) || null,
      paymentPayeeName: text(ticket.paymentPayeeName, 120) || null,
      paymentQrUrl: text(ticket.paymentQrUrl, 1_000) || null,
    }));
    if (!tickets.length) return Response.json({ error: "Add at least one ticket type." }, { status: 400 });
    for (const ticket of tickets) {
      if (!ticket.name || ticket.quantity < 1 || ticket.quantity > 100_000 || !Number.isInteger(ticket.pricePaise) || ticket.pricePaise < 0) {
        return Response.json({ error: "Each ticket needs a name, valid capacity, and valid price." }, { status: 400 });
      }
      if (![ticket.salesStart, ticket.salesEnd].every((value) => Number.isFinite(Date.parse(value))) || Date.parse(ticket.salesEnd) <= Date.parse(ticket.salesStart)) {
        return Response.json({ error: `Check the sales window for ${ticket.name}.` }, { status: 400 });
      }
      if (ticket.minPerOrder < 1 || ticket.maxPerOrder < ticket.minPerOrder || ticket.maxPerOrder > 20) {
        return Response.json({ error: `Check the order limits for ${ticket.name}.` }, { status: 400 });
      }
      if (ticket.pricePaise > 0 && (!ticket.paymentUpiId || !ticket.paymentPayeeName)) {
        return Response.json({ error: `Paid ticket ${ticket.name} requires a UPI ID and payee name.` }, { status: 400 });
      }
      if (ticket.paymentQrUrl && !validUrl(ticket.paymentQrUrl)) {
        return Response.json({ error: `Payment QR for ${ticket.name} must be a valid image URL.` }, { status: 400 });
      }
    }

    const agenda = objectArray(payload.agenda, 30).map((item) => ({
      time: text(item.time, 60), title: text(item.title, 140), description: text(item.description, 500),
    })).filter((item) => item.title);
    const speakers = objectArray(payload.speakers, 30).map((item) => ({
      name: text(item.name, 120), title: text(item.title, 160), profileUrl: text(item.profileUrl, 1_000),
    })).filter((item) => item.name);
    const faqs = objectArray(payload.faqs, 30).map((item) => ({
      question: text(item.question, 300), answer: text(item.answer, 2_000),
    })).filter((item) => item.question && item.answer);
    const socialLinks = objectArray(payload.socialLinks, 10).map((item) => ({
      label: text(item.label, 50), url: text(item.url, 1_000),
    })).filter((item) => item.label && item.url);
    if (![...speakers.map((item) => item.profileUrl), ...socialLinks.map((item) => item.url)].every(validUrl)) {
      return Response.json({ error: "Speaker and social links must use valid http or https URLs." }, { status: 400 });
    }

    const registrationFields = objectArray(payload.registrationFields, 30).map((item, index) => {
      const rawType = text(item.type) as RegistrationFieldType;
      return {
        id: text(item.id, 80) || `field-${index + 1}`,
        label: text(item.label, 140),
        description: text(item.description, 400),
        placeholder: text(item.placeholder, 180),
        type: fieldTypes.has(rawType) ? rawType : "text" as const,
        required: item.required === true,
        options: Array.isArray(item.options) ? item.options.map((option) => text(option, 120)).filter(Boolean).slice(0, 100) : [],
        conditionalFieldId: text(item.conditionalFieldId, 80),
        conditionalValue: text(item.conditionalValue, 120),
      };
    }).filter((item) => item.label);
    if (registrationFields.some((field) => ["select", "radio"].includes(field.type) && field.options.length === 0)) {
      return Response.json({ error: "Select and radio questions need at least one option." }, { status: 400 });
    }

    const db = firebaseDb();
    const eventRef = db.collection("events").doc();
    const slugBase = slugify(title) || `event-${eventRef.id.slice(0, 8)}`;
    const existingSlug = await db.collection("events").where("slug", "==", slugBase).limit(1).get();
    const slug = existingSlug.empty ? slugBase : `${slugBase}-${eventRef.id.slice(0, 6).toLowerCase()}`;
    const accessCode = visibility === "private" ? crypto.randomUUID().replaceAll("-", "").slice(0, 12) : null;
    const batch = db.batch();

    batch.set(eventRef, {
      slug, title, summary, description, category, format, visibility, accessCode,
      venue, address, mapUrl, onlineUrl, bannerUrl, logoUrl,
      organizerId: organizer.uid, organizerEmail: organizer.email,
      organizerName, organizerContactEmail, organizerPhone,
      startAt, endAt, registrationStart, registrationDeadline, timezone,
      terms, agenda, speakers, faqs, socialLinks, registrationFields,
      allowTeams, teamMin: allowTeams ? teamMin : 1, teamMax: allowTeams ? teamMax : 1,
      certificateEnabled, certificateType, certificateCondition,
      status: "published", createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    });
    for (const ticket of tickets) {
      batch.set(db.collection("ticketTypes").doc(), {
        eventId: eventRef.id, ...ticket, registeredCount: 0, isActive: true,
        createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      });
    }
    batch.set(db.collection("eventAuditLogs").doc(), {
      eventId: eventRef.id, actorId: organizer.uid, actorEmail: organizer.email,
      action: "event_created", summary: "Event published with its initial ticket and form configuration.",
      createdAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();
    return Response.json({ event: { id: eventRef.id, slug, accessCode } }, { status: 201 });
  } catch (error) {
    console.error("Unable to create event", error);
    return Response.json({ error: "The event could not be saved. Check the Firebase connection and try again." }, { status: 500 });
  }
}
