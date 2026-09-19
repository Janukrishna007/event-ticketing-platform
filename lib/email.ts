import nodemailer from "nodemailer";

import { firebaseDb } from "@/lib/firebase-admin";

type EmailJob = {
  recipient: string;
  subject: string;
  type: string;
  payload: Record<string, unknown>;
  status: string;
  attempts: number;
};

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character] ?? character);
}

function emailBody(job: EmailJob) {
  const name = escapeHtml(job.payload.fullName);
  const eventTitle = escapeHtml(job.payload.eventTitle);
  const reference = escapeHtml(job.payload.reference);
  const messages: Record<string, { heading: string; body: string }> = {
    registration_acknowledgement: {
      heading: job.payload.requiresPayment ? "Registration received" : "Registration confirmed",
      body: job.payload.requiresPayment
        ? "Complete the manual payment and submit the payment proof. Your ticket will be issued after verification."
        : "Your registration is confirmed. Keep your registration reference safe.",
    },
    payment_proof_received: {
      heading: "Payment proof received",
      body: "The organizer will review your payment. You will receive another email after it is approved or rejected.",
    },
    payment_confirmed: {
      heading: "Payment confirmed",
      body: "Your payment is verified and your registration is now confirmed.",
    },
    payment_rejected: {
      heading: "Payment needs attention",
      body: `The organizer could not verify this payment. ${escapeHtml(job.payload.reason || "Please check the transaction details and submit the proof again.")}`,
    },
  };
  const content = messages[job.type] ?? { heading: "Event update", body: "There is an update to your registration." };
  return `<!doctype html><html><body style="margin:0;background:#f5f5f8;font-family:Arial,sans-serif;color:#202024"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:36px 16px"><table role="presentation" width="100%" style="max-width:600px;margin:auto;background:#fff;border:1px solid #e3e3e9;border-radius:20px"><tr><td style="padding:34px"><p style="margin:0 0 28px;color:#5b5ee8;font-weight:700">events by µlearn</p><h1 style="margin:0 0 12px;font-size:28px">${content.heading}</h1><p style="margin:0 0 20px;color:#65656d;line-height:1.65">Hi ${name}, ${content.body}</p><div style="padding:18px;background:#f4f4fa;border-radius:14px"><strong>${eventTitle}</strong><br><span style="color:#777780;font-size:14px">Registration reference: ${reference}</span></div></td></tr></table></td></tr></table></body></html>`;
}

function configured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USERNAME && process.env.SMTP_PASSWORD && process.env.MAIL_FROM_ADDRESS);
}

export async function attemptEmailDelivery(jobId: string) {
  if (!configured()) return { sent: false, reason: "smtp_not_configured" as const };
  const ref = firebaseDb().collection("emailOutbox").doc(jobId);
  const snapshot = await ref.get();
  if (!snapshot.exists) return { sent: false, reason: "job_not_found" as const };
  const job = snapshot.data() as EmailJob;
  if (job.status === "sent") return { sent: true };
  await ref.update({ status: "sending", attempts: (job.attempts ?? 0) + 1, updatedAt: new Date().toISOString() });
  try {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USERNAME, pass: process.env.SMTP_PASSWORD },
      requireTLS: process.env.SMTP_PORT !== "465",
    });
    const result = await transport.sendMail({
      from: { name: process.env.MAIL_FROM_NAME || "events by µlearn", address: process.env.MAIL_FROM_ADDRESS! },
      replyTo: process.env.MAIL_REPLY_TO || process.env.MAIL_FROM_ADDRESS,
      to: job.recipient,
      subject: job.subject,
      html: emailBody(job),
    });
    await ref.update({ status: "sent", sentAt: new Date().toISOString(), messageId: result.messageId, lastError: null });
    return { sent: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown SMTP error";
    await ref.update({ status: "failed", lastError: message, updatedAt: new Date().toISOString() });
    return { sent: false, reason: "delivery_failed" as const };
  }
}
