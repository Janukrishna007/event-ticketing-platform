# events by µlearn

A single, self-hostable event ticketing and management system for college events.

## Product areas

- Public event discovery and event detail pages
- Attendee registration and digital tickets
- Manual QR/UPI payment proof and organizer verification
- Organizer event, attendee, form, and coordinator management
- Mobile-friendly ticket scanning and check-in
- SMTP-based acknowledgement, confirmation, and ticket emails
- Certificates and event analytics

## Visual direction

The interface uses a premium light-only design system with generous spacing, clear hierarchy, controlled color, and accessible interaction states. Event artwork can be vibrant while the surrounding platform remains visually consistent.

## Local development

Copy `.env.example` to `.env.local`, then configure Firebase Admin and SMTP.

For local Firebase authentication, download a service-account JSON file from
Firebase Console → Project settings → Service accounts. Store it at
`E:\\event-ticketing-platform\\secrets\\firebase-service-account.json`; the
`secrets` directory is ignored by Git. Never commit or paste this file into chat.

Create Firestore for the `events-e2eb4` project. The application uses server-only
Admin SDK access, and the included Firestore rules deny direct client access.
Payment proof files are size-limited to 700 KB and stored as private binary fields
in the `paymentProofs` collection, so the project remains compatible with Spark.
The Firebase browser SDK configuration uses `NEXT_PUBLIC_FIREBASE_*` variables.
These identify the web app but do not grant Admin SDK access; server operations
still require the service-account credential described above.

```bash
npm install
npm run dev
```

The development server is available at `http://localhost:5173`.
Verify the database connection at `http://localhost:5173/api/health/firebase`.
A working connection returns `{"connected":true,"projectId":"events-e2eb4"}`.

To publish the included security rules after signing into Firebase CLI:

```bash
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

With a service-account credential configured locally, rules can also be deployed
through the Admin SDK without the Firebase CLI service-usage preflight:

```bash
npm run firebase:deploy-rules
```

## Build

```bash
npm run build
```

## Current implementation

The application starts with empty Firestore collections and never injects sample
records. Organizers can publish events with free or manual-UPI tickets. Attendees
can register, receive a reference, and upload payment proof. Organizers can review
that proof and approve or reject the payment.

Email jobs are stored in the `emailOutbox` Firestore collection. When SMTP is
configured, acknowledgement, proof-received, payment-confirmed, and rejection
messages are delivered by the server and their delivery state is recorded.

The primary collections are `events`, `ticketTypes`, `registrations`,
`paymentProofs`, and `emailOutbox`. Payment proofs are stored in separate private
Firestore documents and streamed through the organizer API instead of exposed
through public URLs. This design intentionally avoids paid Firebase Storage.

Before exposing the project on a public domain, add organizer authentication and
authorization; the current organizer routes are intended for local/private use.
