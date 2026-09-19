import { MyTicketsLookup } from "@/components/my-tickets-lookup";
import { SiteHeader } from "@/components/site-header";
import { TicketQr } from "@/components/ticket-qr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { listAttendeeRegistrations } from "@/db/attendee";
import { requirePageUser } from "@/lib/auth";
import { formatEventDate, formatEventTime } from "@/lib/event-format";
import { CalendarDays, CheckCircle2, Link2, Ticket } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MyTicketsPage({ searchParams }: { searchParams: Promise<{ reference?: string }> }) {
  const { reference = "" } = await searchParams;
  const user = await requirePageUser(undefined, `/my-tickets${reference ? `?reference=${encodeURIComponent(reference)}` : ""}`);
  const registrations = await listAttendeeRegistrations(user.uid, user.email);
  return <><SiteHeader /><main className="ticket-page"><section className="ticket-page-head"><p className="section-kicker">My events</p><h1>Everything you&apos;re joining.</h1><p>Tickets and registrations connected to your verified Google account.</p></section>
    {registrations.length === 0 ? <Empty className="product-empty border"><EmptyHeader><EmptyMedia variant="icon"><CalendarDays /></EmptyMedia><EmptyTitle>No registrations yet</EmptyTitle><EmptyDescription>Explore published events or securely link a registration made with another email.</EmptyDescription></EmptyHeader><Button asChild className="rounded-full"><a href="/">Discover events</a></Button></Empty> : <section className="attendee-ticket-grid">{registrations.map((registration) => <article className="attendee-ticket-card" key={registration.id}><div className="attendee-ticket-top"><div><p>{formatEventDate(registration.startAt)}</p><h2>{registration.eventTitle}</h2><span>{formatEventTime(registration.startAt)} · {registration.venue}</span></div><Badge className={registration.status === "confirmed" ? "ticket-state-confirmed" : "ticket-state-pending"}>{registration.checkedInAt ? "checked in" : registration.status.replaceAll("_", " ")}</Badge></div>{registration.status === "confirmed" ? <div className="attendee-ticket-pass"><div><span>{registration.ticketName}</span><strong>{registration.attendeeName}</strong><small>{registration.reference}</small>{registration.checkedInAt && <em><CheckCircle2 /> Checked in</em>}</div><TicketQr reference={registration.reference} /></div> : <div className="attendee-ticket-pending"><Ticket /><div><strong>Ticket pending</strong><span>{registration.paymentStatus.replaceAll("_", " ")}</span></div></div>}</article>)}</section>}
    <section className="link-registration-section"><div><span className="link-registration-icon"><Link2 /></span><div><p className="section-kicker">Used another email?</p><h2>Link an existing registration</h2><p>Use the private reference from the acknowledgement email. This confirms ownership before adding it to your account.</p></div></div><MyTicketsLookup initialReference={reference} accountEmail={user.email} /></section>
  </main></>;
}
