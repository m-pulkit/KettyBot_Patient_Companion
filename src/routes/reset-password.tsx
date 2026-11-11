import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({ head: () => ({ meta: [
  { title: "Reset your password — Companion" }, { name: "description", content: "Securely reset your Companion workspace password." },
  { property: "og:title", content: "Reset your password — Companion" }, { property: "og:description", content: "Recover access to your connected Companion workspace." },
  { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
] }), component: ResetPassword });

function ResetPassword() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { const { data } = supabase.auth.onAuthStateChange((event) => { if (event === "PASSWORD_RECOVERY") setReady(true); }); return () => data.subscription.unsubscribe(); }, []);
  async function submit(e: React.FormEvent) { e.preventDefault(); setBusy(true); const { error } = await supabase.auth.updateUser({ password }); setBusy(false); if (error) setError(error.message); else setDone(true); }
  return <div className="mx-auto max-w-md py-10"><h1 className="text-2xl font-semibold">Reset your password</h1>{done ? <p className="mt-5 text-success">Your password has been updated.</p> : ready ? <form className="mt-6 space-y-4" onSubmit={submit}><Label htmlFor="new-password">New password</Label><Input id="new-password" type="password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button disabled={busy} type="submit">Update password</Button></form> : <p className="mt-5 text-sm text-muted-foreground">Open the password reset link from your email to continue.</p>}</div>;
}