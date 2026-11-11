import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { HandHeart, Check, Camera, Heart, Inbox, Radio, ScanFace, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useCompanion } from "@/components/companion/provider";
import { RouteProgress, VoiceControl, PrivacyNote, StatusPill, SafetyBanner, SectionTitle, ActivityLog } from "@/components/companion/shared";
import { prompts } from "@/lib/companion/prompts";
import { PATIENT_DEFAULT, STAGE_LABELS, THRESHOLDS } from "@/lib/companion/config";
import { patientOf, robotIdle } from "@/lib/companion/session";
import { acceptRobotTrigger, listRobotTriggers } from "@/lib/companion.functions";
import robotImage from "@/assets/companion-robot.png";

export const Route = createFileRoute("/solo")({ head: () => ({ meta: [
  { title: "Single robot mode — Companion" }, { name: "description", content: "One robot that receives a trigger from the server, then greets, guides, monitors and returns the patient on its own." },
  { property: "og:title", content: "Single robot mode — Companion" }, { property: "og:description", content: "One self-contained robot that runs the whole patient journey after a server trigger." },
  { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
] }), component: SoloPage });

function SoloPage() {
  const { state, send, busy, user } = useCompanion();
  const stage = state.journey.stage;
  const patient = patientOf(state);
  const phrase = state.urgent ? prompts.fallOrHelp() : state.phrase;
  const queryClient = useQueryClient();
  const list = useServerFn(listRobotTriggers);
  const accept = useServerFn(acceptRobotTrigger);
  const triggers = useQuery({ queryKey: ["robot-triggers", user?.id], queryFn: () => list(), enabled: Boolean(user) });
  const accepting = useRef(false);

  // This robot drives its own simulated time.
  useEffect(() => {
    if (!state.running) return;
    const id = window.setInterval(() => { void send({ type: "tick" }); }, user ? 1000 : 1000 / THRESHOLDS.checksPerSecond);
    return () => window.clearInterval(id);
  }, [state.running, send, user]);

  // Simulated on-board camera captures the photo once consent is given.
  useEffect(() => {
    if (stage !== "photo" || !state.journey.photoConsented || state.urgent) return;
    const id = window.setTimeout(() => { void send({ type: "journey", action: { type: "photo_taken" } }); }, 2000);
    return () => window.clearTimeout(id);
  }, [stage, state.journey.photoConsented, state.urgent, send]);

  // Listen for new triggers from the server.
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(`robot-triggers-${user.id}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "robot_triggers", filter: `owner_id=eq.${user.id}` }, () => { void queryClient.invalidateQueries({ queryKey: ["robot-triggers", user.id] }); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

  // Take the oldest waiting trigger when the robot is free.
  const pending = (triggers.data ?? []).filter(t => t.status === "pending").sort((a, b) => a.created_at.localeCompare(b.created_at));
  const next = pending[0];
  useEffect(() => {
    if (!next || !robotIdle(state) || accepting.current) return;
    accepting.current = true;
    void accept({ data: { id: next.id } }).then(async row => {
      if (row) await send({ type: "dispatch", patient: { title: row.title, lastName: row.last_name, appointment: row.appointment, time: row.appointment_time } });
      await queryClient.invalidateQueries({ queryKey: ["robot-triggers", user?.id] });
    }).finally(() => { accepting.current = false; });
  }, [next?.id, state.journey.stage, state.running]);

  async function answer(yes: boolean) {
    await send({ type: "journey", action: stage === "greet" ? { type: "confirm_identity", yes } : { type: "photo_consent", yes } });
  }
  const waiting = robotIdle(state) && !state.running;

  return <div className="mx-auto max-w-3xl">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
      <StatusPill tone={state.urgent ? "warning" : waiting ? "muted" : "success"}>{waiting ? "Waiting for trigger" : STAGE_LABELS[stage]}</StatusPill>
      <div className="flex items-center gap-2"><VoiceControl phrase={phrase} />{state.running && <Button size="sm" variant="outline" disabled={busy || state.urgent} onClick={() => void send({ type: state.manualPause ? "resume" : "pause" })}>{state.manualPause ? <Play /> : <Pause />}{state.manualPause ? "Resume" : "Pause"}</Button>}</div>
    </div>
    <SafetyBanner />
    <section className="flex min-h-[400px] flex-col items-center justify-center text-center">
      <img src={robotImage} width={768} height={1024} className="mb-5 h-36 w-28 object-contain" alt="Your friendly Companion robot" />
      {waiting ? <>
        <p className="mb-3 flex items-center gap-2 text-xs font-medium text-primary"><Radio className="size-3.5" />SINGLE ROBOT MODE</p>
        <h1 className="patient-prompt max-w-2xl">Waiting for the next patient…</h1>
        <p className="mt-4 max-w-md text-sm text-muted-foreground">When the server sends a trigger, this robot greets the patient, takes the photo, guides them to CT and brings them back on its own.</p>
        {!user && <Button className="mt-6 h-12" onClick={() => void send({ type: "dispatch", patient: PATIENT_DEFAULT })}><Radio />Simulate a trigger</Button>}
        {!user && <p className="mt-3 text-[11px] text-muted-foreground">Sign in to receive real triggers from staff or the hospital system.</p>}
      </> : <>
        <p className="mb-3 text-xs font-medium text-primary">HERE WITH YOU, {patient.title.toUpperCase()} {patient.lastName.toUpperCase()}</p>
        <h1 className="patient-prompt max-w-2xl" aria-live="polite">{phrase}</h1>
        <div className="mt-8 flex w-full max-w-lg flex-wrap justify-center gap-4">
          {!state.urgent && stage === "greet" && <><Button className="h-16 min-w-48 flex-1 text-lg" disabled={busy} onClick={() => void answer(true)}><Check />{prompts.greetAnswers[0]}</Button><Button className="h-16 min-w-32 text-lg" variant="outline" disabled={busy} onClick={() => void answer(false)}>{prompts.greetAnswers[1]}</Button></>}
          {!state.urgent && stage === "photo" && !state.journey.photoConsented && <><Button className="h-16 min-w-40 flex-1 text-lg" disabled={busy} onClick={() => void answer(true)}><Camera />Yes, that’s okay</Button><Button className="h-16 min-w-32 text-lg" variant="outline" disabled={busy} onClick={() => void answer(false)}>No, thank you</Button></>}
          {!state.urgent && stage === "photo" && state.journey.photoConsented && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Camera className="size-4" />Taking photo with the robot camera…</p>}
          {!state.urgent && state.monitor.state === "resting_offer" && <><Button className="h-14 text-base" onClick={() => void send({ type: "rest", yes: true })}>Yes, let’s rest</Button><Button className="h-14 text-base" variant="outline" onClick={() => void send({ type: "rest", yes: false })}>I’m ready</Button></>}
          {!state.urgent && stage === "ct_door" && <Button className="h-14 text-base" variant="outline" disabled={busy} onClick={() => void send({ type: "journey", action: { type: "scan_done" } })}><ScanFace />Staff: scan done</Button>}
          {!state.urgent && stage === "recheck" && <><Button className="h-14 text-base" disabled={busy} onClick={() => void send({ type: "journey", action: { type: "recheck", isPatient: true } })}><Check />Yes, that’s me</Button><Button className="h-14 text-base" variant="outline" disabled={busy} onClick={() => void send({ type: "help" })}>I need a nurse</Button></>}
          {!state.urgent && stage === "back" && state.monitor.state === "following" && <Button className="h-14 text-base" variant="outline" onClick={() => void send({ type: "rest", yes: false })}><Heart />I’m fine</Button>}
        </div>
        {stage === "photo" && <div className="mt-6"><PrivacyNote /></div>}
      </>}
    </section>
    <div className="mt-8 border-t border-border pt-6"><RouteProgress compact /></div>
    <div className="mt-8 flex justify-center"><Button variant="destructive" className="h-14 min-w-56 text-base" disabled={busy || state.urgent || waiting} onClick={() => void send({ type: "help" })}><HandHeart />I need help</Button></div>
    <div className="mt-10 grid gap-8 md:grid-cols-2">
      <section><SectionTitle right={<span className="text-[10px] text-muted-foreground">{pending.length} waiting</span>}>Trigger inbox</SectionTitle>
        {!user ? <p className="text-xs text-muted-foreground">Sign in to receive triggers.</p> : (triggers.data ?? []).length === 0 ? <p className="text-xs text-muted-foreground">No triggers yet.</p> :
          <div className="divide-y divide-border/70 border-t border-border">{(triggers.data ?? []).slice(0, 6).map(t => <div key={t.id} className="flex items-center gap-3 py-3"><Inbox className="size-4 text-primary" /><div className="min-w-0 flex-1"><p className="text-xs font-medium">{t.title} {t.last_name} · {t.appointment} {t.appointment_time}</p><p className="text-[10px] text-muted-foreground">From {t.source}</p></div><StatusPill tone={t.status === "pending" ? "warning" : "muted"}>{t.status === "pending" ? "Waiting" : "Taken"}</StatusPill></div>)}</div>}
      </section>
      <section><SectionTitle>Robot log</SectionTitle><div className="border-t border-border"><ActivityLog limit={6} /></div></section>
    </div>
  </div>;
}
