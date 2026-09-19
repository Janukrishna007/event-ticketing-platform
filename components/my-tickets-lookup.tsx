"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, Download, Loader2, Search, Ticket as TicketIcon } from "lucide-react";

import { TicketQr } from "@/components/ticket-qr";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatEventDate, formatEventTime } from "@/lib/event-format";

type TicketResult = {
  reference: string;
  attendeeName: string;
  eventTitle: string;
  ticketName: string;
  startAt: string;
  venue: string;
  status: string;
  paymentStatus: string;
  checkedInAt: string | null;
};

export function MyTicketsLookup({ initialReference = "", accountEmail }: { initialReference?: string; accountEmail: string }) {
  const [ticket, setTicket] = useState<TicketResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function lookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setTicket(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/tickets/lookup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reference: form.get("reference"), email: form.get("email") }),
      });
      const result = await response.json() as { error?: string; ticket?: TicketResult };
      if (!response.ok || !result.ticket) throw new Error(result.error || "Ticket not found.");
      setTicket(result.ticket);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ticket not found.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ticket-lookup-layout">
      <form className="ticket-lookup-form" onSubmit={lookup}>
        <div className="lookup-icon"><TicketIcon /></div>
        <div><p className="section-kicker">Secure linking</p><h2>Confirm the registration</h2><p>Enter its private reference and the exact email address originally used.</p></div>
        <FieldGroup>
          <Field><FieldLabel htmlFor="ticketReference">Ticket reference</FieldLabel><Input id="ticketReference" name="reference" defaultValue={initialReference} placeholder="EVT-XXXXXXXXXX" required /></Field>
          <Field><FieldLabel htmlFor="ticketEmail">Registration email</FieldLabel><Input id="ticketEmail" name="email" type="email" autoComplete="email" required /></Field>
        </FieldGroup>
        {error && <p className="form-error" role="alert">{error}</p>}
        <p className="lookup-account-note">Linking to <strong>{accountEmail}</strong></p>
        <Button className="w-full rounded-full" size="lg" disabled={loading}>{loading ? <><Loader2 className="animate-spin" /> Verifying</> : <><Search /> Verify and link</>}</Button>
      </form>

      <div className="ticket-result-shell">
        {!ticket ? (
          <div className="ticket-result-empty"><TicketIcon /><h3>Your ticket appears here</h3><p>Confirmed registrations include a scannable QR ticket. Pending registrations show their current payment status.</p></div>
        ) : ticket.status !== "confirmed" ? (
          <div className="ticket-pending"><span>Registration found</span><h3>{ticket.eventTitle}</h3><p>Your ticket is not issued yet.</p><div><strong>Status</strong><span>{ticket.paymentStatus.replaceAll("_", " ")}</span></div></div>
        ) : (
          <article className="digital-ticket" id="digital-ticket">
            <div className="digital-ticket-main">
              <div className="digital-ticket-brand"><TicketIcon /><span>events by µlearn</span></div>
              <div><span className="ticket-label">Admit one</span><h2>{ticket.eventTitle}</h2><p>{ticket.attendeeName}</p></div>
              <div className="ticket-meta-grid"><div><span>Date</span><strong>{formatEventDate(ticket.startAt)}</strong></div><div><span>Time</span><strong>{formatEventTime(ticket.startAt)}</strong></div><div><span>Venue</span><strong>{ticket.venue}</strong></div><div><span>Pass</span><strong>{ticket.ticketName}</strong></div></div>
              <div className="ticket-reference"><span>Ticket ID</span><strong>{ticket.reference}</strong></div>
            </div>
            <div className="digital-ticket-qr"><TicketQr reference={ticket.reference} />{ticket.checkedInAt ? <span className="checked-in-label"><CheckCircle2 /> Checked in</span> : <span>Present this code at entry</span>}</div>
            <Button type="button" variant="outline" className="ticket-download" onClick={() => window.print()}><Download /> Print ticket</Button>
          </article>
        )}
      </div>
    </div>
  );
}
