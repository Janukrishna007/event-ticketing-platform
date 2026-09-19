"use client";

import { CalendarDays, LogOut, ShieldCheck, TicketCheck, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { CurrentUser } from "@/lib/auth";

export function AccountMenu({ user }: { user: CurrentUser }) {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/session", { method: "DELETE" });
    router.push("/");
    router.refresh();
  }
  const initial = (user.name || user.email).slice(0, 1).toUpperCase();
  return <DropdownMenu><DropdownMenuTrigger className="account-trigger" aria-label="Open account menu"><Avatar>{user.picture && <AvatarImage src={user.picture} alt="" referrerPolicy="no-referrer" />}<AvatarFallback>{initial}</AvatarFallback></Avatar><span className="account-trigger-copy"><strong>{user.name}</strong><small>{user.role}</small></span></DropdownMenuTrigger><DropdownMenuContent className="account-dropdown" align="end" sideOffset={10}><DropdownMenuLabel><span className="account-menu-name">{user.name}</span><span className="account-menu-email">{user.email}</span></DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem asChild><a href="/my-tickets"><TicketCheck /> My tickets</a></DropdownMenuItem>{user.role === "organizer" && <DropdownMenuItem asChild><a href="/organizer"><ShieldCheck /> Organizer workspace</a></DropdownMenuItem>}{(user.role === "organizer" || user.role === "coordinator") && <DropdownMenuItem asChild><a href="/check-in"><CalendarDays /> Check-in desk</a></DropdownMenuItem>}<DropdownMenuItem asChild><a href="/account"><UserRound /> Account</a></DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onClick={logout}><LogOut /> Sign out</DropdownMenuItem></DropdownMenuContent></DropdownMenu>;
}
