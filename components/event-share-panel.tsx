"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, Download, ExternalLink, QrCode as QrIcon, ScanLine } from "lucide-react";

import { Button } from "@/components/ui/button";

export function EventSharePanel({ slug, title, accessCode }: { slug: string; title: string; accessCode: string | null }) {
  const [publicUrl, setPublicUrl] = useState("");
  const [qrSource, setQrSource] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const query = accessCode ? `?access=${encodeURIComponent(accessCode)}` : "";
    const url = `${window.location.origin}/events/${slug}${query}`;
    QRCode.toDataURL(url, { width: 720, margin: 3, errorCorrectionLevel: "H", color: { dark: "#171719", light: "#ffffff" } })
      .then((source) => { setPublicUrl(url); setQrSource(source); })
      .catch(() => { setPublicUrl(url); setQrSource(""); });
  }, [accessCode, slug]);

  async function copyLink() {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return <div className="share-panel">
    <section className="share-qr-card"><div className="share-qr-label"><QrIcon /><span>Registration QR</span></div>{qrSource ? <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qrSource} alt={`Registration QR code for ${title}`} />
    </> : <div className="share-qr-placeholder" aria-label="Generating registration QR" />}<p>Anyone who scans this code opens the registration form.</p>{qrSource && <Button asChild variant="outline" className="rounded-full"><a href={qrSource} download={`${slug}-registration-qr.png`}><Download /> Download PNG</a></Button>}</section>
    <section className="share-link-card"><p className="section-kicker">Published successfully</p><h1>Your event is ready to share.</h1><p>Use the link in social posts, messages, or your personal domain. The QR contains this exact link.</p><div className="share-url"><span>{publicUrl || "Preparing secure event link…"}</span><Button type="button" size="icon" variant="outline" aria-label="Copy event registration link" disabled={!publicUrl} onClick={copyLink}>{copied ? <Check /> : <Copy />}</Button></div>{accessCode && <div className="private-link-note"><strong>Private event</strong><span>The access token is already included in this link and QR. Share it only with invited attendees.</span></div>}<div className="share-actions"><Button asChild size="lg" className="rounded-full"><a href={publicUrl || `/events/${slug}`}><ExternalLink /> Open registration page</a></Button><Button asChild size="lg" variant="outline" className="rounded-full"><a href="/check-in"><ScanLine /> Open scanner</a></Button></div></section>
  </div>;
}
