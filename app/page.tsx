import { ArrowRight, CalendarDays, Clock3, MapPin, Search, Ticket } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { listPublishedEvents, type PublicEvent } from "@/db/queries";
import { formatEventDate, formatEventTime, formatPrice } from "@/lib/event-format";

export const dynamic = "force-dynamic";

function EventCard({ event }: { event: PublicEvent }) {
  const remaining = Math.max(0, event.quantity - event.registeredCount);
  return (
    <article className="real-event-card">
      <div className="real-event-accent">
        <Badge className="event-category">{event.category}</Badge>
        <div className="event-price">{formatPrice(event.pricePaise)}</div>
      </div>
      <div className="real-event-content">
        <p className="event-date"><CalendarDays /> {formatEventDate(event.startAt)}</p>
        <h2>{event.title}</h2>
        <p className="event-summary">{event.summary}</p>
        <div className="event-meta">
          <span><Clock3 /> {formatEventTime(event.startAt)}</span>
          <span><MapPin /> {event.venue}</span>
        </div>
        <div className="event-card-footer">
          <span>{remaining} {remaining === 1 ? "spot" : "spots"} available</span>
          <Button asChild variant="outline" className="rounded-full">
            <a href={`/events/${event.slug}`}>View event <ArrowRight /></a>
          </Button>
        </div>
      </div>
    </article>
  );
}

export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  let events: PublicEvent[] = [];
  let unavailable = false;
  try {
    events = await listPublishedEvents(q);
  } catch (error) {
    console.error("Unable to load events", error);
    unavailable = true;
  }
  const categories = [...new Set(events.map((event) => event.category))];

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <section className="discovery-compact">
        <div>
          <p className="section-kicker">Discover</p>
          <h1>Find an event worth showing up for.</h1>
        </div>
        <form className="search-panel" action="/" role="search">
          <Search className="search-icon" aria-hidden="true" />
          <Input className="search-input" name="q" defaultValue={q} aria-label="Search events" placeholder="Search events, clubs, or venues" />
          <Button className="search-button rounded-full" type="submit">Search</Button>
        </form>
        {categories.length > 0 && (
          <div className="category-row" aria-label="Available event categories">
            {categories.map((category) => <Badge key={category} variant="outline" className="category-data">{category}</Badge>)}
          </div>
        )}
      </section>

      <section className="real-events-section" aria-labelledby="events-title">
        <div className="section-heading">
          <div><p className="section-kicker">Published events</p><h2 id="events-title">What&apos;s happening</h2></div>
        </div>

        {unavailable ? (
          <Empty className="product-empty border">
            <EmptyHeader><EmptyMedia variant="icon"><Ticket /></EmptyMedia><EmptyTitle>Events are temporarily unavailable</EmptyTitle><EmptyDescription>The event database could not be reached. Try refreshing in a moment.</EmptyDescription></EmptyHeader>
          </Empty>
        ) : events.length === 0 ? (
          <Empty className="product-empty border">
            <EmptyHeader><EmptyMedia variant="icon"><CalendarDays /></EmptyMedia><EmptyTitle>{q ? "No matching events" : "No events have been published"}</EmptyTitle><EmptyDescription>{q ? "Try another event name, category, or venue." : "Create the first event to make it available for registration."}</EmptyDescription></EmptyHeader>
            <EmptyContent>{q ? <Button asChild variant="outline" className="rounded-full"><a href="/">Clear search</a></Button> : <Button asChild className="rounded-full"><a href="/organizer/events/new">Create an event <ArrowRight /></a></Button>}</EmptyContent>
          </Empty>
        ) : (
          <div className="real-events-grid">{events.map((event) => <EventCard event={event} key={event.id} />)}</div>
        )}
      </section>
    </main>
  );
}
