import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Camera, Video, VideoOff, RotateCw, ShieldCheck, ScanFace, Check, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompanion } from "@/components/companion/provider";
import { StatusPill, SectionTitle, SafetyBanner, PatientSummary } from "@/components/companion/shared";
import { THRESHOLDS } from "@/lib/companion/config";

export const Route = createFileRoute("/camera")({ head: () => ({ meta: [
  { title: "Camera device — Companion" }, { name: "description", content: "Connect a front or rear camera for consent-based patient photo capture and test re-checks." },
  { property: "og:title", content: "Camera device — Companion" }, { property: "og:description", content: "Privacy-conscious camera capture for the patient companion journey." },
  { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
] }), component: CameraPage });

function CameraPage() {
  const { state, send, busy } = useCompanion();
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const requestId = useRef(0);
  const [mode, setMode] = useState<"user" | "environment">("user");
  const [active, setActive] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [captureMessage, setCaptureMessage] = useState("");
  function stop() { requestId.current++; stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; setActive(false); }
  useEffect(() => () => { requestId.current++; stream.current?.getTracks().forEach(t => t.stop()); }, []);
  useEffect(() => { if (!state.journey.photoStored || state.journey.stage === "done" || state.journey.stage === "staff_escort") { setPhoto(null); setCaptureMessage(""); } }, [state.journey.photoStored, state.journey.stage]);
  async function connect(nextMode = mode) {
    stop(); setPending(true); setError("");
    const id = requestId.current;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera access is unavailable in this browser.");
      const next = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: nextMode } }, audio: false });
      if (id !== requestId.current) { next.getTracks().forEach(t => t.stop()); return; }
      stream.current = next;
      if (video.current) { video.current.srcObject = next; await video.current.play(); }
      setActive(true);
    } catch { setError("Camera could not connect. Allow camera access in your browser, or try another camera device."); }
    finally { setPending(false); }
  }
  async function capture() {
    const v = video.current;
    if (!v || !active || !state.journey.photoConsented || !v.videoWidth) return;
    const canvas = document.createElement("canvas"); canvas.width = v.videoWidth; canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.drawImage(v, 0, 0); const image = canvas.toDataURL("image/jpeg", 0.75);
    await send({ type: "journey", action: { type: "photo_taken" } });
    setPhoto(image); setCaptureMessage("Photo captured on this device only.");
  }
  return <>
    <div className="mb-7 flex flex-wrap items-center justify-between gap-4"><div><p className="mb-2 text-[11px] font-medium text-primary">PATIENT AWARENESS</p><h1 className="text-2xl font-bold">Camera device</h1><p className="mt-2 text-xs text-muted-foreground">Enrollment, re-check, and following view.</p></div><StatusPill tone={active ? "success" : "muted"}>{active ? "Camera connected" : "Camera offline"}</StatusPill></div>
    <SafetyBanner />
    <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]"><section className="min-w-0"><SectionTitle right={<div className="flex gap-1 rounded-md bg-muted p-1"><Button size="sm" variant={mode === "user" ? "outline" : "ghost"} disabled={pending} className="h-7 text-[10px]" onClick={() => { setMode("user"); if (active) void connect("user"); }}>Front</Button><Button size="sm" variant={mode === "environment" ? "outline" : "ghost"} disabled={pending} className="h-7 text-[10px]" onClick={() => { setMode("environment"); if (active) void connect("environment"); }}>Rear</Button></div>}>{mode === "user" ? "Front camera" : "Following camera"}</SectionTitle>
    <div className="camera-frame rounded-lg"><video ref={video} playsInline muted aria-label="Live camera view" /><div className="absolute left-4 top-4 flex items-center gap-2 rounded-md bg-surface-dark/80 px-3 py-2 text-[10px]"><span className={`status-dot ${active ? "text-success" : "text-muted-foreground"}`} />{active ? "LIVE" : "OFFLINE"}</div>{!active && <div className="absolute inset-0 flex flex-col items-center justify-center gap-4"><Camera className="size-12 opacity-35" /><p className="text-sm font-medium">Camera not connected</p><Button disabled={pending} onClick={() => void connect()}><Video />{pending ? "Connecting…" : "Connect camera"}</Button></div>}{active && mode === "user" && <div className="face-guide" />}{active && <span className="absolute bottom-4 left-4 rounded-md bg-surface-dark/80 px-3 py-2 text-[10px]">{mode === "user" ? "Enrollment / re-check" : "Live view only · Recognition not connected"}</span>}</div>
    {error && <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-destructive" role="alert"><TriangleAlert className="mt-0.5 size-4 shrink-0" />{error}</p>}
    <div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" disabled={!active || pending} onClick={stop}><VideoOff />Disconnect</Button><Button variant="outline" size="icon" title="Reconnect camera" aria-label="Reconnect camera" disabled={pending} onClick={() => void connect()}><RotateCw /></Button><Button className="ml-auto" disabled={busy || !active || mode !== "user" || state.journey.stage !== "photo" || !state.journey.photoConsented} onClick={() => void capture()}><Camera />Capture photo</Button></div>
    <div className="mt-5 flex items-start gap-2 border-t border-border pt-4 text-[11px] leading-5 text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />Video stays on this device. A captured photo is held in memory only and removed when the journey ends.</div></section>
    <div><section><SectionTitle>Patient enrollment</SectionTitle><div className="border-t border-border pt-5"><PatientSummary /><dl className="mt-6 space-y-4 text-xs"><div className="flex justify-between"><dt className="text-muted-foreground">Photo consent</dt><dd className="font-medium">{state.journey.photoConsented ? "Granted" : "Not granted"}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Enrollment</dt><dd className="font-medium">{state.journey.photoStored ? "Test enrollment" : "Not enrolled"}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Following checks</dt><dd className="font-medium">{THRESHOLDS.checksPerSecond} / second · simulated</dd></div></dl>{photo && <div className="mt-6"><img src={photo} alt="Consented patient photo on this device" className="h-36 w-full rounded-md object-contain" /><p className="mt-2 flex items-center gap-2 text-xs text-success"><Check className="size-3" />{captureMessage}</p></div>}</div></section>
    <section className="mt-8 border-t border-border pt-5"><SectionTitle>Patient re-check</SectionTitle><p className="text-xs leading-6 text-muted-foreground">{state.journey.stage === "recheck" ? "Patient returned from CT. Awaiting test confirmation." : "Available when staff marks the scan complete."}</p><Button className="mt-4 w-full" variant="outline" disabled={busy || state.journey.stage !== "recheck"} onClick={() => void send({ type: "journey", action: { type: "recheck", isPatient: true } })}><ScanFace />Simulate matching patient</Button><p className="mt-5 text-[10px] leading-5 text-muted-foreground">Face recognition and robot hardware are not connected in this test version.</p></section></div></div>
  </>;
}