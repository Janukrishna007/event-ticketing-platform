import { CheckInConsole } from "@/components/check-in-console";
import { SiteHeader } from "@/components/site-header";
import { requirePageUser } from "@/lib/auth";

export default async function CheckInPage({ searchParams }: { searchParams: Promise<{ ticket?: string }> }) {
  await requirePageUser(["organizer", "coordinator"], "/check-in");
  const { ticket = "" } = await searchParams;
  return <><SiteHeader /><main className="check-in-page"><section className="check-in-page-head"><p className="section-kicker">Coordinator mode</p><h1>Fast, confident entry.</h1><p>Verify each ticket against Firestore and prevent duplicate check-ins.</p></section><CheckInConsole initialReference={ticket} /></main></>;
}
