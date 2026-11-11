import { useState } from "react";
import { LogIn, Mail, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useCompanion } from "./provider";

export function AuthDialog() {
  const { user } = useCompanion();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setPending(true); setError(""); setMessage("");
    try {
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        setMessage("Check your email for a password reset link.");
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
        if (error) throw error;
        if (data.session) setOpen(false); else setMessage("Check your email to confirm your account, then sign in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setOpen(false);
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Sign-in failed. Please try again."); }
    finally { setPending(false); }
  }

  async function social(provider: "google" | "lovable") {
    setError(""); setPending(true);
    try { const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin }); if (result.error) throw result.error; if (!result.redirected) setOpen(false); }
    catch (e) { setError(e instanceof Error ? e.message : "Sign-in failed."); }
    finally { setPending(false); }
  }

  if (user) return <Button variant="ghost" size="sm" onClick={() => void supabase.auth.signOut()}><LogIn /> Sign out</Button>;
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button variant="outline" size="sm"><LogIn /> Sign in</Button></DialogTrigger>
    <DialogContent className="sm:max-w-md">
      <DialogHeader><DialogTitle>{mode === "signup" ? "Create your workspace" : mode === "reset" ? "Reset your password" : "Welcome to Companion"}</DialogTitle><DialogDescription>Sign in with the same account on each device to share a journey.</DialogDescription></DialogHeader>
      {mode !== "reset" && <div className="grid gap-2"><Button variant="outline" disabled={pending} onClick={() => void social("google")}><span className="text-lg font-semibold">G</span> Continue with Google</Button><Button variant="outline" disabled={pending} onClick={() => void social("lovable")}>Continue with Lovable</Button><div className="my-2 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or with email<span className="h-px flex-1 bg-border" /></div></div>}
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2"><Label htmlFor="auth-email">Email</Label><Input id="auth-email" autoComplete="email" type="email" value={email} required onChange={e => setEmail(e.target.value)} placeholder="you@hospital.org" /></div>
        {mode !== "reset" && <div className="space-y-2"><Label htmlFor="auth-password">Password</Label><Input id="auth-password" type="password" minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} required onChange={e => setPassword(e.target.value)} /></div>}
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}{message && <p className="text-sm text-success" role="status">{message}</p>}
        <Button className="w-full" disabled={pending} type="submit">{pending ? <Loader2 className="animate-spin" /> : mode === "reset" ? <Mail /> : <ArrowRight />}{mode === "signup" ? "Create account" : mode === "reset" ? "Send reset link" : "Sign in with email"}</Button>
      </form>
      <div className="flex flex-wrap justify-between gap-2"><Button size="sm" variant="link" onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setMessage(""); setError(""); }}>{mode === "signup" ? "Already have an account?" : "Create an account"}</Button><Button size="sm" variant="link" onClick={() => { setMode(mode === "reset" ? "login" : "reset"); setMessage(""); setError(""); }}>{mode === "reset" ? "Back to sign in" : "Forgot password?"}</Button></div>
    </DialogContent>
  </Dialog>;
}