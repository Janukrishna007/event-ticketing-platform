import { ArrowUpRight, CalendarDays, CheckCircle2, CreditCard, Ticket, Users } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { listOrganizerEvents, listOrganizerRegistrations } from "@/db/organizer";
import { formatEventDate } from "@/lib/event-format";
import { requirePageUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function OrganizerDashboard() {
  const organizer = await requirePageUser(["organizer"], "/organizer");
  let events: Awaited<ReturnType<typeof listOrganizerEvents>> = [];
  let registrations: Awaited<ReturnType<typeof listOrganizerRegistrations>> = [];
  let available = true;
  try { [events, registrations] = await Promise.all([listOrganizerEvents(organizer.uid), listOrganizerRegistrations(organizer.uid)]); } catch (error) { available = false; console.error("Unable to load organizer dashboard", error); }
  const confirmed = registrations.filter((registration) => registration.status === "confirmed").length;
  const checkedIn = registrations.filter((registration) => registration.checkedInAt).length;
  const pendingPayments = registrations.filter((registration) => ["awaiting_payment", "proof_submitted"].includes(registration.paymentStatus)).length;

  return <><SiteHeader /><main className="organizer-dashboard"><section className="organizer-dashboard-head"><div><p className="section-kicker">Organizer workspace</p><h1>Every event, one clear view.</h1><p>Track registrations, payment reviews, and event-day entry using live Firestore data.</p></div><Button asChild size="lg" className="rounded-full"><a href="/organizer/events/new">Create event <ArrowUpRight /></a></Button></section>
    {!available ? <Empty className="product-empty border"><EmptyHeader><EmptyMedia variant="icon"><CalendarDays /></EmptyMedia><EmptyTitle>Organizer data is unavailable</EmptyTitle><EmptyDescription>Check the Firebase connection and reload.</EmptyDescription></EmptyHeader></Empty> : <>
      <section className="metric-grid"><article><span><CalendarDays /></span><div><strong>{events.length}</strong><p>Events</p></div></article><article><span><Users /></span><div><strong>{registrations.length}</strong><p>Registrations</p></div></article><article><span><Ticket /></span><div><strong>{confirmed}</strong><p>Confirmed tickets</p></div></article><article><span><CheckCircle2 /></span><div><strong>{checkedIn}</strong><p>Checked in</p></div></article><article><span><CreditCard /></span><div><strong>{pendingPayments}</strong><p>Payments pending</p></div></article></section>
      <section className="dashboard-grid"><div className="dashboard-panel"><div className="dashboard-panel-head"><div><p className="section-kicker">Events</p><h2>Current portfolio</h2></div><Button asChild variant="outline" className="rounded-full"><a href="/organizer/events">View all</a></Button></div>{events.length ? <div className="dashboard-event-list">{events.slice(0, 4).map((event) => <a key={event.id} href={`/events/${event.slug}`}><div><strong>{event.title}</strong><span>{formatEventDate(event.startAt)} · {event.venue}</span></div><div><strong>{event.registrations}</strong><span>registered</span></div><ArrowUpRight /></a>)}</div> : <div className="dashboard-empty"><CalendarDays /><p>No events have been published yet.</p><a href="/organizer/events/new">Create the first event</a></div>}</div>
      <aside className="dashboard-actions"><p className="section-kicker">Quick actions</p><h2>Keep things moving</h2><a href="/organizer/registrations"><Users /><div><strong>Attendee records</strong><span>Search every registration</span></div><ArrowUpRight /></a><a href="/organizer/payments"><CreditCard /><div><strong>Payment reviews</strong><span>Verify submitted proofs</span></div><ArrowUpRight /></a><a href="/check-in"><CheckCircle2 /><div><strong>Check-in desk</strong><span>Validate and admit tickets</span></div><ArrowUpRight /></a></aside></section>
    </>}
  </main></>;
}
