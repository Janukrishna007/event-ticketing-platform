"use client";

import { useState } from "react";
import { Loader2, Trash2, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DeleteEventButton({ eventId, eventTitle, compact = false, redirectTo }: { eventId: string; eventTitle: string; compact?: boolean; redirectTo?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const matches = confirmation === eventTitle;

  async function remove() {
    if (!matches || deleting) return;
    setDeleting(true);
    setError("");
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmTitle: confirmation }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "The event could not be deleted.");
      setOpen(false);
      setConfirmation("");
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The event could not be deleted.");
    } finally {
      setDeleting(false);
    }
  }

  function changeOpen(next: boolean) {
    if (deleting) return;
    setOpen(next);
    if (!next) { setConfirmation(""); setError(""); }
  }

  return <AlertDialog open={open} onOpenChange={changeOpen}>
    <AlertDialogTrigger asChild>{compact ? <Button type="button" variant="ghost" size="icon" className="event-delete-trigger" aria-label={`Delete ${eventTitle}`}><Trash2 /></Button> : <Button type="button" variant="destructive" className="rounded-full"><Trash2 /> Delete event</Button>}</AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader><AlertDialogMedia className="delete-event-media"><TriangleAlert /></AlertDialogMedia><AlertDialogTitle>Delete “{eventTitle}”?</AlertDialogTitle><AlertDialogDescription>This permanently removes the event, its tickets, registrations, payment proofs, queued event emails, and coordinator assignments. This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
      <div className="delete-confirm-field"><label htmlFor={`delete-${eventId}`}>Type <strong>{eventTitle}</strong> to confirm</label><Input id={`delete-${eventId}`} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" disabled={deleting} /></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <AlertDialogFooter><AlertDialogCancel disabled={deleting}>Keep event</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={!matches || deleting} onClick={(event) => { event.preventDefault(); void remove(); }}>{deleting ? <><Loader2 className="animate-spin" /> Deleting</> : <><Trash2 /> Delete permanently</>}</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
