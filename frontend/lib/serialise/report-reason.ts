// Report reasons (2026-08-07, admin-filed reports from A2). `reports.reason`
// (Unit 46) is deliberately a plain, unconstrained text column - no DB
// check constraint, matching `status`'s own "no exhaustive value list
// given anywhere in PRD/SPEC" treatment. This closed list is a server-side
// validation layer only (same pattern as `close-reason.ts`'s
// `CLOSE_REASONS`, which similarly guards a column with no DB constraint),
// not a schema change - a future reason can be added here without a
// migration.
//
// `payment_demanded` exists specifically to satisfy PRD.md §11.3's literal
// legal requirement: "Selling or buying blood is illegal in India...
// the report mechanism must accept it as a reason." snake_case values,
// matching CLOSE_REASONS's own convention (these get stored literally in
// the `reports.reason` column, same style as `close_reason`).
export const REPORT_REASONS = [
  "payment_demanded",
  "abusive_behavior",
  "suspected_fraud",
  "other",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];
