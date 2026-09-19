"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Search, ShieldCheck, Ticket } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CameraQrScanner } from "@/components/camera-qr-scanner";

type CheckInTicket = {
  reference: string;
  fullName: string;
  email: string;
  eventTitle: string;
  ticketName: string;
  status: string;
  checkedInAt: string | null;
};

export function CheckInConsole({ initialReference = "" }: { initialReference?: string }) {
  const [reference, setReference] = useState(initialReference);
  const [ticket, setTicket] = useState<CheckInTicket | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const verify = useCallback(async (value: string) => {
    if (!value.trim()) return;
    setLoading(true);
    setSuccess(false);
    setError("");
    try {
      const response = await fetch(`/api/check-in?reference=${encodeURIComponent(value.trim())}`);
      const result = await response.json() as { error?: string; ticket?: CheckInTicket };
      if (!response.ok || !result.ticket) throw new Error(result.error || "Ticket not found.");
      setTicket(result.ticket);
    } catch (cause) {
      setTicket(null);
      setError(cause instanceof Error ? cause.message : "Ticket not found.");
    } finally {
      setLoading(false);
    }
  }, []);

  function scanned(value: string) {
    setReference(value);
    void verify(value);
  }

  useEffect(() => {
    if (!initialReference) return;
    const timer = window.setTimeout(() => void verify(initialReference), 0);
    return () => window.clearTimeout(timer);
  }, [initialReference, verify]);

  async function checkIn() {
    if (!ticket) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/check-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reference: ticket.reference }),
      });
      const result = await response.json() as { error?: string; ticket?: CheckInTicket };
      if (!response.ok || !result.ticket) throw new Error(result.error || "Check-in failed.");
      setTicket(result.ticket);
      setSuccess(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Check-in failed.");
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent) { event.preventDefault(); void verify(reference); }

  return (
    <div className="check-in-console">
      <form className="check-in-search" onSubmit={submit}>
        <ShieldCheck />
        <div><p className="section-kicker">Event operations</p><h2>Scan or verify</h2><p>Use the device camera for the attendee&apos;s ticket QR, or enter its reference manually.</p></div>
        <CameraQrScanner onScan={scanned} />
        <div className="check-in-input"><Input value={reference} onChange={(event) => setReference(event.target.value.toUpperCase())} placeholder="EVT-XXXXXXXXXX" aria-label="Ticket reference" /><Button disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : <Search />} Verify</Button></div>
      </form>

      <div className="check-in-result">
        {error && <div className="check-in-message invalid"><AlertTriangle /><div><strong>Ticket could not be verified</strong><p>{error}</p></div></div>}
        {success && <div className="check-in-message valid"><CheckCircle2 /><div><strong>Check-in complete</strong><p>{ticket?.fullName} is admitted.</p></div></div>}
        {ticket && !success && <div className="verified-ticket"><div className="verified-ticket-icon"><Ticket /></div><div className="verified-ticket-head"><span>{ticket.eventTitle}</span><h3>{ticket.fullName}</h3><p>{ticket.ticketName} · {ticket.reference}</p></div><dl><div><dt>Email</dt><dd>{ticket.email}</dd></div><div><dt>Ticket status</dt><dd>{ticket.status}</dd></div><div><dt>Entry status</dt><dd>{ticket.checkedInAt ? `Checked in ${new Date(ticket.checkedInAt).toLocaleString("en-IN")}` : "Not checked in"}</dd></div></dl>{ticket.checkedInAt ? <div className="already-checked"><AlertTriangle /> Already checked in</div> : ticket.status === "confirmed" ? <Button size="lg" className="w-full rounded-full approve-button" disabled={loading} onClick={checkIn}><CheckCircle2 /> Check in attendee</Button> : <div className="check-in-message invalid"><AlertTriangle /><div><strong>Not valid for entry</strong><p>This registration is not confirmed.</p></div></div>}</div>}
        {!ticket && !error && <div className="check-in-placeholder"><ShieldCheck /><h3>Ready for the next attendee</h3><p>Scan their QR code or enter the ticket reference above.</p></div>}
      </div>
    </div>
  );
}
