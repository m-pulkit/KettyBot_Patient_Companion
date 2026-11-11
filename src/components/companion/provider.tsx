import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { loadCompanion, updateCompanion } from "@/lib/companion.functions";
import { newSession, sessionReducer, type SessionState, type SessionAction } from "@/lib/companion/session";

type CompanionContextType = { state: SessionState; send: (a: SessionAction) => Promise<void>; user: User | null; busy: boolean; connected: boolean; error: string; clearError: () => void };
// Keep one context across hot reloads so screens never lose the provider.
const globalStore = globalThis as { __companionContext?: React.Context<CompanionContextType | null> };
const CompanionContext = globalStore.__companionContext ?? (globalStore.__companionContext = createContext<CompanionContextType | null>(null));

export function CompanionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(newSession);
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const version = useRef(0);
  const sending = useRef(false);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const load = useServerFn(loadCompanion);
  const update = useServerFn(updateCompanion);
  const query = useQuery({ queryKey: ["companion", user?.id], queryFn: () => load(), enabled: Boolean(user), staleTime: Infinity, retry: false });

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => { if (active) setUser(data.session?.user ?? null); });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (["SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"].includes(event)) { setUser(session?.user ?? null); setConnected(false); }
      if (event === "SIGNED_OUT") { setState(newSession()); version.current = 0; }
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!query.data) return;
    version.current = query.data.version;
    setState(query.data.snapshot as unknown as SessionState);
  }, [query.data]);

  useEffect(() => { if (query.error) setError("The shared journey could not connect. Please try signing in again."); }, [query.error]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(`companion-${user.id}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "companion_sessions", filter: `owner_id=eq.${user.id}` }, payload => {
        const row = payload.new;
        if (typeof row['version'] === "number" && row['version'] >= version.current) { version.current = row['version']; setState(row['snapshot'] as SessionState); }
      }).subscribe(status => { setConnected(status === "SUBSCRIBED"); });
    return () => { void supabase.removeChannel(channel); };
  }, [user?.id]);

  const send = useCallback((action: SessionAction): Promise<void> => {
    if (!user) { setState(s => sessionReducer(s, action)); return Promise.resolve(); }
    if (action.type === "tick" && sending.current) return Promise.resolve();
    if (action.type !== "tick") setBusy(true);
    queue.current = queue.current.then(async () => {
      sending.current = true;
      try {
        let result = await update({ data: { action, version: version.current } });
        if (result.conflict && action.type !== "tick") result = await update({ data: { action, version: result.version } });
        if (result.version >= version.current) { version.current = result.version; setState(result.snapshot as unknown as SessionState); }
      } catch { setError("This change was not saved. The journey is paused until the connection returns."); setState(s => ({ ...s, manualPause: true })); }
      finally { sending.current = false; setBusy(false); }
    });
    return queue.current;
  }, [user, update]);

  return <CompanionContext.Provider value={{ state, send, user, busy, connected: connected && Boolean(query.data), error, clearError: () => setError("") }}>{children}</CompanionContext.Provider>;
}

export function useCompanion() {
  const context = useContext(CompanionContext);
  if (!context) throw new Error("CompanionProvider is missing");
  return context;
}