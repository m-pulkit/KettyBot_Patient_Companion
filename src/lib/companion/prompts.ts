import type { Patient } from "./types";

const n = (p: Patient) => `${p.title} ${p.lastName}`;

// Short, polite, one question at a time.
export const prompts = {
  greet: (p: Patient) =>
    `Hello, ${n(p)}. Are you here for your ${p.appointment} at ${p.time}?`,
  greetAnswers: ["Yes, that's me", "No"] as const,
  photo: () =>
    "May I take a quick photo of your face? It's deleted when you're back in your room.",
  photoAnswers: ["Yes", "No"] as const,
  photoRefused: () => "No problem. A member of staff will walk with you instead.",
  start: (dest = "the CT department") => `We're going to ${dest} now. I'll go slowly.`,
  turn: (stop: string) => `We're turning here, at ${stop}.`,
  ctDoor: () => "We've arrived. Please go in. The team is expecting you.",
  afterScan: (p: Patient) => `Welcome back, ${n(p)}. Is that you?`,
  wayBack: () => "Are you feeling dizzy or unwell?",
  wayBackAnswers: ["I'm fine", "I need help"] as const,
  dropOff: (p: Patient) =>
    `We're back in your room. Take care, ${n(p)}. Your photo has been deleted.`,

  // When something changes
  fallsBehind: () => "Take your time. I'll wait for you.",
  continueTogether: () => "Let's continue together.",
  lost: (p: Patient) => `${n(p)}, I can't see you. Please come back behind me.`,
  nurseAsked: () => "I've asked a nurse to come and help.",
  stranger: (p: Patient) => `Excuse me, are you ${n(p)}?`,
  strangerThanks: (p: Patient) => `Thank you. ${n(p)}, are you there?`,
  rest: () => "Would you like to rest for a moment?",
  fallOrHelp: () => "Are you all right? A nurse is on the way.",
};
