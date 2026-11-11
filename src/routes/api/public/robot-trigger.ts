import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const bodySchema = z.object({
  robot_id: z.string().uuid(),
  patient: z.object({
    title: z.string().trim().min(1).max(12),
    lastName: z.string().trim().min(1).max(60),
    appointment: z.string().trim().min(1).max(60),
    time: z.string().trim().min(1).max(20),
  }),
});

function sameKey(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const Route = createFileRoute("/api/public/robot-trigger")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["ROBOT_TRIGGER_KEY"];
        const key = request.headers.get("x-robot-key") ?? "";
        if (!secret || !sameKey(key, secret)) return Response.json({ error: "Unauthorized" }, { status: 401 });
        let body: unknown;
        try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
        const parsed = bodySchema.safeParse(body);
        if (!parsed.success) return Response.json({ error: "Invalid trigger" }, { status: 400 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { robot_id, patient } = parsed.data;
        const { data, error } = await supabaseAdmin.from("robot_triggers").insert({
          owner_id: robot_id, title: patient.title, last_name: patient.lastName,
          appointment: patient.appointment, appointment_time: patient.time, source: "hospital system",
        }).select("id,status").single();
        if (error) { console.error("robot trigger insert failed", error); return Response.json({ error: "Could not queue trigger" }, { status: 500 }); }
        return Response.json({ id: data.id, status: data.status }, { status: 202 });
      },
    },
  },
});
