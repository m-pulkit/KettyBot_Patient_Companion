import { createFileRoute } from "@tanstack/react-router";
import { HandHeart, Check, Camera, Heart, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompanion } from "@/components/companion/provider";
import { RouteProgress, VoiceControl, PrivacyNote, StatusPill } from "@/components/companion/shared";
import { prompts } from "@/lib/companion/prompts";
import { STAGE_LABELS } from "@/lib/companion/config";
import { patientOf } from "@/lib/companion/session";
import robotImage from "@/assets/companion-robot.png";

export const Route = createFileRoute("/robot")({ head: () => ({ meta: [
  { title: "Patient screen — Companion" }, { name: "description", content: "Patient-facing companion with gentle voice prompts and immediate help during the hospital journey." },
  { property: "og:title", content: "Patient screen — Companion" }, { property: "og:description", content: "Gentle guidance to CT and back, with patient consent and help always in reach." },
  { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
] }), component: RobotPage });

function RobotPage() {
  const { state, send, busy } = useCompanion();
  const { stage, photoConsented } = state.journey;
  const PATIENT_DEFAULT = patientOf(state);
  const phrase = state.urgent ? prompts.fallOrHelp() : state.phrase;
  async function answer(yes: boolean) {
    if (!state.running) await send({ type: "start" });
    await send({ type: "journey", action: stage === "greet" ? { type: "confirm_identity", yes } : { type: "photo_consent", yes } });
  }
  return <div className="mx-auto max-w-3xl">
    <div className="mb-7 flex flex-wrap items-center justify-between gap-2"><StatusPill tone={state.urgent ? "warning" : "success"}>{STAGE_LABELS[stage]}</StatusPill><VoiceControl phrase={phrase} /></div>
    <section className="flex min-h-[440px] flex-col items-center justify-center text-center">
      <img src={robotImage} width={768} height={1024} className="mb-5 h-40 w-32 object-contain" alt="Your friendly Companion robot" />
      <p className="mb-3 text-xs font-medium text-primary">HERE WITH YOU, {PATIENT_DEFAULT.title.toUpperCase()} {PATIENT_DEFAULT.lastName.toUpperCase()}</p>
      <h1 className="patient-prompt max-w-2xl" aria-live="polite">{phrase}</h1>
      <div className="mt-8 flex w-full max-w-lg flex-wrap justify-center gap-4">
        {!state.urgent && stage === "greet" && <><Button className="h-16 min-w-48 flex-1 text-lg" disabled={busy} onClick={() => void answer(true)}><Check />{prompts.greetAnswers[0]}</Button><Button className="h-16 min-w-32 text-lg" variant="outline" disabled={busy} onClick={() => void answer(false)}>{prompts.greetAnswers[1]}</Button></>}
        {!state.urgent && stage === "photo" && !photoConsented && <><Button className="h-16 min-w-40 flex-1 text-lg" disabled={busy} onClick={() => void answer(true)}><Camera />Yes, that’s okay</Button><Button className="h-16 min-w-32 text-lg" variant="outline" disabled={busy} onClick={() => void answer(false)}>No, thank you</Button></>}
        {!state.urgent && stage === "photo" && photoConsented && <Button className="h-14 text-base" disabled={busy} onClick={() => void send({ type: "journey", action: { type: "photo_taken" } })}><Camera />Simulate photo capture</Button>}
        {!state.urgent && state.monitor.state === "resting_offer" && <><Button className="h-14 text-base" onClick={() => void send({ type: "rest", yes: true })}>Yes, let’s rest</Button><Button className="h-14 text-base" variant="outline" onClick={() => void send({ type: "rest", yes: false })}>I’m ready</Button></>}
        {!state.urgent && stage === "recheck" && <><Button className="h-14 text-base" disabled={busy} onClick={() => void send({ type: "journey", action: { type: "recheck", isPatient: true } })}><Check />Yes, that’s me</Button><Button className="h-14 text-base" variant="outline" disabled={busy} onClick={() => void send({ type: "help" })}>I need a nurse</Button></>}
        {!state.urgent && stage === "back" && state.monitor.state === "following" && <><Button className="h-14 text-base" variant="outline" onClick={() => void send({ type: "rest", yes: false })}><Heart />I’m fine</Button><Button className="h-14 text-base" variant="outline" onClick={() => void send({ type: "help" })}>I need help</Button></>}
        {stage === "done" && <Button className="h-14 text-base" variant="outline" onClick={() => void send({ type: "reset" })}>Finish<ArrowRight /></Button>}
      </div>
      {stage === "photo" && <div className="mt-6"><PrivacyNote /></div>}
      {state.urgent && <p className="mt-6 flex items-center gap-2 text-destructive"><ShieldCheck className="size-5" />Staff alert sent in the test console</p>}
    </section>
    <div className="mt-10 border-t border-border pt-6"><RouteProgress compact /></div>
    <div className="mt-8 flex justify-center"><Button variant="destructive" className="h-14 min-w-56 text-base" disabled={busy || state.urgent} onClick={() => void send({ type: "help" })}><HandHeart />I need help</Button></div>
  </div>;
}