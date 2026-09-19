"use client";

import { FormEvent, useMemo, useState } from "react";
import { CheckCircle2, Copy, Loader2, Upload } from "lucide-react";

import { TicketQr } from "@/components/ticket-qr";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@/lib/event-format";
import type { EventTicket, RegistrationFieldDefinition } from "@/lib/event-types";

type RegistrationResult = {
  reference: string;
  status: string;
  paymentStatus: string;
  amountPaise: number;
  paymentUpiId: string | null;
  paymentPayeeName: string | null;
  paymentQrUrl: string | null;
};

type Props = {
  eventId: string;
  tickets: EventTicket[];
  registrationFields: RegistrationFieldDefinition[];
  allowTeams: boolean;
  teamMin: number;
  teamMax: number;
  accountName: string;
  accountEmail: string;
};

export function RegistrationForm({ eventId, tickets, registrationFields, allowTeams, teamMin, teamMax, accountName, accountEmail }: Props) {
  const publicTickets = useMemo(() => tickets.filter((ticket) => ticket.visibility !== "hidden"), [tickets]);
  const [ticketTypeId, setTicketTypeId] = useState(publicTickets[0]?.id ?? "");
  const [answers, setAnswers] = useState<Record<string, string | boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [registration, setRegistration] = useState<RegistrationResult | null>(null);
  const [proofSent, setProofSent] = useState(false);
  const [proofSubmitting, setProofSubmitting] = useState(false);
  const selectedTicket = publicTickets.find((ticket) => ticket.id === ticketTypeId) ?? publicTickets[0];
  const remaining = selectedTicket ? Math.max(0, selectedTicket.quantity - selectedTicket.registeredCount) : 0;

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/registrations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventId, ticketTypeId, fullName: form.get("fullName"), email: form.get("email"), phone: form.get("phone"), teamName: form.get("teamName"), teamSize: Number(form.get("teamSize") || 1), answers }),
      });
      const result = await response.json() as { error?: string; registration?: RegistrationResult };
      if (!response.ok || !result.registration) throw new Error(result.error || "Registration failed.");
      setRegistration(result.registration);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitProof(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!registration) return;
    setProofSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/registrations/${registration.reference}/payment-proof`, { method: "POST", body: new FormData(event.currentTarget) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Payment proof could not be submitted.");
      setProofSent(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Payment proof could not be submitted.");
    } finally {
      setProofSubmitting(false);
    }
  }

  if (registration?.status === "confirmed") {
    return <div className="registration-success ticket-success-panel"><CheckCircle2 /><div><p className="section-kicker">Registration confirmed</p><h3>You&apos;re registered.</h3><p>Your acknowledgement has been queued for email. Save this ticket QR for check-in.</p><div className="inline-ticket-qr"><TicketQr reference={registration.reference} /><strong>{registration.reference}</strong></div><Button asChild variant="outline" className="mt-4 rounded-full"><a href={`/my-tickets?reference=${registration.reference}`}>Open My Tickets</a></Button></div></div>;
  }

  if (registration && registration.paymentStatus === "awaiting_payment") {
    return (
      <div className="payment-panel">
        <div className="payment-panel-heading"><p className="section-kicker">Registration received</p><h3>Complete your payment</h3><p>Reference: <strong>{registration.reference}</strong></p></div>
        <div className="payment-amount"><span>Amount to pay</span><strong>{formatPrice(registration.amountPaise)}</strong></div>
        {/* The payment image is an organizer-provided URL and may use any host. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {registration.paymentQrUrl && <img className="payment-qr" src={registration.paymentQrUrl} alt="Organizer payment QR code" />}
        <div className="upi-detail"><div><span>Payee</span><strong>{registration.paymentPayeeName}</strong></div><div><span>UPI ID</span><strong>{registration.paymentUpiId}</strong></div><Button variant="outline" size="icon" aria-label="Copy UPI ID" onClick={() => navigator.clipboard.writeText(registration.paymentUpiId ?? "")}><Copy /></Button></div>
        {proofSent ? <div className="proof-success"><CheckCircle2 /><div><strong>Payment proof received</strong><p>The organizer will verify it before issuing your ticket QR.</p></div></div> : <form className="proof-form" onSubmit={submitProof}><FieldGroup><Field><FieldLabel htmlFor="paymentReference">UPI transaction reference</FieldLabel><Input id="paymentReference" name="paymentReference" required /></Field><Field><FieldLabel htmlFor="proof">Screenshot or receipt</FieldLabel><Input id="proof" name="proof" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required /><FieldDescription>JPG, PNG, WebP, or PDF up to 700 KB.</FieldDescription></Field></FieldGroup>{error && <p className="form-error" role="alert">{error}</p>}<Button className="w-full rounded-full" disabled={proofSubmitting}>{proofSubmitting ? <><Loader2 className="animate-spin" /> Uploading</> : <><Upload /> Submit payment proof</>}</Button></form>}
      </div>
    );
  }

  return (
    <form className="registration-form" onSubmit={register}>
      <div><p className="section-kicker">Registration</p><h2>Reserve your spot</h2><p>{remaining} {remaining === 1 ? "spot" : "spots"} available for the selected ticket.</p></div>
      <FieldGroup>
        {publicTickets.length > 1 && <Field><FieldLabel htmlFor="ticketType">Ticket type</FieldLabel><select id="ticketType" className="native-select" value={ticketTypeId} onChange={(event) => setTicketTypeId(event.target.value)}>{publicTickets.map((ticket) => <option key={ticket.id} value={ticket.id}>{ticket.name} — {formatPrice(ticket.pricePaise)}</option>)}</select></Field>}
        {publicTickets.length === 1 && <div className="selected-ticket-summary"><span>{publicTickets[0].name}</span><strong>{formatPrice(publicTickets[0].pricePaise)}</strong></div>}
        <Field><FieldLabel htmlFor="fullName">Full name</FieldLabel><Input id="fullName" name="fullName" autoComplete="name" defaultValue={accountName} required /></Field>
        <Field><FieldLabel htmlFor="email">Verified email address</FieldLabel><Input id="email" name="email" type="email" autoComplete="email" value={accountEmail} readOnly /><FieldDescription>Acknowledgements and the ticket will be sent to your signed-in Google account.</FieldDescription></Field>
        <Field><FieldLabel htmlFor="phone">Phone number</FieldLabel><Input id="phone" name="phone" type="tel" autoComplete="tel" required /></Field>
        {allowTeams && <div className="registration-custom-group"><p>Team details</p><Field><FieldLabel htmlFor="teamName">Team name</FieldLabel><Input id="teamName" name="teamName" required /></Field><Field><FieldLabel htmlFor="teamSize">Number of members</FieldLabel><Input id="teamSize" name="teamSize" type="number" min={teamMin} max={teamMax} defaultValue={teamMin} required /><FieldDescription>{teamMin}–{teamMax} members per team.</FieldDescription></Field></div>}
        {registrationFields.length > 0 && <div className="registration-custom-group"><p>Event questions</p>{registrationFields.map((field) => {
          const visible = !field.conditionalFieldId || String(answers[field.conditionalFieldId] ?? "") === field.conditionalValue;
          if (!visible) return null;
          return <RegistrationQuestion key={field.id} field={field} value={answers[field.id]} onChange={(value) => setAnswers((current) => ({ ...current, [field.id]: value }))} />;
        })}</div>}
      </FieldGroup>
      {error && <p className="form-error" role="alert">{error}</p>}
      <Button size="lg" className="w-full rounded-full" disabled={submitting || remaining < 1 || !ticketTypeId}>{submitting ? <><Loader2 className="animate-spin" /> Registering</> : remaining < 1 ? "Sold out" : "Submit registration"}</Button>
      <p className="registration-consent">By registering, you agree to share these details with the event organizer and accept the event terms.</p>
    </form>
  );
}

function RegistrationQuestion({ field, value, onChange }: { field: RegistrationFieldDefinition; value: string | boolean | undefined; onChange: (value: string | boolean) => void }) {
  const description = field.description ? <FieldDescription>{field.description}</FieldDescription> : null;
  if (field.type === "textarea") return <Field><FieldLabel>{field.label}</FieldLabel><Textarea value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} placeholder={field.placeholder} required={field.required} />{description}</Field>;
  if (field.type === "select") return <Field><FieldLabel>{field.label}</FieldLabel><select className="native-select" value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} required={field.required}><option value="">Select an option</option>{field.options.map((option) => <option key={option} value={option}>{option}</option>)}</select>{description}</Field>;
  if (field.type === "radio") return <fieldset className="registration-radio"><legend>{field.label}</legend>{description}<div>{field.options.map((option) => <label key={option}><input type="radio" name={field.id} value={option} checked={value === option} onChange={(event) => onChange(event.target.value)} required={field.required} /><span>{option}</span></label>)}</div></fieldset>;
  if (field.type === "checkbox") return <label className="toggle-row registration-answer-toggle"><input type="checkbox" checked={value === true} onChange={(event) => onChange(event.target.checked)} required={field.required} /><span><strong>{field.label}</strong>{field.description && <small>{field.description}</small>}</span></label>;
  const inputType = ["email", "phone", "number", "date", "url"].includes(field.type) ? (field.type === "phone" ? "tel" : field.type) : "text";
  return <Field><FieldLabel>{field.label}</FieldLabel><Input type={inputType} value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} placeholder={field.placeholder} required={field.required} />{description}</Field>;
}
