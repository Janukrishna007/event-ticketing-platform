import { Users } from "lucide-react";

import { RegistrationTable } from "@/components/registration-table";
import { SiteHeader } from "@/components/site-header";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { listOrganizerRegistrations } from "@/db/organizer";
import { requirePageUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function OrganizerRegistrationsPage() {
  const organizer = await requirePageUser(["organizer"], "/organizer/registrations");
  let registrations: Awaited<ReturnType<typeof listOrganizerRegistrations>> = [];
  let available = true;
  try { registrations = await listOrganizerRegistrations(organizer.uid); } catch (error) { available = false; console.error("Unable to load registrations", error); }
  return <><SiteHeader /><main className="organizer-page payment-review-page"><a className="back-link" href="/organizer">← Organizer dashboard</a><section className="organizer-list-head"><div><p className="section-kicker">Attendee management</p><h1>Registrations</h1><p>Search attendee identity, payment status, and event-day attendance.</p></div></section>{!available ? <Empty className="product-empty border"><EmptyHeader><EmptyMedia variant="icon"><Users /></EmptyMedia><EmptyTitle>Registrations are unavailable</EmptyTitle><EmptyDescription>Check Firebase and reload.</EmptyDescription></EmptyHeader></Empty> : registrations.length === 0 ? <Empty className="product-empty border"><EmptyHeader><EmptyMedia variant="icon"><Users /></EmptyMedia><EmptyTitle>No registrations yet</EmptyTitle><EmptyDescription>Attendees will appear here as soon as they register.</EmptyDescription></EmptyHeader></Empty> : <RegistrationTable registrations={registrations} />}</main></>;
}
