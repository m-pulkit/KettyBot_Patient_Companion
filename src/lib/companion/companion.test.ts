import { describe, expect, it } from "vitest";
import { PATIENT_DEFAULT } from "./config";
import { initialMonitor, step, type FollowMonitor } from "./following";
import { initialJourney, journeyReducer } from "./journey";
import type { CompanionEvent, FollowObservation } from "./types";

const P = PATIENT_DEFAULT;
function run(obs: Partial<FollowObservation>[], m: FollowMonitor = initialMonitor()) {
  const events: CompanionEvent[] = [];
  for (const o of obs) {
    const r = step(m, { seen: true, isPatient: true, stranger: false, t: 0, ...o }, P);
    m = r.monitor;
    events.push(...r.events);
  }
  return { m, events };
}

describe("following rules", () => {
  it("waits when patient falls behind 2.5 m", () => {
    expect(run([{ t: 0, distance: 1 }, { t: 0.25, distance: 2.6 }]).m.state).toBe("waiting");
    expect(run([{ t: 0, distance: 1 }, { t: 0.25, distance: 2.4 }]).m.state).toBe("following");
  });

  it("resumes only under 1.6 m", () => {
    const base = [{ t: 0, distance: 3 }, { t: 0.25, distance: 3.2 }];
    expect(run([...base, { t: 0.5, distance: 1.7 }]).m.state).toBe("waiting");
    expect(run([...base, { t: 0.5, distance: 1.5 }]).m.state).toBe("following");
  });

  it("offers rest after standing still 8 s", () => {
    const at = (t: number) => ({ t, distance: 1.2 });
    expect(run([at(0), at(1), at(8.5)]).m.state).toBe("following");
    expect(run([at(0), at(1), at(9)]).m.state).toBe("resting_offer");
  });

  it("calls name at 3 s lost and alerts staff at 15 s", () => {
    const miss = (t: number) => ({ t, isPatient: false, seen: false });
    expect(run([{ t: 0 }, miss(2.9)]).m.state).toBe("checking");
    expect(run([{ t: 0 }, miss(3)]).m.state).toBe("lost_called");
    const r = run([{ t: 0 }, miss(3), miss(15)]);
    expect(r.m.state).toBe("lost_alert");
    expect(r.events.some((e) => e.kind === "staff_alert" && e.level === "red")).toBe(true);
  });

  it("resumes after 3 matching frames once lost", () => {
    const lost = [{ t: 0 }, { t: 3, isPatient: false, seen: false }];
    expect(run([...lost, { t: 3.25 }, { t: 3.5 }]).m.state).toBe("lost_called");
    expect(run([...lost, { t: 3.25 }, { t: 3.5 }, { t: 3.75 }]).m.state).toBe("following");
  });

  it("asks a stranger behind if they are the patient", () => {
    const r = run([{ t: 0 }, { t: 0.25, isPatient: false, stranger: true }]);
    expect(r.m.state).toBe("stranger_check");
    expect(r.events.some((e) => e.text === "Excuse me, are you Mr. Yilmaz?")).toBe(true);
  });

  it("stops with urgent alert on possible fall", () => {
    const r = run([{ t: 0, possibleFall: true }]);
    expect(r.m.state).toBe("fall_alert");
    expect(r.events.find((e) => e.kind === "staff_alert")?.level).toBe("red");
  });
});

describe("journey", () => {
  it("refused photo hands over to staff and stores nothing", () => {
    let s = journeyReducer(initialJourney, { type: "confirm_identity", yes: true });
    s = journeyReducer(s, { type: "photo_consent", yes: false });
    expect(s.stage).toBe("staff_escort");
    expect(s.photoStored).toBe(false);
  });

  it("full round trip deletes the photo at the room", () => {
    let s = journeyReducer(initialJourney, { type: "confirm_identity", yes: true });
    s = journeyReducer(s, { type: "photo_consent", yes: true });
    s = journeyReducer(s, { type: "photo_taken" });
    for (let i = 0; i < 3; i++) s = journeyReducer(s, { type: "reach_next_stop" });
    expect(s.stage).toBe("ct_door");
    s = journeyReducer(s, { type: "scan_done" });
    s = journeyReducer(s, { type: "recheck", isPatient: false });
    expect(s.stage).toBe("recheck"); // look-alike ignored
    s = journeyReducer(s, { type: "recheck", isPatient: true });
    expect(s.stage).toBe("back");
    for (let i = 0; i < 3; i++) s = journeyReducer(s, { type: "reach_next_stop" });
    expect(s.stage).toBe("done");
    expect(s.photoStored).toBe(false);
  });
});
