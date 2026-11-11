CREATE TABLE public.robot_triggers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  last_name text NOT NULL,
  appointment text NOT NULL,
  appointment_time text NOT NULL,
  source text NOT NULL DEFAULT 'staff',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX robot_triggers_owner_status ON public.robot_triggers (owner_id, status, created_at);
GRANT SELECT, INSERT, UPDATE ON public.robot_triggers TO authenticated;
GRANT ALL ON public.robot_triggers TO service_role;
ALTER TABLE public.robot_triggers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read their robot triggers" ON public.robot_triggers FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Owners create their robot triggers" ON public.robot_triggers FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners update their robot triggers" ON public.robot_triggers FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
ALTER PUBLICATION supabase_realtime ADD TABLE public.robot_triggers;