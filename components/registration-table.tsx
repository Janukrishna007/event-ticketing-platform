"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import type { OrganizerRegistration } from "@/db/organizer";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function RegistrationTable({ registrations }: { registrations: OrganizerRegistration[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return registrations;
    return registrations.filter((registration) => [registration.fullName, registration.email, registration.phone, registration.reference, registration.eventTitle].some((value) => value.toLowerCase().includes(term)));
  }, [query, registrations]);

  return (
    <div className="registration-management-card">
      <div className="registration-toolbar"><div className="registration-search"><Search /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, phone, event, or ticket ID" aria-label="Search registrations" /></div><span>{filtered.length} {filtered.length === 1 ? "registration" : "registrations"}</span></div>
      <div className="registration-table-scroll">
        <Table>
          <TableHeader><TableRow><TableHead>Attendee</TableHead><TableHead>Event</TableHead><TableHead>Registration</TableHead><TableHead>Payment</TableHead><TableHead>Check-in</TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.map((registration) => (
              <TableRow key={registration.id}>
                <TableCell><div className="review-person"><strong>{registration.fullName}</strong><span>{registration.email}</span><small>{registration.phone}</small></div></TableCell>
                <TableCell><div className="review-person"><strong>{registration.eventTitle}</strong><span>{registration.ticketName}</span></div></TableCell>
                <TableCell><div className="review-person"><strong>{registration.reference}</strong><span>{registration.createdAt ? new Date(registration.createdAt).toLocaleDateString("en-IN") : "Saving"}</span></div></TableCell>
                <TableCell><Badge variant="outline" className="status-badge">{registration.paymentStatus.replaceAll("_", " ")}</Badge></TableCell>
                <TableCell>{registration.checkedInAt ? <Badge className="status-badge status-success">Checked in</Badge> : <Badge variant="outline" className="status-badge">Not checked in</Badge>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {filtered.length === 0 && <div className="registration-no-results">No registrations match your search.</div>}
    </div>
  );
}
