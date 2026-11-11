import { PATIENT_DEFAULT, ROUTE_STOPS, SIMULATION, THRESHOLDS, type SCENARIOS } from "./config";
import { helpPressed, initialMonitor, step, type FollowMonitor } from "./following";
import { initialJourney, journeyReducer, type JourneyAction, type JourneyState } from "./journey";
import { prompts } from "./prompts";
import type { AlertLevel, CompanionEvent, FollowObservation, Patient } from "./types";

export type ScenarioId = (typeof SCENARIOS)[number]["id"];
export type SessionState = {
  patient?: Patient;
  journey: JourneyState;
  monitor: FollowMonitor;
  elapsed: number;
  stopElapsed: number;
  running: boolean;
  manualPause: boolean;
  urgent: boolean;
  alert: AlertLevel;
  alertText: string;
  phrase: string;
  scenario: ScenarioId | null;
  scenarioElapsed: number;
  logs: CompanionEvent[];
};
export type SessionAction =
  | { type: "journey"; action: JourneyAction }
  | { type: "tick" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "clear_alert" }
  | { type: "start" }
  | { type: "reset" }
  | { type: "help" }
  | { type: "rest"; yes: boolean }
  | { type: "scenario"; id: ScenarioId }
  | { type: "dispatch"; patient: Patient };

export function patientOf(s: SessionState): Patient { return s.patient ?? PATIENT_DEFAULT; }

export function newSession(patient: Patient = PATIENT_DEFAULT): SessionState {
  return { patient, journey: { ...initialJourney }, monitor: initialMonitor(), elapsed: 0, stopElapsed: 0, running: false,
    manualPause: false, urgent: false, alert: "none", alertText: "", phrase: prompts.greet(patient),
    scenario: null, scenarioElapsed: 0, logs: [{ t: 0, kind: "log", text: "Companion ready at the ward" }] };
}

/** Single robot mode: robot is free to take a new server trigger. */
export function robotIdle(s: SessionState): boolean {
  const stage = s.journey.stage;
  return (stage === "greet" && !s.running) || stage === "done" || stage === "staff_escort";
}

export function isMoving(s: SessionState): boolean {
  return s.running && !s.manualPause && !s.urgent && s.monitor.state === "following" && (s.journey.stage === "guide" || s.journey.stage === "back");
}

function events(s: SessionState, additions: CompanionEvent[]): SessionState {
  const next = { ...s };
  for (const event of additions) {
    if (event.kind === "say") next.phrase = event.text;
    if (event.kind === "staff_alert") { next.alert = event.level ?? "orange"; next.alertText = event.text; next.urgent = event.level === "red"; }
    if (event.kind === "pause_robot" && !next.urgent) { next.alert = "orange"; next.alertText = event.text; }
    if (event.kind === "resume_robot" && !next.manualPause && !next.urgent) { next.alert = "none"; next.alertText = ""; }
  }
  next.logs = [...next.logs, ...additions].slice(-SIMULATION.logLimit);
  return next;
}

function advance(s: SessionState, action: JourneyAction): SessionState {
  if (action.type === "reach_next_stop" && !isMoving(s)) return s;
  const journey = journeyReducer(s.journey, action);
  if (journey === s.journey) return s;
  let phrase = s.phrase;
  const stop = ROUTE_STOPS[journey.stopIndex];
  if (!stop) return s;
  if (journey.stage === "photo") phrase = journey.photoConsented ? "Thank you. Please look at the camera." : prompts.photo();
  if (journey.stage === "staff_escort") phrase = prompts.photoRefused();
  if (journey.stage === "guide") phrase = s.journey.stage === "photo" ? prompts.start() : prompts.turn(stop);
  if (journey.stage === "ct_door") phrase = prompts.ctDoor();
  if (journey.stage === "recheck") phrase = prompts.afterScan(patientOf(s));
  if (journey.stage === "back") phrase = s.journey.stage === "recheck" ? prompts.wayBack() : prompts.turn(stop);
  if (journey.stage === "done") phrase = prompts.dropOff(patientOf(s));
  const stopped = journey.stage === "done" || journey.stage === "staff_escort";
  const additions: CompanionEvent[] = [{ t: s.elapsed, kind: "say", text: phrase }];
  if (journey.stage === "done") additions.push({ t: s.elapsed, kind: "photo_deleted", text: "Journey photo deleted at the ward" });
  const monitor = s.journey.stage !== journey.stage && (journey.stage === "guide" || journey.stage === "back") ? initialMonitor(s.elapsed) : s.monitor;
  return events({ ...s, journey, monitor, phrase, stopElapsed: 0, running: stopped ? false : s.running }, additions);
}

export function sessionReducer(s: SessionState, a: SessionAction): SessionState {
  switch (a.type) {
    case "reset": return newSession(patientOf(s));
    case "dispatch": return events({ ...newSession(a.patient), running: true }, [{ t: 0, kind: "log", text: `Robot dispatched for ${a.patient.title} ${a.patient.lastName} — ${a.patient.appointment} at ${a.patient.time}` }]);
    case "start": return events({ ...s, running: true }, [{ t: s.elapsed, kind: "log", text: "Test journey started — simulated driving only" }]);
    case "journey": return advance(s, a.action);
    case "help": return events({ ...s, manualPause: true, urgent: true }, helpPressed(s.elapsed));
    case "pause": return events({ ...s, manualPause: true }, [{ t: s.elapsed, kind: "log", text: "Journey paused by operator" }]);
    case "resume":
      if (s.urgent || s.monitor.state !== "following") return s;
      return events({ ...s, manualPause: false, running: true }, [{ t: s.elapsed, kind: "log", text: "Journey resumed by operator" }]);
    case "clear_alert": return events({ ...s, urgent: false, manualPause: true, alert: "none", alertText: "", monitor: initialMonitor(s.elapsed), scenario: null }, [{ t: s.elapsed, kind: "log", text: "Staff cleared alert. Journey remains paused." }]);
    case "rest":
      if (s.urgent) return s;
      return events({ ...s, manualPause: a.yes, monitor: initialMonitor(s.elapsed), scenario: null, alert: s.urgent ? s.alert : "none" }, [{ t: s.elapsed, kind: "say", text: a.yes ? "Of course. We'll rest here together." : prompts.continueTogether() }]);
    case "scenario": {
      if (a.id === "photo_failed" || a.id === "duplicate") return advance(s, { type: "photo_failed" });
      if (a.id === "photo_refused") return advance(s, { type: "photo_consent", yes: false });
      if (a.id === "lookalike") return events(advance(s, { type: "recheck", isPatient: false }), [{ t: s.elapsed, kind: "log", text: "Look-alike ignored — enrolled patient still required" }]);
      if (s.journey.stage !== "guide" && s.journey.stage !== "back") return s;
      return events({ ...s, scenario: a.id, scenarioElapsed: 0 }, [{ t: s.elapsed, kind: "log", text: `Test observation: ${a.id.replaceAll("_", " ")}` }]);
    }
    case "tick": {
      if (!s.running) return s;
      const dt = 1 / THRESHOLDS.checksPerSecond;
      const elapsed = s.elapsed + dt;
      const scenarioElapsed = s.scenarioElapsed + dt;
      let next = { ...s, elapsed, scenarioElapsed };
      if (s.journey.stage !== "guide" && s.journey.stage !== "back") return next;
      const missing = ["lost", "no_data", "swap", "stranger"].includes(s.scenario ?? "");
      const observation: FollowObservation = { t: elapsed, seen: !missing, isPatient: !missing,
        stranger: s.scenario === "stranger", possibleFall: s.scenario === "fall",
        distance: s.scenario === "behind" ? SIMULATION.behindDistance : s.scenario === "rest" ? SIMULATION.comfortableDistance : SIMULATION.comfortableDistance + Math.sin(elapsed * 4) * THRESHOLDS.stillMovementMeters * 4 };
      const result = step(s.monitor, observation, patientOf(s));
      next = events({ ...next, monitor: result.monitor }, result.events);
      if (isMoving(next)) {
        next.stopElapsed = s.stopElapsed + dt;
        if (next.stopElapsed >= SIMULATION.stopSeconds) next = advance(next, { type: "reach_next_stop" });
      }
      return next;
    }
  }
}