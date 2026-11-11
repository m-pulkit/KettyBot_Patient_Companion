import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Send, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCompanion } from "@/components/companion/provider";
import { AuthDialog } from "@/components/companion/auth-dialog";
import { SectionTitle } from "@/components/companion/shared";
import { PATIENT_DEFAULT } from "@/lib/companion/config";
import { sendRobotTrigger } from "@/lib/companion.functions";

export const Route = createFileRoute("/dispatch")({ head: () => ({ meta: [
  { title: "Send robot trigger — Companion" }, { name: "description", content: "Staff send the single companion robot to collect a patient, or connect a hospital system to trigger it automatically." },
  { property: "og:title", content: "Send robot trigger — Companion" }, { property: "og:description", content: "Trigger the single companion robot from staff or a hospital system." },
  { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
] }), component: DispatchPage });

function DispatchPage() {
  const { user } = useCompanion();
  const sendTrigger = useServerFn(sendRobotTrigger);
  const [form, setForm] = useState({ ...PATIENT_DEFAULT });
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSending(true); setStatus("");
    try { await sendTrigger({ data: form }); setStatus(`Robot sent for ${form.title} ${form.lastName}.`); }
    catch { setStatus("The trigger could not be sent. Please try again."); }
    finally { setSending(false); }
  }
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const fields = [["title", "Title"], ["lastName", "Last name"], ["appointment", "Appointment"], ["time", "Time"]] as const;
  return <div className="mx-auto max-w-2xl">
    <p className="mb-2 text-[11px] font-medium text-primary">SERVER TRIGGER</p>
    <h1 className="text-2xl font-bold">Send the robot</h1>
    <p className="mt-2 text-xs text-muted-foreground">The single robot picks up the next patient as soon as it is free.</p>
    {!user ? <div className="mt-8 rounded-lg border border-border bg-card p-5"><p className="mb-4 text-sm">Sign in with the same account as the robot to send triggers.</p><AuthDialog /></div> : <>
      <form onSubmit={submit} className="mt-8 grid gap-4 sm:grid-cols-2">
        {fields.map(([key, label]) => <div key={key} className="grid gap-2"><Label htmlFor={key}>{label}</Label><Input id={key} required maxLength={60} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} /></div>)}
        <div className="sm:col-span-2 flex flex-wrap items-center gap-3"><Button type="submit" disabled={sending}><Send />Send robot for this patient</Button>{status && <p role="status" className="text-xs text-muted-foreground">{status}</p>}</div>
      </form>
      <section className="mt-12"><SectionTitle right={<KeyRound className="size-4 text-primary" />}>Hospital system connection</SectionTitle>
        <p className="mb-3 text-xs leading-5 text-muted-foreground">Another system can send the robot by calling this address with the secret robot key in the <code>x-robot-key</code> header.</p>
        <p className="mb-1 text-[11px] font-medium">Robot ID</p><code className="mb-4 block break-all rounded bg-muted p-2 text-[11px]">{user.id}</code>
        <pre className="overflow-x-auto rounded bg-muted p-3 text-[11px] leading-5">{`POST ${origin}/api/public/robot-trigger
x-robot-key: <ROBOT_TRIGGER_KEY>
Content-Type: application/json

{"robot_id":"${user.id}",
 "patient":{"title":"Mr.","lastName":"Yilmaz",
            "appointment":"CT scan","time":"10:00"}}`}</pre>
      </section>
    </>}
  </div>;
}
