import { FieldValue } from "firebase-admin/firestore";

import { attemptEmailDelivery } from "@/lib/email";
import { firebaseDb } from "@/lib/firebase-admin";
import { authorizeApi } from "@/lib/auth";
import type { RegistrationFieldDefinition } from "@/lib/event-types";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function stableRegistrationId(eventId: string, email: string) {
  const data = new TextEncoder().encode(`${eventId}:${email}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: Request) {
  const authorization = await authorizeApi();
  if (authorization.response) return authorization.response;
  const account = authorization.user;
  try {
    const payload = await request.json() as Record<string, unknown>;
    const eventId = clean(payload.eventId);
    const ticketTypeId = clean(payload.ticketTypeId);
    const fullName = clean(payload.fullName);
    const email = account.email;
    const phone = clean(payload.phone);
    const teamName = clean(payload.teamName);
    const teamSize = Number(payload.teamSize ?? 1);
    const rawAnswers = payload.answers && typeof payload.answers === "object" && !Array.isArray(payload.answers)
      ? payload.answers as Record<string, unknown>
      : {};
    if (!eventId || !ticketTypeId || !fullName || !email || !phone) {
      return Response.json({ error: "Complete all registration fields." }, { status: 400 });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return Response.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const db = firebaseDb();
    const registrationId = await stableRegistrationId(eventId, email);
    const registrationRef = db.collection("registrations").doc(registrationId);
    const eventRef = db.collection("events").doc(eventId);
    const ticketRef = db.collection("ticketTypes").doc(ticketTypeId);
    const emailRef = db.collection("emailOutbox").doc();
    const reference = `EVT-${crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;
    let responseData: Record<string, unknown> = {};

    await db.runTransaction(async (transaction) => {
      const [eventSnapshot, ticketSnapshot, existingRegistration] = await Promise.all([
        transaction.get(eventRef), transaction.get(ticketRef), transaction.get(registrationRef),
      ]);
      if (!eventSnapshot.exists || !ticketSnapshot.exists) throw new Error("TICKET_NOT_AVAILABLE");
      if (existingRegistration.exists) throw new Error("ALREADY_REGISTERED");
      const event = eventSnapshot.data()!;
      const ticket = ticketSnapshot.data()!;
      if (event.status !== "published" || ticket.eventId !== eventId || !ticket.isActive) throw new Error("TICKET_NOT_AVAILABLE");
      if (event.registrationStart && Date.parse(event.registrationStart) > Date.now()) throw new Error("REGISTRATION_NOT_OPEN");
      if (Date.parse(event.registrationDeadline) < Date.now()) throw new Error("REGISTRATION_CLOSED");
      if (ticket.salesStart && Date.parse(ticket.salesStart) > Date.now()) throw new Error("TICKET_NOT_OPEN");
      if (ticket.salesEnd && Date.parse(ticket.salesEnd) < Date.now()) throw new Error("TICKET_SALES_CLOSED");
      if ((ticket.registeredCount ?? 0) >= ticket.quantity) throw new Error("SOLD_OUT");

      const fields = Array.isArray(event.registrationFields) ? event.registrationFields as RegistrationFieldDefinition[] : [];
      const answers: Record<string, string | boolean> = {};
      for (const field of fields) {
        const conditionMet = !field.conditionalFieldId || String(rawAnswers[field.conditionalFieldId] ?? "") === field.conditionalValue;
        if (!conditionMet) continue;
        const raw = rawAnswers[field.id];
        const answer = typeof raw === "boolean" ? raw : clean(raw).slice(0, 4_000);
        if (field.required && (answer === "" || answer === false)) throw new Error("REQUIRED_ANSWERS");
        if (answer !== "") answers[field.id] = answer;
      }
      const allowTeams = event.allowTeams === true;
      if (allowTeams && (!teamName || !Number.isInteger(teamSize) || teamSize < Number(event.teamMin) || teamSize > Number(event.teamMax))) {
        throw new Error("INVALID_TEAM");
      }

      const requiresPayment = ticket.pricePaise > 0;
      const status = requiresPayment ? "awaiting_payment" : "confirmed";
      const paymentStatus = requiresPayment ? "awaiting_payment" : "not_required";
      transaction.create(registrationRef, {
        reference, eventId, ticketTypeId, userId: account.uid, linkedUserIds: [account.uid], fullName, email, phone, status,
        paymentStatus, paymentReference: null, paymentProofId: null,
        paymentProofSubmittedAt: null, checkedInAt: null, checkInStatus: "not_checked_in",
        answers, teamName: allowTeams ? teamName : null, teamSize: allowTeams ? teamSize : 1,
        ticketIssuedAt: requiresPayment ? null : FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      });
      transaction.update(ticketRef, { registeredCount: (ticket.registeredCount ?? 0) + 1 });
      transaction.create(emailRef, {
        registrationId, type: "registration_acknowledgement", recipient: email,
        subject: requiresPayment ? `Registration received — ${event.title}` : `Registration confirmed — ${event.title}`,
        payload: { reference, eventTitle: event.title, fullName, requiresPayment },
        status: "queued", attempts: 0, createdAt: FieldValue.serverTimestamp(), lastError: null,
      });
      responseData = {
        reference, status, paymentStatus, amountPaise: ticket.pricePaise,
        paymentUpiId: ticket.paymentUpiId ?? null,
        paymentPayeeName: ticket.paymentPayeeName ?? null,
        paymentQrUrl: ticket.paymentQrUrl ?? null,
      };
    });

    await attemptEmailDelivery(emailRef.id);
    return Response.json({ registration: responseData }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const known: Record<string, [string, number]> = {
      ALREADY_REGISTERED: ["This email is already registered for the event.", 409],
      TICKET_NOT_AVAILABLE: ["This ticket is no longer available.", 404],
      REGISTRATION_CLOSED: ["Registration for this event has closed.", 409],
      REGISTRATION_NOT_OPEN: ["Registration for this event has not opened yet.", 409],
      TICKET_NOT_OPEN: ["This ticket is not on sale yet.", 409],
      TICKET_SALES_CLOSED: ["Sales for this ticket have closed.", 409],
      SOLD_OUT: ["This ticket is sold out.", 409],
      REQUIRED_ANSWERS: ["Complete all required event questions.", 400],
      INVALID_TEAM: ["Enter a valid team name and member count.", 400],
    };
    if (known[message]) return Response.json({ error: known[message][0] }, { status: known[message][1] });
    console.error("Unable to create registration", error);
    return Response.json({ error: "Your registration could not be saved. Check the Firebase connection and try again." }, { status: 500 });
  }
}
