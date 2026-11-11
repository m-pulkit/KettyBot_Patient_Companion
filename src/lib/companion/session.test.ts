import { describe, expect, it } from "vitest";
import { initialJourney, journeyReducer } from "./journey";
import { newSession, robotIdle, sessionReducer, type SessionState } from "./session";
import { initialMonitor, step, type FollowMonitor } from "./following";
import { PATIENT_DEFAULT } from "./config";

describe("session safety", () => {
  it("does not store a photo before consent", () => {
    const photo = journeyReducer(initialJourney, { type: "confirm_identity", yes: true });
    const s = journeyReducer(photo, { type: "photo_taken" });
    expect(s.stage).toBe("photo");
    expect(s.photoStored).toBe(false);
  });

  it("keeps help pause after the patient is visible again", () => {
    let s = sessionReducer(newSession(), { type: "start" });
    s = { ...s, journey: { ...s.journey, stage: "guide", photoStored: true, photoConsented: true } };
    s = sessionReducer(s, { type: "help" });
    for (let i = 0; i < 4; i++) s = sessionReducer(s, { type: "tick" });
    expect(s.urgent).toBe(true);
    expect(s.manualPause).toBe(true);
    expect(sessionReducer(s, { type: "resume" }).manualPause).toBe(true);
  });

  it("alerts staff at 15 s even if lost after waiting", () => {
    let m: FollowMonitor = { ...initialMonitor(), state: "waiting" };
    for (const t of [3, 15]) m = step(m, { t, seen: false, isPatient: false, stranger: false }, PATIENT_DEFAULT).monitor;
    expect(m.state).toBe("lost_alert");
  });

  it("keeps the rest offer paused until the patient answers", () => {
    const m: FollowMonitor = { ...initialMonitor(9), state: "resting_offer", stillSince: 1, lastDistance: 1.2 };
    const result = step(m, { t: 9.25, seen: true, isPatient: true, stranger: false, distance: 1.2 }, PATIENT_DEFAULT);
    expect(result.monitor.state).toBe("resting_offer");
    expect(result.events.some(e => e.kind === "resume_robot")).toBe(false);
  });

  it("does not resume after 3 matches while patient remains beyond 1.6 m", () => {
    let m: FollowMonitor = { ...initialMonitor(), state: "lost_called" };
    for (const t of [3.25, 3.5, 3.75]) m = step(m, { t, seen: true, isPatient: true, stranger: false, distance: 3 }, PATIENT_DEFAULT).monitor;
    expect(m.state).toBe("lost_called");
    expect(step(m, { t: 4, seen: true, isPatient: true, stranger: false, distance: 1.5 }, PATIENT_DEFAULT).monitor.state).toBe("following");
  });

  it("manual pause prevents travel despite healthy camera observations", () => {
    let s: SessionState = { ...newSession(), running: true, journey: { ...initialJourney, stage: "guide" } };
    s = sessionReducer(s, { type: "pause" });
    for (let i = 0; i < 60; i++) s = sessionReducer(s, { type: "tick" });
    expect(s.manualPause).toBe(true);
    expect(s.journey.stopIndex).toBe(0);
  });
});
describe("single robot mode", () => {
  it("dispatch starts a fresh running journey for the triggered patient", () => {
    const p = { title: "Ms.", lastName: "Weber", appointment: "CT scan", time: "11:30" };
    const s = sessionReducer(newSession(), { type: "dispatch", patient: p });
    expect(s.running).toBe(true);
    expect(s.journey.stage).toBe("greet");
    expect(s.phrase).toContain("Ms. Weber");
    expect(s.phrase).toContain("11:30");
  });
  it("robot only takes a new trigger when idle", () => {
    expect(robotIdle(newSession())).toBe(true);
    const busy = sessionReducer(newSession(), { type: "start" });
    expect(robotIdle(busy)).toBe(false);
  });
});
