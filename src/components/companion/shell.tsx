import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutGrid, Bot, Radio, Send, SlidersHorizontal, Camera, ShieldCheck, FlaskConical, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompanion } from "./provider";
import { AuthDialog } from "./auth-dialog";
import { Brand } from "./shared";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const navigation = [
  { to: "/", label: "Overview", icon: LayoutGrid },
  { to: "/robot", label: "Robot screen", icon: Bot },
  { to: "/console", label: "Operator console", icon: SlidersHorizontal },
  { to: "/camera", label: "Camera device", icon: Camera },
  { to: "/solo", label: "Single robot", icon: Radio },
  { to: "/dispatch", label: "Send trigger", icon: Send },
] as const;

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: s => s.location.pathname });
  const { user, connected } = useCompanion();
  const active = navigation.find(n => n.to === pathname) ?? navigation[0];
  return <div className="workspace">
    <aside className="workspace-sidebar flex flex-col border-r border-border bg-card px-5 py-7 md:px-5">
      <Link to="/" aria-label="Companion overview" className="px-2"><Brand /></Link>
      <p className="mb-3 mt-12 hidden px-3 text-[10px] font-semibold uppercase text-muted-foreground md:block">Workspace</p>
      <nav className="mt-5 grid grid-cols-3 gap-1 md:mt-0 md:flex md:flex-col md:gap-2" aria-label="Main navigation">{navigation.map(({ to, label, icon: Icon }) => <Button key={to} asChild variant="ghost" className={cn("h-auto min-h-11 flex-col justify-center gap-1.5 whitespace-normal px-1 py-2 text-[10px] md:h-11 md:flex-row md:justify-start md:gap-3 md:px-3 md:text-xs", pathname === to ? "bg-secondary font-semibold text-primary" : "text-muted-foreground")}><Link to={to}><Icon className="size-4" /><span>{label}</span>{pathname === to && <ChevronRight className="ml-auto hidden size-3 md:block" />}</Link></Button>)}</nav>
      <div className="mt-auto hidden border-t border-border pt-5 md:block"><div className="flex items-center gap-2 text-xs font-medium text-primary"><ShieldCheck className="size-4" />Patient safety first</div><p className="mt-2 text-[11px] leading-5 text-muted-foreground">When unsure, stop and ask.</p><div className="mt-6 flex items-center gap-2 text-[10px] text-muted-foreground"><span className="status-dot text-success" />Companion web · v1.0</div></div>
    </aside>
    <div className="min-w-0"><header className="flex min-h-19 items-center justify-between gap-3 border-b border-border bg-card px-5 md:px-10"><div className="flex items-center gap-2 text-xs"><span className="hidden text-muted-foreground sm:inline">Workspace</span><ChevronRight className="hidden size-3 text-muted-foreground sm:block" /><span className="font-medium">{active.label}</span></div><div className="flex items-center gap-3"><span className="flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[10px] text-muted-foreground"><FlaskConical className="size-3" />Test mode</span><span className={cn("hidden items-center gap-1.5 text-[10px] sm:flex", connected ? "text-success" : "text-muted-foreground")}><span className="status-dot" />{user ? connected ? "Shared journey" : "Connecting" : "Local preview"}</span><AuthDialog /></div></header>
    <main className="workspace-content fade-in">{children}</main></div>
  </div>;
}