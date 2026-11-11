import { createFileRoute, Link } from "@tanstack/react-router";
import { Bot, SlidersHorizontal, Camera, ArrowUpRight, ArrowRight, ShieldCheck, Heart, Play, ChevronRight, Clock, MapPin, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompanion } from "@/components/companion/provider";
import { StatusPill, RouteProgress, PatientSummary, SectionTitle, ActivityLog, SafetyBanner } from "@/components/companion/shared";
import { STAGE_LABELS } from "@/lib/companion/config";
import robotImage from "@/assets/companion-robot.png";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Companion — Patient journey workspace" },
    { name: "description", content: "Your patient companion workspace. Coordinate the robot screen, operator console, and camera for a safe journey to CT and back." },
    { property: "og:title", content: "Companion — Patient journey workspace" },
    { property: "og:description", content: "One patient, one connected journey. Monitor and simulate a safe hospital companion workflow." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: Index,
});

const roles = [
  { to: "/robot", icon: Bot, eyebrow: "PATIENT EXPERIENCE", title: "Robot screen", text: "A calm, clear companion for every step of the journey.", action: "Open robot screen", style: "bg-secondary text-primary", number: "01" },
  { to: "/console", icon: SlidersHorizontal, eyebrow: "STAFF WORKSPACE", title: "Operator console", text: "Follow the journey, manage alerts, and stay in control.", action: "Open console", style: "bg-lilac-soft text-lilac", number: "02" },
  { to: "/camera", icon: Camera, eyebrow: "PATIENT AWARENESS", title: "Camera device", text: "Connect a camera for enrollment and patient re-checks.", action: "Open camera", style: "bg-coral-soft text-coral", number: "03" },
] as const;

function Index() {
  const { state, send, busy } = useCompanion();
  return <>
    <div className="mb-7 flex flex-wrap items-center justify-between gap-3"><div><p className="mb-2 text-[11px] font-medium text-primary">SMART PATIENT COMPANION</p><h1 className="text-2xl font-bold md:text-[28px]">A little guidance. A lot of care.</h1><p className="mt-2 text-xs text-muted-foreground md:text-sm">Your patient journey, connected from start to finish.</p></div><span className="flex items-center gap-2 text-[11px] text-muted-foreground"><Clock className="size-3.5" />CT companion workspace</span></div>
    <SafetyBanner />
    <section className="companion-welcome mb-8 border-y border-border bg-secondary/45 px-5 py-7 md:px-8">
      <div className="relative z-10 flex flex-col justify-center py-2"><StatusPill tone={state.running ? "success" : "muted"}>{state.running ? "Journey in progress" : "Ready when you are"}</StatusPill><h2 className="mt-5 text-xl font-semibold leading-snug md:text-[25px]">Hello, I’m your<br className="sm:hidden" /> Companion.</h2><p className="mt-3 max-w-sm text-xs leading-6 text-muted-foreground">Here to help patients feel safe, supported,<br className="hidden md:block" /> and never alone on the way.</p><div className="mt-5 flex flex-wrap gap-3"><Button disabled={busy || state.running} onClick={() => void send({ type: "start" })}><Play className="size-3.5" />{state.running ? "Journey active" : "Start a test journey"}</Button><Button asChild variant="ghost" className="px-1 text-xs"><Link to="/console">View journey<ArrowRight /></Link></Button></div></div>
      <img src={robotImage} alt="Friendly white Companion hospital guide robot" width={768} height={1024} className="robot-portrait relative self-center justify-self-center" />
      <div className="absolute bottom-5 right-7 hidden items-center gap-2 text-[10px] text-primary md:flex"><Heart className="size-3" />By your side, every step.</div>
    </section>
    <SectionTitle right={<span className="text-[11px] text-muted-foreground">Three devices. One journey.</span>}>Choose your workspace</SectionTitle>
    <div className="role-grid mb-9">{roles.map(({ to, icon: Icon, eyebrow, title, text, action, style, number }) => <Link key={to} to={to} className="role-tile flex min-h-[237px] flex-col rounded-lg border border-border bg-card p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><div className="mb-5 flex items-start justify-between"><span className={`flex size-11 items-center justify-center rounded-lg ${style}`}><Icon className="size-5" /></span><span className="text-[10px] text-muted-foreground/70">{number}</span></div><p className="text-[9px] font-semibold text-muted-foreground">{eyebrow}</p><h3 className="mt-2 text-base font-semibold">{title}</h3><p className="mb-5 mt-2 text-[11px] leading-5 text-muted-foreground">{text}</p><span className="mt-auto flex items-center justify-between border-t border-border pt-4 text-[11px] font-semibold">{action}<ArrowUpRight className="size-4 text-muted-foreground" /></span></Link>)}</div>
    <div className="grid gap-9 lg:grid-cols-[1.2fr_1fr]">
      <section><SectionTitle right={<StatusPill tone={state.running ? "success" : "muted"}>{state.running ? "Active" : "Not started"}</StatusPill>}>Current journey</SectionTitle><div className="border-t border-border pt-5"><PatientSummary /><div className="mt-7"><RouteProgress /></div><div className="mt-6 flex items-center justify-between border-t border-border pt-4"><span className="flex items-center gap-2 text-[11px] text-muted-foreground"><MapPin className="size-3.5" />{STAGE_LABELS[state.journey.stage]}</span><Button asChild variant="link" size="sm" className="h-auto px-0 text-[11px]"><Link to="/console">Journey details<ChevronRight className="size-3" /></Link></Button></div></div></section>
      <section><SectionTitle right={<Button asChild variant="ghost" size="sm" className="h-auto px-0 text-[11px] text-muted-foreground"><Link to="/console">View all<ChevronRight className="size-3" /></Link></Button>}>Recent activity</SectionTitle><div className="border-t border-border"><ActivityLog limit={3} /></div></section>
    </div>
    <footer className="mt-9 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5 text-[10px] text-muted-foreground"><span className="flex items-center gap-2"><ShieldCheck className="size-3.5 text-primary" />Safety comes first. Always.</span><span className="flex items-center gap-2"><LockKeyhole className="size-3" />Test environment · No real robot connected</span></footer>
  </>;
}
