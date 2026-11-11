import { THRESHOLDS } from "./config";
import { prompts } from "./prompts";
import type { CompanionEvent, FollowObservation, FollowState, Patient } from "./types";

export type FollowMonitor = {
  state: FollowState;
  lastSeenAt: number;
  stillSince: number | null;
  lastDistance: number | null;
  foundStreak: number;
};

export const initialMonitor = (t = 0): FollowMonitor => ({
  state: "following",
  lastSeenAt: t,
  stillSince: null,
  lastDistance: null,
  foundStreak: 0,
});

/** Process one rear-camera observation. Returns next monitor state + events. */
export function step(
  m: FollowMonitor,
  o: FollowObservation,
  p: Patient,
): { monitor: FollowMonitor; events: CompanionEvent[] } {
  const ev: CompanionEvent[] = [];
  const say = (text: string) => ev.push({ t: o.t, kind: "say", text });
  const next: FollowMonitor = { ...m };

  if (m.state === "fall_alert") return { monitor: m, events: ev };

  if (o.possibleFall) {
    next.state = "fall_alert";
    ev.push({ t: o.t, kind: "pause_robot", text: "Possible fall" });
    say(prompts.fallOrHelp());
    ev.push({ t: o.t, kind: "staff_alert", level: "red", text: "Possible fall — urgent" });
    return { monitor: next, events: ev };
  }

  // --- Patient not visible ---
  if (!o.isPatient) {
    next.foundStreak = 0;
    if (o.stranger && m.state !== "stranger_check" && m.state !== "lost_alert") {
      next.state = "stranger_check";
      ev.push({ t: o.t, kind: "pause_robot", text: "Stranger behind" });
      say(prompts.stranger(p));
      return { monitor: next, events: ev };
    }
    const gone = o.t - m.lastSeenAt;
    if (gone >= THRESHOLDS.lostAlertSeconds && m.state !== "lost_alert") {
      next.state = "lost_alert";
      ev.push({ t: o.t, kind: "pause_robot", text: "Patient not visible" });
      ev.push({ t: o.t, kind: "staff_alert", level: "red", text: "Patient lost for 15 s" });
      say(prompts.nurseAsked());
    } else if (
      gone >= THRESHOLDS.lostCallSeconds &&
      (m.state === "following" || m.state === "checking" || m.state === "waiting" || m.state === "resting_offer")
    ) {
      next.state = "lost_called";
      ev.push({ t: o.t, kind: "pause_robot", text: "Patient not seen 3 s" });
      say(prompts.lost(p));
    } else if (m.state === "following") {
      next.state = "checking";
    }
    return { monitor: next, events: ev };
  }

  // --- Patient visible ---
  const wasMissing = ["checking", "lost_called", "lost_alert", "stranger_check"].includes(m.state);
  if (wasMissing) {
    next.foundStreak = m.foundStreak + 1;
    if (m.state === "checking") {
      next.state = "following";
      next.lastSeenAt = o.t;
      next.foundStreak = 0;
    } else if (next.foundStreak >= THRESHOLDS.foundFrames) {
      if (o.distance !== undefined && o.distance >= THRESHOLDS.resumeMeters) return { monitor: next, events: ev };
      next.state = "following";
      next.lastSeenAt = o.t;
      next.foundStreak = 0;
      next.stillSince = null;
      ev.push({ t: o.t, kind: "resume_robot", text: "Patient found" });
      say(prompts.continueTogether());
    }
    if (next.state !== "following") return { monitor: next, events: ev };
  }
  next.lastSeenAt = o.t;

  // Stillness
  const d = o.distance ?? null;
  if (d !== null && m.lastDistance !== null && Math.abs(d - m.lastDistance) < THRESHOLDS.stillMovementMeters) {
    next.stillSince = m.stillSince ?? o.t;
  } else {
    next.stillSince = null;
  }
  next.lastDistance = d;

  // Distance
  if (d !== null && d > THRESHOLDS.fallBehindMeters && next.state === "following") {
    next.state = "waiting";
    ev.push({ t: o.t, kind: "pause_robot", text: "Patient fell behind" });
    say(prompts.fallsBehind());
  } else if (
    d !== null &&
    d < THRESHOLDS.resumeMeters &&
    next.state === "waiting"
  ) {
    next.state = "following";
    next.stillSince = null;
    ev.push({ t: o.t, kind: "resume_robot", text: "Patient caught up" });
    say(prompts.continueTogether());
  } else if (
    next.stillSince !== null &&
    o.t - next.stillSince >= THRESHOLDS.stillSeconds &&
    (next.state === "following" || next.state === "waiting")
  ) {
    next.state = "resting_offer";
    ev.push({ t: o.t, kind: "pause_robot", text: "Patient standing still" });
    say(prompts.rest());
  }

  return { monitor: next, events: ev };
}

/** Help button on the robot screen: stop and call a nurse. */
export function helpPressed(t: number): CompanionEvent[] {
  return [
    { t, kind: "pause_robot", text: "Help button" },
    { t, kind: "say", text: prompts.fallOrHelp() },
    { t, kind: "staff_alert", level: "red", text: "Help button pressed" },
  ];
}
