import { CircleUserRound, Compass, LayoutDashboard, LogIn, ScanLine, Ticket, TicketCheck } from "lucide-react";

import { AccountMenu } from "@/components/account-menu";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const canOrganize = user?.role === "organizer";
  const canCheckIn = canOrganize || user?.role === "coordinator";
  return <>
    <header className="site-header">
      <a className="brand" href="/" aria-label="events by µlearn home">
        <span className="brand-mark" aria-hidden="true"><Ticket strokeWidth={2.4} /></span>
        <span className="brand-name">events <small>by</small> µlearn</span>
      </a>
      <nav className="desktop-nav" aria-label="Main navigation">
        <a className="nav-link" href="/">Discover</a>
        <a className="nav-link" href="/my-tickets">My tickets</a>
        {canOrganize && <a className="nav-link" href="/organizer">Organize</a>}
        {canOrganize && <a className="nav-link" href="/organizer/payments">Payments</a>}
        {canCheckIn && <a className="nav-link" href="/check-in">Check-in</a>}
      </nav>
      <div className="header-actions">
        {canOrganize && <Button asChild className="header-create rounded-full bg-[#171719] px-5 text-white hover:bg-black">
          <a href="/organizer/events/new">Create event</a>
        </Button>}
        {user ? <AccountMenu user={user} /> : <Button asChild className="rounded-full bg-[#171719] px-5 text-white hover:bg-black"><a href="/login">Sign in</a></Button>}
      </div>
    </header>
    <nav className="mobile-nav" aria-label="Mobile navigation">
      <a href="/"><Compass /><span>Discover</span></a>
      <a href="/my-tickets"><TicketCheck /><span>Tickets</span></a>
      {canOrganize && <a href="/organizer"><LayoutDashboard /><span>Manage</span></a>}
      {canCheckIn && <a href="/check-in"><ScanLine /><span>Check-in</span></a>}
      {user ? <a href="/account"><CircleUserRound /><span>Account</span></a> : <a href="/login"><LogIn /><span>Sign in</span></a>}
    </nav>
  </>;
}
