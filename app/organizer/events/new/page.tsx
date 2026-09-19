import { ArrowLeft } from "lucide-react";

import { CreateEventForm } from "@/components/create-event-form";
import { SiteHeader } from "@/components/site-header";
import { requirePageUser } from "@/lib/auth";

export default async function NewEventPage() {
  await requirePageUser(["organizer"], "/organizer/events/new");
  return (
    <main className="min-h-screen">
      <SiteHeader />
      <div className="organizer-page">
        <a className="back-link" href="/"><ArrowLeft /> Back to events</a>
        <div className="organizer-page-title"><p className="section-kicker">Organizer workspace</p><h1>Create an event</h1><p>Publish real event information and open registration in one flow.</p></div>
        <CreateEventForm />
      </div>
    </main>
  );
}
