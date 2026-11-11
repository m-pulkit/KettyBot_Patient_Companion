// Journey thresholds and route. Mirrors config.env on the server laptop.

export const ROUTE_STOPS = ["Ward", "Corridor A", "Corner B", "CT"] as const;

export const THRESHOLDS = {
  /** Patient further than this behind -> robot waits */
  fallBehindMeters: 2.5,
  /** Robot resumes once patient is closer than this */
  resumeMeters: 1.6,
  /** Patient standing still this long -> rest offer */
  stillSeconds: 8,
  /** Patient not seen this long -> pause + call name */
  lostCallSeconds: 3,
  /** Patient not seen this long -> staff alert */
  lostAlertSeconds: 15,
  /** Consecutive matching frames needed to count as "found" */
  foundFrames: 3,
  /** Rear camera checks per second */
  checksPerSecond: 4,
  /** Movement below this (m) between checks counts as standing still */
  stillMovementMeters: 0.05,
} as const;

export const PATIENT_DEFAULT = {
  title: "Mr.",
  lastName: "Yilmaz",
  appointment: "CT scan",
  time: "10:00",
};

export const SIMULATION = {
  stopSeconds: 12,
  comfortableDistance: 1.2,
  caughtUpDistance: 1.5,
  behindDistance: 3,
  logLimit: 80,
} as const;

export const STAGE_LABELS = {
  greet: "Greeting", photo: "Photo consent", guide: "To CT", ct_door: "At CT",
  recheck: "Patient re-check", back: "Return to ward", done: "Journey complete", staff_escort: "Staff escort",
} as const;

export const SCENARIOS = [
  { id: "behind", label: "Falls behind", category: "Following" },
  { id: "rest", label: "Standing still", category: "Following" },
  { id: "lost", label: "Patient not seen", category: "Following" },
  { id: "no_data", label: "No camera data", category: "Following" },
  { id: "found", label: "Patient found", category: "Following" },
  { id: "stranger", label: "Stranger behind", category: "Identity" },
  { id: "swap", label: "Patient swap", category: "Identity" },
  { id: "lookalike", label: "Look-alike", category: "Identity" },
  { id: "fall", label: "Possible fall", category: "Safety" },
  { id: "photo_failed", label: "Photo fails", category: "Photo" },
  { id: "photo_refused", label: "Photo refused", category: "Photo" },
  { id: "duplicate", label: "Duplicate photo", category: "Photo" },
] as const;
