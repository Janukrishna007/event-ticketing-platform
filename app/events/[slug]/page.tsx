import { ArrowLeft, CalendarDays, Clock3, ExternalLink, HelpCircle, LogIn, MapPin, Mic2, Ticket, UserRound } from "lucide-react";
import { notFound } from "next/navigation";
import Link from "next/link";

import { RegistrationForm } from "@/components/registration-form";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPublishedEvent } from "@/db/queries";
import { getCurrentUser } from "@/lib/auth";
import { formatEventDate, formatEventTime, formatPrice } from "@/lib/event-format";

export const dynamic = "force-dynamic";

export default async function EventPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ access?: string }> }) {
  const { slug } = await params;
  const { access = "" } = await searchParams;
  const event = await getPublishedEvent(slug, access);
  if (!event) notFound();
  const user = await getCurrentUser();
  const publicTickets = event.tickets.filter((ticket) => ticket.visibility !== "hidden");
  const totalRemaining = publicTickets.reduce((total, ticket) => total + Math.max(0, ticket.quantity - ticket.registeredCount), 0);
  const minimumPrice = Math.min(...publicTickets.map((ticket) => ticket.pricePaise));
  const returnPath = `/events/${event.slug}${access ? `?access=${encodeURIComponent(access)}` : ""}`;

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <div className="event-detail-shell">
        <Link className="back-link" href="/"><ArrowLeft /> All events</Link>
        <div className={`event-detail-hero${event.bannerUrl ? " has-event-banner" : ""}`} style={event.bannerUrl ? { backgroundImage: `linear-gradient(110deg, rgba(13,14,32,.94), rgba(28,30,72,.76)), url(${JSON.stringify(event.bannerUrl).slice(1, -1)})` } : undefined}>
          <div className="event-detail-main">
            <div className="event-detail-badges"><Badge>{event.category}</Badge><Badge variant="outline">{event.format}</Badge>{event.visibility !== "public" && <Badge variant="outline">{event.visibility}</Badge>}</div>
            {/* Organizer-provided remote URLs cannot be known to the Next image optimizer ahead of time. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {event.logoUrl && <img className="event-logo" src={event.logoUrl} alt="" />}
            <h1>{event.title}</h1>
            <p>{event.summary}</p>
          </div>
          <div className="event-detail-ticket"><span>{publicTickets.length > 1 ? `${publicTickets.length} ticket types` : publicTickets[0]?.name ?? "Admission"}</span><strong>{minimumPrice === Infinity ? "Unavailable" : minimumPrice === 0 ? "Free" : `From ${formatPrice(minimumPrice)}`}</strong><small>{totalRemaining} available</small></div>
        </div>

        <div className="event-detail-layout">
          <article className="event-information">
            <div className="event-fact-grid">
              <div><CalendarDays /><span>Date<strong>{formatEventDate(event.startAt)}</strong></span></div>
              <div><Clock3 /><span>Time<strong>{formatEventTime(event.startAt)} – {formatEventTime(event.endAt)}</strong></span></div>
              <div><MapPin /><span>Venue<strong>{event.format === "online" ? "Online" : event.venue}</strong></span></div>
              <div><Ticket /><span>Tickets<strong>{publicTickets.length} option{publicTickets.length === 1 ? "" : "s"}</strong></span></div>
            </div>
            <section><p className="section-kicker">About this event</p><h2>Event details</h2><div className="event-description preserve-lines">{event.description}</div></section>
            {(event.address || event.mapUrl) && <section><p className="section-kicker">Location</p><h2>{event.venue}</h2>{event.address && <div className="event-description preserve-lines">{event.address}</div>}{event.mapUrl && <Button asChild variant="outline" className="rounded-full event-content-action"><a href={event.mapUrl} target="_blank" rel="noreferrer"><MapPin /> Open map</a></Button>}</section>}
            {event.agenda.length > 0 && <section><p className="section-kicker">Schedule</p><h2>What&apos;s happening</h2><div className="agenda-list">{event.agenda.map((item, index) => <div key={`${item.time}-${item.title}-${index}`}><time>{item.time || "Schedule"}</time><span><strong>{item.title}</strong>{item.description && <small>{item.description}</small>}</span></div>)}</div></section>}
            {event.speakers.length > 0 && <section><p className="section-kicker">People</p><h2>Speakers and hosts</h2><div className="speaker-grid">{event.speakers.map((speaker, index) => <article key={`${speaker.name}-${index}`}><span><Mic2 /></span><div><strong>{speaker.name}</strong><small>{speaker.title}</small>{speaker.profileUrl && <a href={speaker.profileUrl} target="_blank" rel="noreferrer">View profile <ExternalLink /></a>}</div></article>)}</div></section>}
            {event.faqs.length > 0 && <section><p className="section-kicker">Good to know</p><h2>Frequently asked questions</h2><div className="faq-list">{event.faqs.map((faq, index) => <details key={`${faq.question}-${index}`}><summary><HelpCircle /> {faq.question}</summary><p>{faq.answer}</p></details>)}</div></section>}
            {(event.terms || event.socialLinks.length > 0 || event.organizerName) && <section><p className="section-kicker">Organizer</p><h2>{event.organizerName}</h2><div className="organizer-contact-line"><UserRound /><span>{event.organizerContactEmail}{event.organizerPhone ? ` · ${event.organizerPhone}` : ""}</span></div>{event.socialLinks.length > 0 && <div className="social-link-row">{event.socialLinks.map((link, index) => <a key={`${link.url}-${index}`} href={link.url} target="_blank" rel="noreferrer">{link.label} <ExternalLink /></a>)}</div>}{event.terms && <details className="terms-disclosure"><summary>Event terms and attendee notes</summary><p className="preserve-lines">{event.terms}</p></details>}</section>}
          </article>
          <aside>{user ? <RegistrationForm eventId={event.id} tickets={event.tickets} registrationFields={event.registrationFields} allowTeams={event.allowTeams} teamMin={event.teamMin} teamMax={event.teamMax} accountName={user.name} accountEmail={user.email} /> : <div className="registration-form sign-in-to-register"><span><LogIn /></span><div><p className="section-kicker">Registration</p><h2>Sign in to reserve your spot</h2><p>Your verified Google account keeps the acknowledgement and ticket securely connected to you.</p></div><Button asChild size="lg" className="rounded-full"><a href={`/login?next=${encodeURIComponent(returnPath)}`}>Continue with Google</a></Button></div>}</aside>
        </div>
      </div>
    </main>
  );
}
