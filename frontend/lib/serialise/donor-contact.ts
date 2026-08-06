export type DonorContact = { name: string; phone: string };

export type ProspectStatus =
  | "invited"
  | "accepted"
  | "screening"
  | "donated"
  | "rejected"
  | "no_show"
  | "stood_down";

export type RevealCaller = "bank" | "admin_prospect" | "admin_region_lookup";

/**
 * Rule 3's single serialisation layer for releasing a donor's phone
 * number to a non-donor party (CLAUDE.md rule 3, verbatim: an admin with
 * an `accepted` prospect, the bank that donor is **assigned** to (the
 * concrete mechanism behind the rule's own "scheduled at" wording, added
 * 2026-08-06 - see `prospects.assigned_at`, migration
 * `20260806090000_prospects_assigned_at.sql`), or - added Unit 41,
 * confirmed with the project owner - an admin/coordinator doing A3's
 * region-scoped donor lookup). Every call site is already scoped to its
 * own bank/region by its own query (own-bank join for B3/B4, own-region +
 * accepted-only lookup for A2/Unit 39, own-region + open-request +
 * reason + rate-limit for A3/Unit 41) - this function is the second,
 * independent gate on top of that scoping, not a replacement for it.
 * Never build a second ad-hoc `{ name, phone }` shape anywhere else in
 * the codebase.
 *
 * `assignedAt` is only meaningful for the `bank` caller - before
 * 2026-08-06 this channel released a donor's contact the instant
 * `status` became `accepted`/`screening`, with no admin action in
 * between at all (confirmed by reading the code as it stood, not
 * assumed); `assigned_at` closes that gap as a second, independent
 * condition alongside status, not a replacement for the status check.
 * The other two callers pass `null` for it - `admin_prospect` already
 * gates on `accepted` alone (an admin needs to see the phone *before*
 * assigning anyone, to call and pre-screen the donor first), and
 * `admin_region_lookup` has no prospect/assignment relationship to gate
 * on at all, same reasoning it already has no `prospectStatus` either.
 *
 * `admin_region_lookup` takes no `prospectStatus` (there is no prospect
 * relationship for a bare regional lookup) - by the time this is called
 * with that caller value, `lib/db/admin-donors.ts`'s own
 * `revealDonorContactForLookup` has *already* verified region scope, a
 * real open request in that region, a non-empty reason, and the rate
 * limit, exactly the same "upstream scoping, this function is the final
 * gate" division of labour the other two channels already use.
 */
export function revealDonorContact(
  caller: RevealCaller,
  prospectStatus: ProspectStatus | null,
  donor: { fullName: string | null; phone: string | null },
  assignedAt: string | null = null,
): DonorContact | null {
  const allowed =
    caller === "bank"
      ? (prospectStatus === "accepted" || prospectStatus === "screening") && assignedAt !== null
      : caller === "admin_prospect"
        ? prospectStatus === "accepted"
        : true; // admin_region_lookup - all prerequisites already verified upstream
  if (!allowed) return null;
  return { name: donor.fullName ?? "", phone: donor.phone ?? "" };
}
