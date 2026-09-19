"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, Check, CreditCard, Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { RegistrationFieldType } from "@/lib/event-types";

type TicketDraft = {
  key: string; name: string; description: string; quantity: string; paid: boolean; priceRupees: string;
  salesStart: string; salesEnd: string; minPerOrder: string; maxPerOrder: string; visibility: "public" | "hidden";
  paymentUpiId: string; paymentPayeeName: string; paymentQrUrl: string;
};
type AgendaDraft = { key: string; time: string; title: string; description: string };
type SpeakerDraft = { key: string; name: string; title: string; profileUrl: string };
type FaqDraft = { key: string; question: string; answer: string };
type SocialDraft = { key: string; label: string; url: string };
type FieldDraft = {
  key: string; label: string; description: string; placeholder: string; type: RegistrationFieldType;
  required: boolean; options: string; conditionalFieldId: string; conditionalValue: string;
};

const key = () => crypto.randomUUID();
const newTicket = (): TicketDraft => ({ key: key(), name: "", description: "", quantity: "", paid: false, priceRupees: "", salesStart: "", salesEnd: "", minPerOrder: "1", maxPerOrder: "1", visibility: "public", paymentUpiId: "", paymentPayeeName: "", paymentQrUrl: "" });

export function CreateEventForm() {
  const router = useRouter();
  const [format, setFormat] = useState("offline");
  const [visibility, setVisibility] = useState("public");
  const [tickets, setTickets] = useState<TicketDraft[]>([newTicket()]);
  const [agenda, setAgenda] = useState<AgendaDraft[]>([]);
  const [speakers, setSpeakers] = useState<SpeakerDraft[]>([]);
  const [faqs, setFaqs] = useState<FaqDraft[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialDraft[]>([]);
  const [registrationFields, setRegistrationFields] = useState<FieldDraft[]>([]);
  const [allowTeams, setAllowTeams] = useState(false);
  const [certificateEnabled, setCertificateEnabled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const patchTicket = (ticketKey: string, patch: Partial<TicketDraft>) => setTickets((items) => items.map((item) => item.key === ticketKey ? { ...item, ...patch } : item));
  const patchAgenda = (itemKey: string, patch: Partial<AgendaDraft>) => setAgenda((items) => items.map((item) => item.key === itemKey ? { ...item, ...patch } : item));
  const patchSpeaker = (itemKey: string, patch: Partial<SpeakerDraft>) => setSpeakers((items) => items.map((item) => item.key === itemKey ? { ...item, ...patch } : item));
  const patchFaq = (itemKey: string, patch: Partial<FaqDraft>) => setFaqs((items) => items.map((item) => item.key === itemKey ? { ...item, ...patch } : item));
  const patchSocial = (itemKey: string, patch: Partial<SocialDraft>) => setSocialLinks((items) => items.map((item) => item.key === itemKey ? { ...item, ...patch } : item));
  const patchField = (itemKey: string, patch: Partial<FieldDraft>) => setRegistrationFields((items) => items.map((item) => item.key === itemKey ? { ...item, ...patch } : item));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const iso = (name: string) => {
      const value = String(form.get(name) ?? "");
      return value ? new Date(value).toISOString() : "";
    };
    const localIso = (value: string) => value ? new Date(value).toISOString() : "";

    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: form.get("title"), summary: form.get("summary"), description: form.get("description"), category: form.get("category"),
          bannerUrl: form.get("bannerUrl"), logoUrl: form.get("logoUrl"), format, visibility,
          venue: form.get("venue"), address: form.get("address"), mapUrl: form.get("mapUrl"), onlineUrl: form.get("onlineUrl"),
          organizerName: form.get("organizerName"), organizerContactEmail: form.get("organizerContactEmail"), organizerPhone: form.get("organizerPhone"),
          timezone: form.get("timezone"), startAt: iso("startAt"), endAt: iso("endAt"), registrationStart: iso("registrationStart"), registrationDeadline: iso("registrationDeadline"),
          terms: form.get("terms"), allowTeams, teamMin: Number(form.get("teamMin") || 1), teamMax: Number(form.get("teamMax") || 1),
          certificateEnabled, certificateType: form.get("certificateType"), certificateCondition: form.get("certificateCondition"),
          tickets: tickets.map(({ key: itemKey, paid, ...ticket }) => { void itemKey; return { ...ticket, priceRupees: paid ? Number(ticket.priceRupees) : 0, salesStart: localIso(ticket.salesStart), salesEnd: localIso(ticket.salesEnd) }; }),
          agenda: agenda.map(({ key: itemKey, ...item }) => { void itemKey; return item; }),
          speakers: speakers.map(({ key: itemKey, ...item }) => { void itemKey; return item; }),
          faqs: faqs.map(({ key: itemKey, ...item }) => { void itemKey; return item; }),
          socialLinks: socialLinks.map(({ key: itemKey, ...item }) => { void itemKey; return item; }),
          registrationFields: registrationFields.map(({ key: fieldKey, options, ...field }) => ({ ...field, id: fieldKey, options: options.split("\n").map((item) => item.trim()).filter(Boolean) })),
        }),
      });
      const result = await response.json() as { error?: string; event?: { id: string } };
      if (!response.ok || !result.event) throw new Error(result.error || "The event could not be saved.");
      router.push(`/organizer/events/${result.event.id}/share`);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The event could not be saved.");
      setSubmitting(false);
    }
  }

  return (
    <form className="create-event-form" onSubmit={submit}>
      <section className="form-section">
        <div className="form-section-number">01</div>
        <div className="form-section-heading"><h2>Identity</h2><p>The public story, artwork, organizer, and visibility of this event.</p></div>
        <FieldGroup className="form-fields">
          <Field><FieldLabel htmlFor="title">Event name</FieldLabel><Input id="title" name="title" required maxLength={120} /></Field>
          <Field><FieldLabel htmlFor="summary">Short summary</FieldLabel><Input id="summary" name="summary" required maxLength={180} /><FieldDescription>One clear sentence used in discovery and share previews.</FieldDescription></Field>
          <Field><FieldLabel htmlFor="description">Full description</FieldLabel><Textarea id="description" name="description" required rows={7} /></Field>
          <div className="field-pair">
            <Field><FieldLabel htmlFor="category">Category</FieldLabel><Input id="category" name="category" required placeholder="Technology, arts, community…" /></Field>
            <Field><FieldLabel htmlFor="visibility">Visibility</FieldLabel><select id="visibility" className="native-select" value={visibility} onChange={(event) => setVisibility(event.target.value)}><option value="public">Public — shown in discovery</option><option value="unlisted">Unlisted — link only</option><option value="private">Private — protected link</option></select></Field>
          </div>
          <div className="field-pair">
            <Field><FieldLabel htmlFor="bannerUrl">Banner image URL</FieldLabel><Input id="bannerUrl" name="bannerUrl" type="url" placeholder="https://…" /></Field>
            <Field><FieldLabel htmlFor="logoUrl">Event logo URL</FieldLabel><Input id="logoUrl" name="logoUrl" type="url" placeholder="https://…" /></Field>
          </div>
          <div className="field-pair">
            <Field><FieldLabel htmlFor="organizerName">Organizer name</FieldLabel><Input id="organizerName" name="organizerName" defaultValue="Events by µLearn" required /></Field>
            <Field><FieldLabel htmlFor="organizerContactEmail">Contact email</FieldLabel><Input id="organizerContactEmail" name="organizerContactEmail" type="email" required /></Field>
          </div>
          <Field><FieldLabel htmlFor="organizerPhone">Contact phone</FieldLabel><Input id="organizerPhone" name="organizerPhone" type="tel" /></Field>
        </FieldGroup>
      </section>

      <section className="form-section">
        <div className="form-section-number">02</div>
        <div className="form-section-heading"><h2>Schedule and access</h2><p>Set the registration window independently from the event dates.</p></div>
        <FieldGroup className="form-fields">
          <div className="field-pair">
            <Field><FieldLabel htmlFor="registrationStart">Registration opens</FieldLabel><Input id="registrationStart" name="registrationStart" type="datetime-local" required /></Field>
            <Field><FieldLabel htmlFor="registrationDeadline">Registration closes</FieldLabel><Input id="registrationDeadline" name="registrationDeadline" type="datetime-local" required /></Field>
          </div>
          <div className="field-pair">
            <Field><FieldLabel htmlFor="startAt">Event starts</FieldLabel><Input id="startAt" name="startAt" type="datetime-local" required /></Field>
            <Field><FieldLabel htmlFor="endAt">Event ends</FieldLabel><Input id="endAt" name="endAt" type="datetime-local" required /></Field>
          </div>
          <div className="field-pair">
            <Field><FieldLabel htmlFor="timezone">Timezone</FieldLabel><Input id="timezone" name="timezone" defaultValue="Asia/Kolkata" required /></Field>
            <Field><FieldLabel htmlFor="format">Format</FieldLabel><select id="format" className="native-select" value={format} onChange={(event) => setFormat(event.target.value)}><option value="offline">Offline</option><option value="online">Online</option><option value="hybrid">Hybrid</option></select></Field>
          </div>
          {format !== "online" && <><Field><FieldLabel htmlFor="venue">Venue</FieldLabel><Input id="venue" name="venue" required /></Field><Field><FieldLabel htmlFor="address">Full address</FieldLabel><Textarea id="address" name="address" rows={3} /></Field><Field><FieldLabel htmlFor="mapUrl">Map link</FieldLabel><Input id="mapUrl" name="mapUrl" type="url" placeholder="https://maps.google.com/…" /></Field></>}
          {format !== "offline" && <Field><FieldLabel htmlFor="onlineUrl">Online joining link</FieldLabel><Input id="onlineUrl" name="onlineUrl" type="url" required={format === "online"} placeholder="https://…" /><FieldDescription>This is saved with the event. Share it only with confirmed attendees when appropriate.</FieldDescription></Field>}
        </FieldGroup>
      </section>

      <section className="form-section">
        <div className="form-section-number">03</div>
        <div className="form-section-heading"><h2>Tickets</h2><p>Create multiple admission categories, capacities, sale windows, and manual UPI instructions.</p></div>
        <div className="form-fields repeating-stack">
          {tickets.map((ticket, index) => <div className="builder-card" key={ticket.key}>
            <div className="builder-card-head"><div><span>Ticket {index + 1}</span><strong>{ticket.name || "Untitled ticket"}</strong></div>{tickets.length > 1 && <Button type="button" variant="ghost" size="icon" aria-label={`Remove ticket ${index + 1}`} onClick={() => setTickets((items) => items.filter((item) => item.key !== ticket.key))}><Trash2 /></Button>}</div>
            <div className="field-pair"><Field><FieldLabel>Name</FieldLabel><Input value={ticket.name} onChange={(event) => patchTicket(ticket.key, { name: event.target.value })} required /></Field><Field><FieldLabel>Capacity</FieldLabel><Input value={ticket.quantity} onChange={(event) => patchTicket(ticket.key, { quantity: event.target.value })} type="number" min="1" max="100000" required /></Field></div>
            <Field><FieldLabel>Description</FieldLabel><Textarea value={ticket.description} onChange={(event) => patchTicket(ticket.key, { description: event.target.value })} rows={2} /></Field>
            <div className="field-pair"><Field><FieldLabel>Sales start</FieldLabel><Input value={ticket.salesStart} onChange={(event) => patchTicket(ticket.key, { salesStart: event.target.value })} type="datetime-local" /><FieldDescription>Defaults to the event registration opening.</FieldDescription></Field><Field><FieldLabel>Sales end</FieldLabel><Input value={ticket.salesEnd} onChange={(event) => patchTicket(ticket.key, { salesEnd: event.target.value })} type="datetime-local" /><FieldDescription>Defaults to the event registration closing.</FieldDescription></Field></div>
            <div className="field-pair"><Field><FieldLabel>Minimum per registration</FieldLabel><Input value={ticket.minPerOrder} onChange={(event) => patchTicket(ticket.key, { minPerOrder: event.target.value })} type="number" min="1" max="20" required /></Field><Field><FieldLabel>Maximum per registration</FieldLabel><Input value={ticket.maxPerOrder} onChange={(event) => patchTicket(ticket.key, { maxPerOrder: event.target.value })} type="number" min="1" max="20" required /></Field></div>
            <Field><FieldLabel>Display</FieldLabel><select className="native-select" value={ticket.visibility} onChange={(event) => patchTicket(ticket.key, { visibility: event.target.value as "public" | "hidden" })}><option value="public">Publicly selectable</option><option value="hidden">Hidden / organizer use</option></select></Field>
            <div className="payment-choice" role="group" aria-label={`Payment type for ticket ${index + 1}`}>
              <button className={!ticket.paid ? "payment-option selected" : "payment-option"} type="button" onClick={() => patchTicket(ticket.key, { paid: false })}><span><Check /></span><strong>Free</strong><small>Ticket issued immediately</small></button>
              <button className={ticket.paid ? "payment-option selected" : "payment-option"} type="button" onClick={() => patchTicket(ticket.key, { paid: true })}><span><CreditCard /></span><strong>Manual UPI</strong><small>Organizer verifies proof</small></button>
            </div>
            {ticket.paid && <div className="manual-payment-fields"><div className="field-pair"><Field><FieldLabel>Price in rupees</FieldLabel><Input value={ticket.priceRupees} onChange={(event) => patchTicket(ticket.key, { priceRupees: event.target.value })} type="number" min="1" step="1" required /></Field><Field><FieldLabel>UPI ID</FieldLabel><Input value={ticket.paymentUpiId} onChange={(event) => patchTicket(ticket.key, { paymentUpiId: event.target.value })} required /></Field></div><Field><FieldLabel>Payee name</FieldLabel><Input value={ticket.paymentPayeeName} onChange={(event) => patchTicket(ticket.key, { paymentPayeeName: event.target.value })} required /></Field><Field><FieldLabel>Payment QR image URL</FieldLabel><Input value={ticket.paymentQrUrl} onChange={(event) => patchTicket(ticket.key, { paymentQrUrl: event.target.value })} type="url" placeholder="https://…" /></Field></div>}
          </div>)}
          <Button type="button" variant="outline" className="builder-add" onClick={() => setTickets((items) => [...items, newTicket()])}><Plus /> Add ticket type</Button>
        </div>
      </section>

      <section className="form-section">
        <div className="form-section-number">04</div>
        <div className="form-section-heading"><h2>Event page content</h2><p>Add an agenda, speakers, FAQs, links, and terms. Empty groups remain hidden publicly.</p></div>
        <div className="form-fields repeating-stack">
          <BuilderGroup title="Agenda" addLabel="Add agenda item" onAdd={() => setAgenda((items) => [...items, { key: key(), time: "", title: "", description: "" }])}>
            {agenda.map((item) => <div className="builder-row three" key={item.key}><Input aria-label="Agenda time" placeholder="10:00 AM" value={item.time} onChange={(event) => patchAgenda(item.key, { time: event.target.value })} /><Input aria-label="Agenda title" placeholder="Session title" value={item.title} onChange={(event) => patchAgenda(item.key, { title: event.target.value })} /><Input aria-label="Agenda description" placeholder="Short description" value={item.description} onChange={(event) => patchAgenda(item.key, { description: event.target.value })} /><RemoveButton label="Remove agenda item" onClick={() => setAgenda((items) => items.filter((entry) => entry.key !== item.key))} /></div>)}
          </BuilderGroup>
          <BuilderGroup title="Speakers" addLabel="Add speaker" onAdd={() => setSpeakers((items) => [...items, { key: key(), name: "", title: "", profileUrl: "" }])}>
            {speakers.map((item) => <div className="builder-row three" key={item.key}><Input aria-label="Speaker name" placeholder="Name" value={item.name} onChange={(event) => patchSpeaker(item.key, { name: event.target.value })} /><Input aria-label="Speaker title" placeholder="Role or topic" value={item.title} onChange={(event) => patchSpeaker(item.key, { title: event.target.value })} /><Input aria-label="Speaker profile URL" placeholder="Profile URL" type="url" value={item.profileUrl} onChange={(event) => patchSpeaker(item.key, { profileUrl: event.target.value })} /><RemoveButton label="Remove speaker" onClick={() => setSpeakers((items) => items.filter((entry) => entry.key !== item.key))} /></div>)}
          </BuilderGroup>
          <BuilderGroup title="Frequently asked questions" addLabel="Add FAQ" onAdd={() => setFaqs((items) => [...items, { key: key(), question: "", answer: "" }])}>
            {faqs.map((item) => <div className="builder-row two" key={item.key}><Input aria-label="FAQ question" placeholder="Question" value={item.question} onChange={(event) => patchFaq(item.key, { question: event.target.value })} /><Input aria-label="FAQ answer" placeholder="Answer" value={item.answer} onChange={(event) => patchFaq(item.key, { answer: event.target.value })} /><RemoveButton label="Remove FAQ" onClick={() => setFaqs((items) => items.filter((entry) => entry.key !== item.key))} /></div>)}
          </BuilderGroup>
          <BuilderGroup title="Social and community links" addLabel="Add link" onAdd={() => setSocialLinks((items) => [...items, { key: key(), label: "", url: "" }])}>
            {socialLinks.map((item) => <div className="builder-row two" key={item.key}><Input aria-label="Link label" placeholder="Instagram, WhatsApp, website…" value={item.label} onChange={(event) => patchSocial(item.key, { label: event.target.value })} /><Input aria-label="Link URL" placeholder="https://…" type="url" value={item.url} onChange={(event) => patchSocial(item.key, { url: event.target.value })} /><RemoveButton label="Remove link" onClick={() => setSocialLinks((items) => items.filter((entry) => entry.key !== item.key))} /></div>)}
          </BuilderGroup>
          <Field><FieldLabel htmlFor="terms">Terms and attendee notes</FieldLabel><Textarea id="terms" name="terms" rows={5} placeholder="Entry rules, cancellation policy, accessibility notes…" /></Field>
        </div>
      </section>

      <section className="form-section">
        <div className="form-section-number">05</div>
        <div className="form-section-heading"><h2>Registration form</h2><p>Name, verified email, and phone are built in. Add event-specific questions and conditional display rules.</p></div>
        <div className="form-fields repeating-stack">
          <div className="default-field-note"><Check /><span><strong>Included by default</strong> Full name, verified Google email, and phone number.</span></div>
          {registrationFields.map((field, index) => <div className="builder-card" key={field.key}>
            <div className="builder-card-head"><div><span>Question {index + 1}</span><strong>{field.label || "Untitled question"}</strong></div><RemoveButton label="Remove question" onClick={() => setRegistrationFields((items) => items.filter((item) => item.key !== field.key))} /></div>
            <div className="field-pair"><Field><FieldLabel>Question</FieldLabel><Input value={field.label} onChange={(event) => patchField(field.key, { label: event.target.value })} required /></Field><Field><FieldLabel>Answer type</FieldLabel><select className="native-select" value={field.type} onChange={(event) => patchField(field.key, { type: event.target.value as RegistrationFieldType })}>{["text", "textarea", "email", "phone", "number", "date", "url", "select", "radio", "checkbox"].map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}</select></Field></div>
            <div className="field-pair"><Field><FieldLabel>Description</FieldLabel><Input value={field.description} onChange={(event) => patchField(field.key, { description: event.target.value })} /></Field><Field><FieldLabel>Placeholder</FieldLabel><Input value={field.placeholder} onChange={(event) => patchField(field.key, { placeholder: event.target.value })} /></Field></div>
            {["select", "radio"].includes(field.type) && <Field><FieldLabel>Options</FieldLabel><Textarea value={field.options} onChange={(event) => patchField(field.key, { options: event.target.value })} rows={4} placeholder={"One option per line"} required /></Field>}
            <label className="toggle-row"><input type="checkbox" checked={field.required} onChange={(event) => patchField(field.key, { required: event.target.checked })} /><span><strong>Required question</strong><small>Attendees must answer before submitting.</small></span></label>
            {registrationFields.length > 1 && <div className="field-pair"><Field><FieldLabel>Show only after question</FieldLabel><select className="native-select" value={field.conditionalFieldId} onChange={(event) => patchField(field.key, { conditionalFieldId: event.target.value })}><option value="">Always show</option>{registrationFields.filter((item) => item.key !== field.key).map((item) => <option key={item.key} value={item.key}>{item.label || "Untitled question"}</option>)}</select></Field>{field.conditionalFieldId && <Field><FieldLabel>When answer equals</FieldLabel><Input value={field.conditionalValue} onChange={(event) => patchField(field.key, { conditionalValue: event.target.value })} required /></Field>}</div>}
          </div>)}
          <Button type="button" variant="outline" className="builder-add" onClick={() => setRegistrationFields((items) => [...items, { key: key(), label: "", description: "", placeholder: "", type: "text", required: false, options: "", conditionalFieldId: "", conditionalValue: "" }])}><Plus /> Add registration question</Button>
          <label className="toggle-row"><input type="checkbox" checked={allowTeams} onChange={(event) => setAllowTeams(event.target.checked)} /><span><strong>Enable team registration</strong><small>Collect a team name and member count with each registration.</small></span></label>
          {allowTeams && <div className="field-pair"><Field><FieldLabel htmlFor="teamMin">Minimum team members</FieldLabel><Input id="teamMin" name="teamMin" type="number" min="2" max="100" defaultValue="2" required /></Field><Field><FieldLabel htmlFor="teamMax">Maximum team members</FieldLabel><Input id="teamMax" name="teamMax" type="number" min="2" max="100" defaultValue="4" required /></Field></div>}
        </div>
      </section>

      <section className="form-section">
        <div className="form-section-number">06</div>
        <div className="form-section-heading"><h2>Completion</h2><p>Prepare post-event certificate rules now; issuance remains controlled by the organizer.</p></div>
        <FieldGroup className="form-fields">
          <label className="toggle-row"><input type="checkbox" checked={certificateEnabled} onChange={(event) => setCertificateEnabled(event.target.checked)} /><span><strong>Enable certificates</strong><small>Record eligibility for later certificate generation.</small></span></label>
          {certificateEnabled && <div className="field-pair"><Field><FieldLabel htmlFor="certificateType">Certificate type</FieldLabel><select id="certificateType" name="certificateType" className="native-select"><option value="participation">Participation</option><option value="achievement">Achievement</option><option value="completion">Completion</option></select></Field><Field><FieldLabel htmlFor="certificateCondition">Issue when</FieldLabel><select id="certificateCondition" name="certificateCondition" className="native-select"><option value="checked_in">Attendee checked in</option><option value="confirmed">Registration confirmed</option><option value="manual">Organizer approves manually</option></select></Field></div>}
        </FieldGroup>
      </section>

      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-submit-bar"><div><strong>Ready to publish?</strong><span>You&apos;ll get a public link and registration QR immediately after creation.</span></div><Button size="lg" className="rounded-full" disabled={submitting}>{submitting ? <><Loader2 className="animate-spin" /> Publishing event</> : <>Publish and get QR <ArrowRight /></>}</Button></div>
    </form>
  );
}

function BuilderGroup({ title, addLabel, onAdd, children }: { title: string; addLabel: string; onAdd: () => void; children: React.ReactNode }) {
  return <div className="inline-builder"><div className="inline-builder-head"><strong>{title}</strong><Button type="button" variant="outline" size="sm" onClick={onAdd}><Plus /> {addLabel}</Button></div>{children}</div>;
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <Button type="button" variant="ghost" size="icon" aria-label={label} onClick={onClick}><Trash2 /></Button>;
}
