import { BLOOD_GROUPS, type BloodGroup } from "@/lib/serialise/blood-group";

/**
 * Red cell compatibility only (PRD.md §4.7). **Plasma compatibility is
 * the inverse of this table** (SPEC.md §7 I7) - if plasma is ever added,
 * write a second table/function for it. Never extend this one; that's
 * the entire reason this lives in its own file.
 */
const RED_CELL_COMPATIBLE_DONORS: Record<BloodGroup, readonly BloodGroup[]> = {
  "O-": ["O-"],
  "O+": ["O-", "O+"],
  "A-": ["O-", "A-"],
  "A+": ["O-", "O+", "A-", "A+"],
  "B-": ["O-", "B-"],
  "B+": ["O-", "O+", "B-", "B+"],
  "AB-": ["O-", "A-", "B-", "AB-"],
  "AB+": [...BLOOD_GROUPS],
};

export function getCompatibleDonorGroups(recipientGroup: BloodGroup): readonly BloodGroup[] {
  return RED_CELL_COMPATIBLE_DONORS[recipientGroup];
}

export function isCompatibleDonor(donorGroup: BloodGroup, recipientGroup: BloodGroup): boolean {
  return RED_CELL_COMPATIBLE_DONORS[recipientGroup].includes(donorGroup);
}
