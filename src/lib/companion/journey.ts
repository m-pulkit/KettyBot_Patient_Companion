import { ROUTE_STOPS } from "./config";
import type { Stage } from "./types";

export type JourneyState = {
  stage: Stage;
  direction: "out" | "back";
  stopIndex: number; // index into ROUTE_STOPS
  photoStored: boolean;
  photoConsented: boolean;
  slow: boolean;
};

export type JourneyAction =
  | { type: "confirm_identity"; yes: boolean }
  | { type: "photo_consent"; yes: boolean }
  | { type: "photo_failed" }
  | { type: "photo_taken" }
  | { type: "reach_next_stop" }
  | { type: "scan_done" } // staff press
  | { type: "recheck"; isPatient: boolean }
  | { type: "help" };

export const initialJourney: JourneyState = {
  stage: "greet",
  direction: "out",
  stopIndex: 0,
  photoStored: false,
  photoConsented: false,
  slow: false,
};

const lastStop = ROUTE_STOPS.length - 1;

export function journeyReducer(s: JourneyState, a: JourneyAction): JourneyState {
  switch (a.type) {
    case "confirm_identity":
      if (s.stage !== "greet") return s;
      return a.yes ? { ...s, stage: "photo" } : { ...s, stage: "staff_escort" };
    case "photo_consent":
      if (s.stage !== "photo") return s;
      return a.yes ? { ...s, photoConsented: true } : { ...s, stage: "staff_escort", photoStored: false, photoConsented: false };
    case "photo_failed":
      return s.stage === "photo" ? { ...s, stage: "staff_escort", photoStored: false, photoConsented: false } : s;
    case "photo_taken":
      return s.stage === "photo" && s.photoConsented ? { ...s, stage: "guide", photoStored: true } : s;
    case "reach_next_stop": {
      if (s.stage === "guide") {
        const i = s.stopIndex + 1;
        return i >= lastStop ? { ...s, stopIndex: lastStop, stage: "ct_door" } : { ...s, stopIndex: i };
      }
      if (s.stage === "back") {
        const i = s.stopIndex - 1;
        return i <= 0
          ? { ...s, stopIndex: 0, stage: "done", photoStored: false, photoConsented: false }
          : { ...s, stopIndex: i };
      }
      return s;
    }
    case "scan_done":
      return s.stage === "ct_door" ? { ...s, stage: "recheck" } : s;
    case "recheck":
      // Look-alikes are ignored: only the enrolled patient advances.
      return s.stage === "recheck" && a.isPatient
        ? { ...s, stage: "back", direction: "back", slow: true }
        : s;
    case "help":
      return s;
  }
}

export const currentStop = (s: JourneyState) => ROUTE_STOPS[s.stopIndex];
