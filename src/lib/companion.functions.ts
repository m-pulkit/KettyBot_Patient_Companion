import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import { newSession, sessionReducer, type SessionAction, type SessionState } from "./companion/session";
import { SCENARIOS, THRESHOLDS } from "./companion/config";

export const patientSchema = z.object({ title: z.string().trim().min(1).max(12), lastName: z.string().trim().min(1).max(60), appointment: z.string().trim().min(1).max(60), time: z.string().trim().min(1).max(20) });

const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("journey"), action: z.discriminatedUnion("type", [
    z.object({ type: z.literal("confirm_identity"), yes: z.boolean() }),
    z.object({ type: z.literal("photo_consent"), yes: z.boolean() }),
    z.object({ type: z.literal("photo_failed") }), z.object({ type: z.literal("photo_taken") }),
    z.object({ type: z.literal("reach_next_stop") }), z.object({ type: z.literal("scan_done") }),
    z.object({ type: z.literal("recheck"), isPatient: z.boolean() }), z.object({ type: z.literal("help") }),
  ]) }),
  ...["tick", "pause", "resume", "clear_alert", "start", "reset", "help"].map(type => z.object({ type: z.literal(type) })),
  z.object({ type: z.literal("rest"), yes: z.boolean() }),
  z.object({ type: z.literal("dispatch"), patient: z.lazy(() => patientSchema) }),
  z.object({ type: z.literal("scenario"), id: z.string().refine(value => SCENARIOS.some(s => s.id === value)) }),
]);

export const loadCompanion = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  let result = await context.supabase.from("companion_sessions").select("id,snapshot,version").eq("owner_id", context.userId).maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) {
    const insert = await context.supabase.from("companion_sessions").upsert({ owner_id: context.userId, snapshot: newSession() as unknown as Json }, { onConflict: "owner_id", ignoreDuplicates: true });
    if (insert.error) throw insert.error;
    result = await context.supabase.from("companion_sessions").select("id,snapshot,version").eq("owner_id", context.userId).single();
  }
  if (result.error || !result.data) throw new Error("Could not open the shared journey.");
  return result.data;
});

export const updateCompanion = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ action: actionSchema, version: z.number().int().nonnegative() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("companion_sessions").select("id,snapshot,version").eq("owner_id", context.userId).single();
    if (error) throw error;
    if (row.version !== data.version) return { ...row, conflict: true };
    let next = row.snapshot as unknown as SessionState;
    const count = data.action.type === "tick" ? THRESHOLDS.checksPerSecond : 1;
    for (let i = 0; i < count; i++) next = sessionReducer(next, data.action as SessionAction);
    const result = await context.supabase.from("companion_sessions").update({ snapshot: next as unknown as Json, version: row.version + 1, updated_at: new Date().toISOString() })
      .eq("id", row.id).eq("version", row.version).select("id,snapshot,version").maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) return { ...row, conflict: true };
    return { ...result.data, conflict: false };
  });
const triggerColumns = "id,title,last_name,appointment,appointment_time,source,status,created_at";

export const sendRobotTrigger = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => patientSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("robot_triggers").insert({ owner_id: context.userId, title: data.title, last_name: data.lastName, appointment: data.appointment, appointment_time: data.time, source: "staff" });
    if (error) throw error;
    return { ok: true };
  });

export const listRobotTriggers = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.from("robot_triggers").select(triggerColumns).eq("owner_id", context.userId).order("created_at", { ascending: false }).limit(20);
  if (error) throw error;
  return data;
});

export const acceptRobotTrigger = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("robot_triggers").update({ status: "accepted" }).eq("id", data.id).eq("status", "pending").select(triggerColumns).maybeSingle();
    if (error) throw error;
    return row;
  });
