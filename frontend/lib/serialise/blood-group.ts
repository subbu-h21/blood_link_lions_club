// Single source of truth for the 8 supported blood groups - was
// duplicated as an inline literal in lib/db/bank-stock.ts,
// lib/db/bank-shortages.ts, and components/bank/ShortageBoard.tsx
// (Unit 12); consolidated here so Unit 13's S1 screen (and anything
// later needing the same list) has one obvious place to import from
// instead of writing a fourth copy. Matches the check constraint on
// bank_stock.blood_group/bank_shortages.blood_group/search_logs.
// blood_group (Unit 07's migration) - if that constraint ever changes,
// this is the one place in application code to update too.
export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];
