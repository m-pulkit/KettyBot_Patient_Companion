import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Play, Pause, RotateCcw, ArrowRight, Check, FlaskConical, ShieldCheck, Activity, Gauge, ScanFace, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompanion } from "@/components/companion/provider";
import { PatientSummary, RouteProgress, SectionTitle, ActivityLog, SafetyBanner, StatusPill, VoiceControl } from "@/components/companion/shared";
import { SCENARIOS, THRESHOLDS, SIMULATION, STAGE_LABELS } from "@/lib/companion/config";
import { isMoving } from "@/lib/companion/session";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/console")({ head: () => ({ meta: [
  { title: "Operator console — Companion" }, { name: "description", content: "Monitor the companion journey, pause simulated driving, respond to alerts, and exercise patient safety scenarios." },
  { property: "og:title", content: "Operator console — Companion" }, { property: "og:description", content: "Staff journey controls, route progress, activity logs, and safety simulation." },
  { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
] }), component: ConsolePage });

function ConsolePage() {
  const { state, send, busy, user } = useCompanion();
  useEffect(() => {
    if (!state.running) return;
    const interval = window.setInterval(() => { void send({ type: "tick" }); }, user ? 1000 : 1000 / THRESHOLDS.checksPerSecond);
    return () => window.clearInterval(interval);
  }, [state.running, send, user]);
  const stage = state.journey.stage;
  const moving = isMoving(state);
  const paused = state.manualPause;
  return <>
    <div className="mb-7 flex flex-wrap items-center justify-between gap-4"><div><p className="mb-2 text-[11px] font-medium text-primary">STAFF WORKSPACE</p><h1 className="text-2xl font-bold">Operator console</h1><p className="mt-2 text-xs text-muted-foreground">Mr. Yilmaz’s journey to CT and back.</p></div><div className="flex gap-2"><Button variant="outline" size="icon" title="Reset journey" aria-label="Reset journey" disabled={busy} onClick={() => { if (window.confirm("Reset this test journey?")) void send({ type: "reset" }); }}><RotateCcw /></Button><Button disabled={busy || state.urgent || (paused && state.monitor.state !== "following")} onClick={() => void send({ type: !state.running ? "start" : paused ? "resume" : "pause" })}>{!state.running || paused ? <Play /> : <Pause />}{!state.running ? "Start journey" : paused ? "Resume journey" : "Pause journey"}</Button></div></div>
    <SafetyBanner />
    <div className="mb-8 grid gap-3 sm:grid-cols-3">{[
      { label: "Journey status", value: !state.running ? "Ready" : moving ? "Moving together" : state.urgent ? "Staff alert" : paused ? "Paused" : STAGE_LABELS[stage], icon: Activity },
      { label: "Driving mode", value: state.journey.slow ? "Slow · returning" : "Simulated", icon: Gauge },
      { label: "Patient photo", value: stage === "done" ? "Deleted" : state.journey.photoStored ? "Test enrollment" : "Not enrolled", icon: ScanFace },
    ].map(({ label, value, icon: Icon }) => <div key={label} className="flex items-center gap-3 rounded-lg border border-border bg-card p-4"><span className="flex size-9 items-center justify-center rounded-md bg-secondary text-primary"><Icon className="size-4" /></span><div><p className="text-[10px] text-muted-foreground">{label}</p><p className="mt-1 text-xs font-semibold">{value}</p></div></div>)}</div>
    <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr]">
      <div><section><SectionTitle right={<StatusPill tone={state.running ? "success" : "muted"}>{STAGE_LABELS[stage]}</StatusPill>}>Patient journey</SectionTitle><div className="border-y border-border py-5"><PatientSummary /><div className="my-7"><RouteProgress /></div><div className="flex flex-wrap justify-between gap-3 border-t border-border pt-4"><span className="text-[11px] text-muted-foreground">{moving ? `Next stop in ${Math.ceil(SIMULATION.stopSeconds - state.stopElapsed)} s` : "Waiting at current stop"}</span><Button size="sm" variant="outline" disabled={!moving || busy} onClick={() => void send({ type: "journey", action: { type: "reach_next_stop" } })}>Next stop<ArrowRight /></Button></div></div>
      <div className="mt-5 flex flex-wrap gap-2">{stage === "greet" && <Button disabled={busy} onClick={() => void send({ type: "journey", action: { type: "confirm_identity", yes: true } })}><Check />Confirm patient</Button>}{stage === "photo" && !state.journey.photoConsented && <Button disabled={busy} onClick={() => void send({ type: "journey", action: { type: "photo_consent", yes: true } })}><Check />Simulate consent</Button>}{stage === "photo" && state.journey.photoConsented && <Button disabled={busy} onClick={() => void send({ type: "journey", action: { type: "photo_taken" } })}><Camera />Simulate photo capture</Button>}{stage === "ct_door" && <Button disabled={busy} onClick={() => void send({ type: "journey", action: { type: "scan_done" } })}><Check />Scan done</Button>}{stage === "recheck" && <Button disabled={busy} onClick={() => void send({ type: "journey", action: { type: "recheck", isPatient: true } })}><ScanFace />Simulate patient re-check</Button>}</div></section>
      <section className="mt-8"><SectionTitle right={<VoiceControl phrase={state.phrase} />}>Patient prompt</SectionTitle><div className="border-l-3 border-primary bg-secondary/40 px-5 py-4"><p className="text-base font-medium leading-7" aria-live="polite">“{state.phrase}”</p></div></section>
      <section className="mt-8"><SectionTitle right={<span className="text-[10px] text-muted-foreground">{state.logs.length} events</span>}>Activity log</SectionTitle><div className="max-h-80 overflow-y-auto border-t border-border"><ActivityLog limit={SIMULATION.logLimit} /></div></section></div>
      <section><SectionTitle right={<span className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><FlaskConical className="size-3" />Simulation only</span>}>Test scenarios</SectionTitle><div className="border-t border-border pt-5">{["Following", "Identity", "Safety", "Photo"].map(category => <div className="mb-6" key={category}><h3 className="mb-3 text-[10px] font-semibold uppercase text-muted-foreground">{category}</h3><div className="grid grid-cols-2 gap-2">{SCENARIOS.filter(s => s.category === category).map(s => {
        const disabled = busy || (category === "Photo" ? stage !== "photo" : s.id === "lookalike" ? stage !== "recheck" : stage !== "guide" && stage !== "back");
        return <Button key={s.id} variant="outline" size="sm" disabled={disabled} className={cn("h-10 justify-start whitespace-normal text-left text-[10px]", state.scenario === s.id && "border-primary bg-secondary text-primary", category === "Safety" && "text-destructive")} onClick={() => void send({ type: "scenario", id: s.id })}>{category === "Safety" ? <ShieldCheck className="size-3" /> : <Play className="size-3" />}{s.label}</Button>;
      })}</div></div>)}</div><div className="flex items-center gap-2 border-t border-border pt-4 text-[10px] text-muted-foreground"><ShieldCheck className="size-3.5 text-primary" />No physical movement or nurse call is sent.</div></section>
    </div>
  </>;
}