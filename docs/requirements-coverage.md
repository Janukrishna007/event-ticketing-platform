# Events by µLearn — requirements coverage

This audit compares the current application with `event-ticketing-platform-idea.md`. It separates working functionality from advanced modules that still need implementation so deployment decisions are based on evidence rather than assumptions.

## Working end-to-end

| Specification area | Current implementation |
| --- | --- |
| Roles and Google authentication | Verified Google sign-in, persisted Firebase user profiles, and attendee / organizer / coordinator authorization. |
| Event discovery | Published public events, keyword search, category browsing, event cards, and event detail pages backed by Firestore. |
| Event creation | Identity, contact, artwork URLs, dates, registration window, timezone, format, venue/map/online access, visibility, terms, agenda, speakers, FAQs, social links, and audit-log creation. |
| Event deletion | Owner-only deletion with exact-name confirmation and cleanup of tickets, registrations, payment proofs, related queued email records, audit entries, and staff assignments. |
| Ticket management | Multiple free or paid ticket types, capacity, sale window, per-registration limits, visibility, description, and manual UPI payment instructions/QR. |
| Registration forms | Built-in identity fields plus organizer-defined text, long text, email, phone, number, date, URL, select, radio, and checkbox questions. Simple answer-based conditional display is supported. |
| Team registration | Organizer-controlled team enablement and min/max size; attendee team name and member count are stored. |
| Public registration sharing | A post-publish screen produces the exact registration link, downloadable QR PNG, and private-link access token when applicable. |
| Registration and payment | Free registration confirmation; paid registration acknowledgement; manual UPI proof upload; organizer approve/reject review; email outbox delivery attempts. |
| Digital attendee ticket | Unique ticket reference and QR are shown immediately for free tickets and in My Tickets after confirmation. |
| Check-in | Camera QR scanning, manual ticket-reference fallback, Firestore verification, organizer/coordinator event authorization, duplicate prevention, and valid/already-used/invalid states. |
| Organizer operations | Portfolio dashboard, event capacity, registrations, payment queue, attendee identity search, and check-in counts. |
| Responsive UI | Apple-inspired light interface with desktop and mobile navigation; verified at 390px without horizontal overflow. |

## Partially covered

| Specification area | What remains |
| --- | --- |
| Discovery filters | Keyword/category discovery works; dedicated date, location, format, and free/paid filter controls remain. |
| Multiple-email identity | Reference-based linking to a verified Google account works; a full multi-email verification/inbox ownership workflow remains. |
| Registration states | Awaiting payment, proof submitted, confirmed, and checked-in work; cancellation, rejection, refund, and completed-event states need full lifecycle actions. |
| Ticket customization | The ticket contains the required dynamic identity and QR data; a visual drag-and-drop ticket designer is not implemented. |
| Form builder | Core fields and conditional equals rules work; file upload questions, option CSV import, reusable templates, drag reordering, and complex AND/OR rules remain. |
| Teams | Team name and size work; individual member invitations/details and leader transfer remain. |
| Certificates | Eligibility settings are stored during event creation; certificate template design, generation, email delivery, and attendee downloads remain. |
| Statistics | Live totals, confirmations, pending payments, capacity, and check-ins work; revenue, refunds, cancellations, no-shows, and historical charts remain. |
| Attendee management | Search, status visibility, payment review, and manual/reference check-in work; CSV export, cancel, resend, editable answers, and bulk actions remain. |
| Coordinator operations | Role restrictions and assigned-event authorization are enforced; staff assignment UI, event picker, attendee identity search, and check-in history screens remain. |
| Navigation | Current navigation exposes the working product areas; certificates, analytics, forms, and staff links should be added only when those modules exist. |

## Not yet implemented

- Full edit-event workspace with change history views.
- Drag-and-drop ticket and certificate builders.
- Page-view, registration-click, campaign-link, and UTM analytics.
- Organizer staff/permission assignment interface.
- Automatic certificate generation and certificate dashboard.
- Optional future features from section 31, including coupons, waitlists, seating, marketplace, mobile apps, and integrations.

## Comparison with MakeMyPass

The implemented core now matches the parts most important to this college-use workflow: independent event and registration dates, online/offline setup, multiple ticket categories and sales windows, custom/conditional questions, team limits, shareable registration links/QRs, guest records, and camera check-in. MakeMyPass also provides mature advanced operations—bulk guest actions, checkout/multi-day scans, printing, coupons, deeper conditional ticket rules, and extensive post-event workflows—that are intentionally listed above rather than represented as complete.
