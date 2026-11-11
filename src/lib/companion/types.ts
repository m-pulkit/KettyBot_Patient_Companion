export type Patient = {
  title: string;
  lastName: string;
  appointment: string;
  time: string;
};

export type Stage =
  | "greet"
  | "photo"
  | "guide"
  | "ct_door"
  | "recheck"
  | "back"
  | "done"
  | "staff_escort"; // identity/photo failed: a person takes over

export type AlertLevel = "none" | "orange" | "red";

/** One rear-camera observation (4 per second). */
export type FollowObservation = {
  t: number; // seconds
  seen: boolean; // any matching face or body behind
  isPatient: boolean; // match to the enrolled patient (face, or body if face hidden)
  stranger: boolean; // a non-matching person directly behind
  distance?: number; // meters
  possibleFall?: boolean;
};

export type FollowState =
  | "following"
  | "waiting" // fell behind
  | "resting_offer"
  | "checking" // 0-3 s not seen
  | "lost_called" // 3 s
  | "lost_alert" // 15 s
  | "stranger_check"
  | "fall_alert";

export type CompanionEvent = {
  t: number;
  kind:
    | "say"
    | "pause_robot"
    | "resume_robot"
    | "staff_alert"
    | "photo_deleted"
    | "log";
  level?: AlertLevel;
  text: string;
};
