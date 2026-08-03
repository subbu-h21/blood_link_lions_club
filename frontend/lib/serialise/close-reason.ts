// Single source of truth for the 5 `requests.close_reason` values (Unit
// 16's migration check constraint; CLAUDE.md "Data model invariants":
// "`closed` always requires a reason"). Added proactively, same reasoning
// as stage.ts and urgency.ts (Unit 21) - this screen (S5, requester-side
// cancel) and Unit 39 (admin-side close, which "reuses Unit 30's close
// path exactly" per that unit's own text) both need the identical list.
export const CLOSE_REASONS = [
  "found_elsewhere",
  "no_longer_needed",
  "no_donor_found",
  "expired",
  "abusive",
] as const;
export type CloseReason = (typeof CLOSE_REASONS)[number];
