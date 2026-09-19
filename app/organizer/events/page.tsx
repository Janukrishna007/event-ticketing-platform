import { ArrowUpRight, CalendarDays, CheckCircle2, Plus, QrCode, Users } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { DeleteEventButton } from "@/components/delete-event-button";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { listOrganizerEvents } from "@/db/organizer";
import { formatEventDate } from "@/lib/event-format";
import { requirePageUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function OrganizerEventsPage() {
  const organizer = await requirePageUser(["organizer"], "/organizer/events");
  let events: Awaited<ReturnType<typeof listOrganizerEvents>> = [];
  let available = true;
  try { events = await listOrganizerEvents(organizer.uid); } catch (error) { available = false; console.error("Unable to load organizer events", error); }
  return <><SiteHeader /><main className="organizer-page payment-review-page"><a className="back-link" href="/organizer">← Organizer dashboard</a><section className="organizer-list-head"><div><p className="section-kicker">Event management</p><h1>Your events</h1><p>Capacity, confirmation, and entry progress from the live database.</p></div><Button asChild size="lg" className="rounded-full"><a href="/organizer/events/new"><Plus /> Create event</a></Button></section>{!available ? <Empty className="product-empty border"><EmptyHeader><EmptyMedia variant="icon"><CalendarDays /></EmptyMedia><EmptyTitle>Events are unavailable</EmptyTitle><EmptyDescription>Check Firebase and reload this page.</EmptyDescription></EmptyHeader></Empty> : events.length === 0 ? <Empty className="product-empty border"><EmptyHeader><EmptyMedia variant="icon"><CalendarDays /></EmptyMedia><EmptyTitle>No events yet</EmptyTitle><EmptyDescription>Create an event to begin accepting registrations.</EmptyDescription></EmptyHeader><Button asChild><a href="/organizer/events/new">Create event</a></Button></Empty> : <section className="organizer-event-grid">{events.map((event) => <article key={event.id} className="organizer-event-card"><div className="organizer-event-card-head"><span>{event.status}</span><div className="event-card-icon-actions"><DeleteEventButton eventId={event.id} eventTitle={event.title} compact /><a href={`/organizer/events/${event.id}/share`} aria-label={`Share ${event.title}`}><QrCode /></a><a href={`/events/${event.slug}`} aria-label={`Open ${event.title}`}><ArrowUpRight /></a></div></div><div><p>{formatEventDate(event.startAt)}</p><h2>{event.title}</h2><span>{event.venue}</span></div><div className="event-progress"><div><span>Capacity</span><strong>{event.registrations} / {event.capacity}</strong></div><progress max={Math.max(event.capacity, 1)} value={event.registrations} /></div><div className="event-stat-row"><span><Users /> {event.confirmed} confirmed</span><span><CheckCircle2 /> {event.checkedIn} checked in</span></div></article>)}</section>}</main></>;
}
