// Single source of truth for the 5 `requests.stage` values (Unit 16's
// migration check constraint) - added here proactively rather than after a
// third duplicate, same reasoning as urgency.ts (Unit 21): Unit 29 (this
// screen) and Unit 38 (A2 admin request detail) both need this exact list,
// and Unit 38's own text explicitly says to "keep stage vocabulary
// identical" between the two screens - a shared source is the only way to
// guarantee that rather than hoping two independently-typed literals stay
// in sync.
export const REQUEST_STAGES = [
  "finding_prospects",
  "evaluating_prospects",
  "scheduled",
  "resolved",
  "closed",
] as const;
export type RequestStage = (typeof REQUEST_STAGES)[number];
