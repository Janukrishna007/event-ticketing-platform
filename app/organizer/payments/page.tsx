import { CreditCard } from "lucide-react";

import { PaymentReviewTable } from "@/components/payment-review-table";
import { SiteHeader } from "@/components/site-header";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { listPaymentReviews, type PaymentReview } from "@/db/payment-reviews";
import { requirePageUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const organizer = await requirePageUser(["organizer"], "/organizer/payments");
  let reviews: PaymentReview[] = [];
  let unavailable = false;
  try { reviews = await listPaymentReviews(organizer.uid); } catch (error) { console.error("Unable to load payment reviews", error); unavailable = true; }
  return (
    <main className="min-h-screen">
      <SiteHeader />
      <div className="organizer-page payment-review-page">
        <div className="organizer-page-title"><p className="section-kicker">Organizer workspace</p><h1>Payment review</h1><p>Verify submitted UPI proof before confirming registrations.</p></div>
        {unavailable ? (
          <Empty className="product-empty border"><EmptyHeader><EmptyMedia variant="icon"><CreditCard /></EmptyMedia><EmptyTitle>Firebase is not connected</EmptyTitle><EmptyDescription>Add the Firebase server credentials, enable Firestore, then reload this page.</EmptyDescription></EmptyHeader></Empty>
        ) : reviews.length === 0 ? (
          <Empty className="product-empty border"><EmptyHeader><EmptyMedia variant="icon"><CreditCard /></EmptyMedia><EmptyTitle>No payments need review</EmptyTitle><EmptyDescription>New payment proof submissions will appear here automatically.</EmptyDescription></EmptyHeader></Empty>
        ) : <PaymentReviewTable reviews={reviews} />}
      </div>
    </main>
  );
}
