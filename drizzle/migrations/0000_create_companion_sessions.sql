CREATE TABLE public.companion_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() UNIQUE,
  snapshot jsonb NOT NULL,
  version integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companion_sessions TO authenticated;
GRANT ALL ON public.companion_sessions TO service_role;
ALTER TABLE public.companion_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read their companion journey" ON public.companion_sessions FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Owners create their companion journey" ON public.companion_sessions FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners update their companion journey" ON public.companion_sessions FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners delete their companion journey" ON public.companion_sessions FOR DELETE TO authenticated USING (owner_id = auth.uid());
ALTER PUBLICATION supabase_realtime ADD TABLE public.companion_sessions;