// Single source of truth for the two supported urgency levels - matches
// the check constraint on requests.urgency (Unit 16's migration). Same
// pattern as blood-group.ts: one canonical list, imported everywhere
// this value is read or written, never a second inline copy.
export const URGENCY_LEVELS = ["normal", "emergency"] as const;
export type Urgency = (typeof URGENCY_LEVELS)[number];
