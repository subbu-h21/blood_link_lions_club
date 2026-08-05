import { createDbClient } from "@/lib/db/client";
import { getAppSetting } from "@/lib/db/app-settings";
import { getCompatibleDonorGroups } from "@/lib/matching/compatibility";
import { isDonorEligible, rankEligibleDonors, type DonorForMatching } from "@/lib/matching/eligibility";
import { MAX_AVAILABILITY_PINCODES } from "@/lib/db/donors";
import type { BloodGroup } from "@/lib/serialise/blood-group";

// Bounded per-request candidate read (CLAUDE.md rule 4) - already scoped
// to one region + a handful of compatible blood groups, this just caps
// it explicitly too, same pattern as every other list read in this
// project.
const MAX_CANDIDATE_DONORS = 1000;
// Unlike the profiles/active-pledges reads (naturally capped at one row
// per candidate donor - a profile is 1:1, and one_active_pledge_per_donor
// already limits a donor to at most one accepted/screening row), a
// donor can have many past prospects rows. Ordered by invited_at DESC,
// so as long as this stays well above MAX_CANDIDATE_DONORS the dedup
// loop below still sees every candidate's single most recent invite
// before the cap is reached, even with several historical invites each.
const MAX_INVITE_ROWS = MAX_CANDIDATE_DONORS * 10;

/**
 * PRD.md §7.2 - returns donor ids eligible for a request, ranked by
 * least-recently-notified (see lib/matching/eligibility.ts for why the
 * "reliable donors first" half of the ordering is deliberately not
 * implemented yet). Reads donors/profiles/prospects; writes nothing -
 * notifying donors or creating prospects rows is Unit 22's job, not this
 * unit's (its own scope limit).
 *
 * Multi-pincode availability (2026-08-05): a donor is now a candidate if
 * the request's region is *either* their home region (donors.region_id,
 * unchanged query) *or* one of their additional donor_availability_
 * pincodes regions. Two sequential reads or'd together in JS, not one
 * combined `.or()` filter - this codebase's own established preference
 * (see lib/db/pincodes.ts's resolveLocation, which already does the same
 * two-sequential-lookups-not-one-combined-filter thing for the identical
 * "avoid needless PostgREST filter-string fragility" reason).
 */
export async function findEligibleDonors(requestId: string): Promise<string[]> {
  const db = createDbClient();

  const { data: request, error: requestError } = await db
    .from("requests")
    .select("blood_group, region_id")
    .eq("id", requestId)
    .maybeSingle();
  if (requestError) throw requestError;
  if (!request) return [];

  const requestBloodGroup = request.blood_group as BloodGroup;
  const compatibleGroups = getCompatibleDonorGroups(requestBloodGroup);
  const notifCapPerMonth = await getAppSetting<number>("donor.notif_cap_per_month");

  const DONOR_FIELDS =
    "id, blood_group, region_id, is_available, paused_until, eligible_from, notif_count_month, notif_month, deleted_at";

  const { data: homeDonorRows, error: homeDonorsError } = await db
    .from("donors")
    .select(DONOR_FIELDS)
    .in("blood_group", compatibleGroups)
    .eq("region_id", request.region_id)
    .is("deleted_at", null)
    .limit(MAX_CANDIDATE_DONORS);
  if (homeDonorsError) throw homeDonorsError;

  // Donors who don't live in this region but listed it as somewhere
  // they'll also travel to donate.
  const { data: extraLinks, error: extraLinksError } = await db
    .from("donor_availability_pincodes")
    .select("donor_id")
    .eq("region_id", request.region_id)
    .limit(MAX_CANDIDATE_DONORS);
  if (extraLinksError) throw extraLinksError;

  const homeDonorIds = new Set(homeDonorRows.map((row) => row.id));
  const extraDonorIds = [...new Set(extraLinks.map((row) => row.donor_id))].filter((id) => !homeDonorIds.has(id));

  let extraDonorRows: typeof homeDonorRows = [];
  if (extraDonorIds.length > 0) {
    const { data, error } = await db
      .from("donors")
      .select(DONOR_FIELDS)
      .in("blood_group", compatibleGroups)
      .in("id", extraDonorIds)
      .is("deleted_at", null)
      .limit(MAX_CANDIDATE_DONORS);
    if (error) throw error;
    extraDonorRows = data;
  }

  const donorRows = [...homeDonorRows, ...extraDonorRows];
  if (donorRows.length === 0) return [];

  const donorIds = donorRows.map((row) => row.id);

  // Every candidate's *complete* eligible-region set (home + every
  // additional one, not just the one that matched them into this
  // request's candidate pool) - lib/matching/eligibility.ts's Rule 2
  // re-checks membership independently, so it needs the full set to stay
  // a genuine re-verification rather than a rubber stamp of whichever
  // query happened to find this donor.
  const { data: allExtraRegionRows, error: allExtraRegionsError } = await db
    .from("donor_availability_pincodes")
    .select("donor_id, region_id")
    .in("donor_id", donorIds)
    .limit(MAX_CANDIDATE_DONORS * MAX_AVAILABILITY_PINCODES);
  if (allExtraRegionsError) throw allExtraRegionsError;
  const extraRegionIdsByDonor = new Map<string, string[]>();
  for (const row of allExtraRegionRows) {
    const list = extraRegionIdsByDonor.get(row.donor_id) ?? [];
    list.push(row.region_id);
    extraRegionIdsByDonor.set(row.donor_id, list);
  }

  const { data: profileRows, error: profilesError } = await db
    .from("profiles")
    .select("id, is_blocked")
    .in("id", donorIds)
    .limit(MAX_CANDIDATE_DONORS);
  if (profilesError) throw profilesError;
  const blockedById = new Map(profileRows.map((row) => [row.id, row.is_blocked]));

  const { data: activePledges, error: activeError } = await db
    .from("prospects")
    .select("donor_id")
    .in("donor_id", donorIds)
    .in("status", ["accepted", "screening"])
    .limit(MAX_CANDIDATE_DONORS);
  if (activeError) throw activeError;
  const activeDonorIds = new Set(activePledges.map((row) => row.donor_id));

  const { data: inviteRows, error: invitesError } = await db
    .from("prospects")
    .select("donor_id, invited_at")
    .in("donor_id", donorIds)
    .order("invited_at", { ascending: false })
    .limit(MAX_INVITE_ROWS);
  if (invitesError) throw invitesError;
  const lastInvitedById = new Map<string, string>();
  for (const row of inviteRows) {
    if (!lastInvitedById.has(row.donor_id)) lastInvitedById.set(row.donor_id, row.invited_at);
  }

  const now = new Date();
  const eligible = donorRows
    .map(
      (row): DonorForMatching => ({
        id: row.id,
        bloodGroup: row.blood_group as BloodGroup,
        regionIds: [row.region_id, ...(extraRegionIdsByDonor.get(row.id) ?? [])],
        isAvailable: row.is_available,
        pausedUntil: row.paused_until,
        eligibleFrom: row.eligible_from,
        notifCountMonth: row.notif_count_month,
        notifMonth: row.notif_month,
        deletedAt: row.deleted_at,
        isBlocked: blockedById.get(row.id) ?? false,
        hasActivePledge: activeDonorIds.has(row.id),
        lastInvitedAt: lastInvitedById.get(row.id) ?? null,
      }),
    )
    .filter((donor) =>
      isDonorEligible(donor, { bloodGroup: requestBloodGroup, regionId: request.region_id }, notifCapPerMonth, now),
    );

  return rankEligibleDonors(eligible).map((donor) => donor.id);
}
