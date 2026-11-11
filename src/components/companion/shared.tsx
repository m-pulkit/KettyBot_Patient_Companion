import { Check, ShieldCheck, TriangleAlert, MapPin, ArrowRight, Volume2, VolumeX, X, HeartPulse } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ROUTE_STOPS, STAGE_LABELS } from "@/lib/companion/config";
import { patientOf } from "@/lib/companion/session";
import { useCompanion } from "./provider";
import { cn } from "@/lib/utils";

export function StatusPill({ children, tone = "success" }: { children: React.ReactNode; tone?: "success" | "warning" | "muted" }) {
  return <span className={cn("inline-flex w-fit shrink-0 items-center gap-2 self-start rounded-full px-3 py-1.5 text-[11px] font-semibold", tone === "success" ? "bg-success-soft text-success" : tone === "warning" ? "bg-warning-soft text-warning" : "bg-muted text-muted-foreground")}><span className="status-dot" />{children}</span>;
}

export function RouteProgress({ compact = false }: { compact?: boolean }) {
  const { state } = useCompanion();
  return <div className={cn("relative grid grid-cols-4", compact ? "gap-1" : "gap-2")}><div className="route-line" />{ROUTE_STOPS.map((stop, i) => {
    const visited = state.journey.direction === "out" ? i < state.journey.stopIndex : i > state.journey.stopIndex;
    const current = i === state.journey.stopIndex;
    return <div key={stop} className="relative flex min-w-0 flex-col items-center gap-2 text-center"><span className={cn("flex size-9 items-center justify-center rounded-full border-4 border-background text-xs font-semibold", current ? "bg-primary text-primary-foreground" : visited ? "bg-secondary text-primary" : "bg-muted text-muted-foreground")}>{visited ? <Check className="size-3.5" /> : current ? <MapPin className="size-3.5" /> : i + 1}</span><span className={cn("text-[11px] leading-5 sm:text-xs", current ? "font-semibold text-primary" : "text-muted-foreground")}>{stop}</span>{current && !compact && <span className="text-[10px] text-muted-foreground">Current location</span>}</div>;
  })}</div>;
}

export function PatientSummary() {
  const { state } = useCompanion();
  const PATIENT_DEFAULT = patientOf(state);
  return <div className="flex flex-wrap items-center gap-4"><span className="flex size-12 items-center justify-center rounded-full bg-secondary text-base font-semibold text-primary">{PATIENT_DEFAULT.lastName.slice(0, 2).toUpperCase()}</span><div><p className="text-sm font-semibold">{PATIENT_DEFAULT.title} {PATIENT_DEFAULT.lastName}</p><p className="mt-1 text-xs text-muted-foreground">{PATIENT_DEFAULT.appointment} · {PATIENT_DEFAULT.time}</p></div><span className="ml-auto text-xs font-medium text-muted-foreground">{STAGE_LABELS[state.journey.stage]}</span></div>;
}

export function SafetyBanner() {
  const { state, error, clearError, send, busy } = useCompanion();
  if (error) return <div role="alert" className="mb-5 flex items-center gap-3 rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"><TriangleAlert className="size-5 shrink-0" /><span className="flex-1">{error}</span><Button variant="ghost" size="icon" aria-label="Dismiss connection error" onClick={clearError}><X /></Button></div>;
  if (state.alert === "none") return null;
  return <div role="alert" className={cn("mb-5 flex flex-wrap items-center gap-3 rounded-md border p-4", state.alert === "red" ? "border-destructive/25 bg-destructive/5 text-destructive" : "border-warning/20 bg-warning-soft text-warning")}><TriangleAlert className="size-5 shrink-0" /><div className="flex-1"><p className="text-sm font-semibold">{state.alertText}</p><p className="mt-1 text-xs">{state.alert === "red" ? "Urgent staff attention required · Robot stopped" : "Robot waiting for the patient"}</p></div>{state.alert === "red" && <Button variant="outline" size="sm" disabled={busy} onClick={() => void send({ type: "clear_alert" })}>Staff: clear alert</Button>}</div>;
}

export function VoiceControl({ phrase }: { phrase: string }) {
  const [enabled, setEnabled] = useState(false);
  const [available, setAvailable] = useState(false);
  useEffect(() => { setAvailable("speechSynthesis" in window); }, []);
  useEffect(() => {
    if (!enabled || !available) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(phrase); utterance.rate = 0.85; utterance.lang = "en-GB";
    window.speechSynthesis.speak(utterance);
    return () => window.speechSynthesis.cancel();
  }, [phrase, enabled, available]);
  return <Button variant="ghost" disabled={!available} size="sm" aria-label={enabled ? "Turn voice off" : "Turn voice on"} onClick={() => setEnabled(!enabled)}>{enabled ? <Volume2 /> : <VolumeX />}{enabled ? "Voice on" : "Voice off"}</Button>;
}

export function ActivityLog({ limit = 6 }: { limit?: number }) {
  const { state } = useCompanion();
  return <div className="divide-y divide-border/70">{state.logs.slice(-limit).reverse().map((event, i) => <div key={`${event.t}-${i}-${event.kind}`} className="flex items-start gap-3 py-3.5"><span className={cn("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full", event.level === "red" ? "bg-destructive/10 text-destructive" : "bg-secondary text-primary")}>{event.level === "red" ? <TriangleAlert className="size-3" /> : event.kind === "say" ? <Volume2 className="size-3" /> : <Check className="size-3" />}</span><p className="min-w-0 flex-1 text-xs leading-5">{event.text}</p><time className="shrink-0 pt-1 text-[10px] tabular-nums text-muted-foreground">{Math.floor(event.t / 60).toString().padStart(2, "0")}:{Math.floor(event.t % 60).toString().padStart(2, "0")}</time></div>)}</div>;
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return <div className="mb-5 flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">{children}</h2>{right}</div>;
}

export function PrivacyNote() { return <span className="inline-flex items-center gap-2 text-[11px] text-muted-foreground"><ShieldCheck className="size-3.5 text-primary" />Photo deleted at the ward</span>; }
export function Brand() { return <span className="flex items-center gap-2.5"><span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"><HeartPulse className="size-5" /></span><span className="text-xl font-bold">companion<span className="text-primary">.</span></span></span>; }
export function GoArrow() { return <ArrowRight className="size-4" />; }