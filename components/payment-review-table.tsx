"use client";

import { useState } from "react";
import { Check, ExternalLink, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";

import type { PaymentReview } from "@/db/payment-reviews";
import { formatPrice } from "@/lib/event-format";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

export function PaymentReviewTable({ reviews }: { reviews: PaymentReview[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  async function submitReview(id: string, decision: "approve" | "reject") {
    setBusy(id);
    setError("");
    try {
      const response = await fetch(`/api/organizer/registrations/${id}/payment`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision, reason: decision === "reject" ? reason : undefined }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Payment review failed.");
      setReason("");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Payment review failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="payment-review-card">
      {error && <p className="form-error" role="alert">{error}</p>}
      <Table>
        <TableHeader><TableRow><TableHead>Attendee</TableHead><TableHead>Event</TableHead><TableHead>Payment</TableHead><TableHead>Proof</TableHead><TableHead className="text-right">Decision</TableHead></TableRow></TableHeader>
        <TableBody>
          {reviews.map((review) => (
            <TableRow key={review.id}>
              <TableCell><div className="review-person"><strong>{review.fullName}</strong><span>{review.email}</span><small>{review.reference}</small></div></TableCell>
              <TableCell>{review.eventTitle}</TableCell>
              <TableCell><div className="review-person"><strong>{formatPrice(review.amountPaise)}</strong><span>{review.paymentReference}</span></div></TableCell>
              <TableCell><Button asChild size="sm" variant="outline"><a href={`/api/organizer/payment-proofs/${review.id}`} target="_blank" rel="noreferrer">View <ExternalLink /></a></Button></TableCell>
              <TableCell><div className="review-actions">
                <Button size="sm" className="approve-button" disabled={busy === review.id} onClick={() => submitReview(review.id, "approve")}>{busy === review.id ? <Loader2 className="animate-spin" /> : <Check />} Approve</Button>
                <Dialog>
                  <DialogTrigger asChild><Button size="sm" variant="outline" disabled={busy === review.id}><X /> Reject</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Reject this payment?</DialogTitle><DialogDescription>The attendee will receive an email and can submit corrected proof.</DialogDescription></DialogHeader>
                    <Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain what needs to be corrected" rows={4} />
                    <DialogFooter><Button variant="destructive" disabled={busy === review.id} onClick={() => submitReview(review.id, "reject")}>Reject payment</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
              </div></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
