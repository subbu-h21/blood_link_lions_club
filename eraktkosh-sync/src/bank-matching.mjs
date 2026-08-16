// Maps our 5 seeded blood_banks rows (supabase/seed.sql, Unit 09's real
// e-RaktKosh data) to a distinctive substring of e-RaktKosh's own listing
// name for that same bank, confirmed by a real live search (2026-08-17,
// Karnataka -> Uttara Kannada returned exactly these 5 rows, no extras -
// see eraktkosh_auto_sync.md project memory for the raw capture).
//
// Name-substring matching, not e-RaktKosh's own internal bank id (h_code),
// because getting h_code requires the very API access this tool exists to
// work around before it's approved. Five banks is small enough that a
// hand-verified substring per bank is safe; re-verify this list if a bank
// is ever renamed on e-RaktKosh's side (matching would then silently stop
// finding it - sync.mjs logs an explicit warning for any bank in this list
// with zero matches in a run, specifically so that doesn't go unnoticed).
export const BANK_MATCHERS = [
  { bankId: "37f9a63a-d079-4b55-85d7-a73b8f5872c3", nameContains: "Uttara Kannada Blood Centre" },
  { bankId: "00000000-0000-0000-0000-000000000002", nameContains: "T.S.S. Hospital" },
  { bankId: "00000000-0000-0000-0000-000000000005", nameContains: "Pandit General Hospital" },
  { bankId: "00000000-0000-0000-0000-000000000006", nameContains: "General Hospital Dandeli" },
  { bankId: "00000000-0000-0000-0000-000000000007", nameContains: "District Hospital Blood Bank Karwar" },
];

export function matchBankId(eraktkoshName) {
  const found = BANK_MATCHERS.find((m) => eraktkoshName.includes(m.nameContains));
  return found ? found.bankId : null;
}
