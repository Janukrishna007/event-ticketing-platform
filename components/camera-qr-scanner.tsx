"use client";

import { useEffect, useRef, useState } from "react";
import type { IScannerControls } from "@zxing/browser";
import { Camera, CameraOff, Loader2, ScanLine } from "lucide-react";

import { Button } from "@/components/ui/button";

function ticketReference(value: string) {
  const clean = value.trim();
  try {
    const parsed = new URL(clean);
    const queryReference = parsed.searchParams.get("ticket");
    if (queryReference) return queryReference.trim().toUpperCase();
  } catch {
    // Ticket references can also be encoded directly without a URL.
  }
  return /^EVT-[A-Z0-9]{6,}$/i.test(clean) ? clean.toUpperCase() : "";
}

export function CameraQrScanner({ onScan }: { onScan: (reference: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [active, setActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  function stop() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    if (videoRef.current?.srcObject instanceof MediaStream) videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
    setActive(false);
  }

  useEffect(() => () => {
    controlsRef.current?.stop();
    if (videoRef.current?.srcObject instanceof MediaStream) videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
  }, []);

  async function start() {
    setStarting(true);
    setError("");
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 140, delayBetweenScanSuccess: 800 });
      if (!videoRef.current) return;
      controlsRef.current = await reader.decodeFromConstraints({ video: { facingMode: { ideal: "environment" } }, audio: false }, videoRef.current, (result) => {
        if (!result) return;
        const reference = ticketReference(result.getText());
        if (!reference) {
          setError("That QR is not an attendee ticket. Scan the QR issued after registration.");
          return;
        }
        stop();
        onScan(reference);
      });
      setActive(true);
    } catch (cause) {
      setError(cause instanceof Error && cause.name === "NotAllowedError" ? "Camera access was blocked. Allow camera permission or enter the ticket reference below." : "The camera could not start. Use the manual reference field below.");
      stop();
    } finally {
      setStarting(false);
    }
  }

  return <div className={`camera-scanner${active ? " is-active" : ""}`}>
    <div className="camera-preview"><video ref={videoRef} muted playsInline aria-label="Ticket QR camera preview" />{!active && <div className="camera-idle"><ScanLine /><span>Camera scanner</span><small>Point the attendee ticket QR inside the frame.</small></div>}{active && <div className="scan-frame" aria-hidden="true" />}</div>
    <div className="camera-actions">{active ? <Button type="button" variant="outline" className="rounded-full" onClick={stop}><CameraOff /> Stop camera</Button> : <Button type="button" className="rounded-full" disabled={starting} onClick={start}>{starting ? <><Loader2 className="animate-spin" /> Starting camera</> : <><Camera /> Start camera scanner</>}</Button>}</div>
    {error && <p className="camera-error" role="alert">{error}</p>}
  </div>;
}
