import { notFound } from "next/navigation";

import { EventSharePanel } from "@/components/event-share-panel";
import { DeleteEventButton } from "@/components/delete-event-button";
import { SiteHeader } from "@/components/site-header";
import { getOrganizerEventShare } from "@/db/organizer";
import { requirePageUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function EventSharePage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const organizer = await requirePageUser(["organizer"], `/organizer/events/${eventId}/share`);
  const event = await getOrganizerEventShare(eventId, organizer.uid);
  if (!event) notFound();
  return <><SiteHeader /><main className="organizer-page share-page"><a className="back-link" href="/organizer/events">← Your events</a><EventSharePanel slug={event.slug} title={event.title} accessCode={event.accessCode} /><section className="event-danger-zone"><div><p className="section-kicker">Danger zone</p><h2>Delete this event</h2><p>Permanently remove the event and its related attendee data when it is no longer needed.</p></div><DeleteEventButton eventId={event.id} eventTitle={event.title} redirectTo="/organizer/events" /></section></main></>;
}
