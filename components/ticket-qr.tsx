"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function TicketQr({ reference }: { reference: string }) {
  const [source, setSource] = useState("");

  useEffect(() => {
    const checkInUrl = `${window.location.origin}/check-in?ticket=${encodeURIComponent(reference)}`;
    QRCode.toDataURL(checkInUrl, {
      width: 360,
      margin: 2,
      color: { dark: "#171719", light: "#ffffff" },
      errorCorrectionLevel: "H",
    }).then(setSource).catch(() => setSource(""));
  }, [reference]);

  if (!source) return <div className="ticket-qr-loading" aria-label="Generating ticket QR code" />;
  return <img className="ticket-qr-code" src={source} alt={`Check-in QR code for ticket ${reference}`} />;
}
