import { createDbClient } from "@/lib/db/client";
import type { ActingAdmin } from "@/lib/db/admin-portal";
import { OPEN_STAGES } from "@/lib/db/requests";
import { getAppSetting } from "@/lib/db/app-settings";
import { writeAuditLog } from "@/lib/db/audit-log";
import { revealDonorContact } from "@/lib/serialise/donor-contact";
import type { BloodGroup } from "@/lib/serialise/blood-group";

/**
 * A3 · Donor lookup (PRD.md §9.1), real data (Unit 41). Region-scoped the
 * same way A1's queue is (Unit 37) - a coordinator (no home region) gets
 * an empty result, not a district-wide donor list; this screen is a
 * browse/search surface like A1, not an act-on-a-specific-already-known-
 * item screen like A2, so the same reasoning applies (confirmed as a
 * distinct question from A2's own district-wide exception, not assumed
 * to inherit it).
 *
 * The returned shape deliberately has NO phone field at all, revealed or
 * not - confirmed with the project owner: search results never contain a
 * phone number under any circumstance; reveal is always a separate,
 * individually logged action on exactly one donor (see
 * `revealDonorContactForLookup` below).
 */
export type AdminDonorSearchRow = {
  id: string;
  name: string;
  bloodGroup: BloodGroup;
  isAvailable: boolean;
  pausedUntil: string | null;
  eligibleFrom: string | null;
  // The PIN code actually relevant to *this* region - the donor's own
  // home pincode when they qualified via their home region, or the
  // specific "also available here" pincode when they qualified via a
  // secondary listing (2026-08-07). Never a pincode from a different
  // region than the one this list is scoped to.
  pincode: string;
};

export type AdminDonorSearchResult = { rows: AdminDonorSearchRow[]; hasMore: boolean };

// One page of a region's donor list - real pagination (CLAUDE.md rule 4:
// "this is explicitly the regional donor list — paginate it", this
// unit's own constraint), not just a generous cap.
const DONORS_PER_PAGE = 20;

// A region's real donor pool (home-region donors + everyone who's listed
// this region as a secondary "also travel here" PIN code, 2026-08-07)
// realistically stays in the low hundreds even at full district scale -
// same "generous but explicit" cap reasoning as MAX_QUEUE_ROWS/
// MAX_OTHER_REGIONS elsewhere in lib/db. Each of the two source queries
// below is capped at this independently, then merged/sorted/paginated in
// JS (see the doc comment on `searchAdminDonors` for why this can't be a
// single `.range()` call anymore).
const MAX_REGION_DONORS = 500;

type RawDonorRow = {
  id: string;
  blood_group: string;
  is_available: boolean;
  paused_until: string | null;
  eligible_from: string | null;
  pincode: string;
};

/**
 * Widened 2026-08-07 (found live: two real donors whose home region is
 * Kumta but who registered Sirsi as a secondary "also available to
 * donate in" pincode - lib/db/donors.ts's D6 feature, 2026-08-05 - never
 * showed up in Sirsi's own A3 list at all, despite `findEligibleDonors`
 * (the actual matching engine) already treating them as eligible for a
 * real Sirsi request). This screen's own definition of "a region's
 * donors" was still home-region-only, an oversight from when the
 * secondary-pincode feature shipped - now matches the matching engine's
 * own definition exactly: home region OR a `donor_availability_pincodes`
 * row in this region.
 *
 * Two sequential queries merged in JS, not a combined `.or()` filter -
 * this codebase's established preference (`resolveLocation`,
 * `findEligibleDonors`'s own 2026-08-05 restructuring for the identical
 * reason). This also means real DB-level `.range()` pagination is no
 * longer possible across a single query (there are two heterogeneous
 * sources to merge first) - both source queries are capped at
 * `MAX_REGION_DONORS` instead (a real, bounded read, not a whole-table
 * fetch - CLAUDE.md rule 4's actual concern), then sorted deterministically
 * and paginated with a plain JS `.slice()` before ever reaching the
 * client, so a caller only ever receives one page's worth of rows either
 * way - `hasMore`/Previous/Next behave identically to before.
 *
 * A pincode filter, if supplied, is applied to each source query on its
 * own natural pincode column *before* the merge (the home query's own
 * `donors.pincode`, the secondary query's own
 * `donor_availability_pincodes.pincode`) - this is what makes "the
 * pincode shown is always the one relevant to this region" true by
 * construction, not something reconciled after the fact.
 */
export async function searchAdminDonors(
  caller: ActingAdmin,
  filters: { bloodGroup?: BloodGroup; availableOnly?: boolean; pincode?: string },
  page: number,
): Promise<AdminDonorSearchResult> {
  if (!caller.regionId) return { rows: [], hasMore: false };

  const db = createDbClient();

  let homeQuery = db
    .from("donors")
    .select("id, blood_group, is_available, paused_until, eligible_from, pincode")
    .eq("region_id", caller.regionId)
    .is("deleted_at", null);
  if (filters.bloodGroup) homeQuery = homeQuery.eq("blood_group", filters.bloodGroup);
  if (filters.availableOnly) homeQuery = homeQuery.eq("is_available", true);
  if (filters.pincode) homeQuery = homeQuery.eq("pincode", filters.pincode);
  const { data: homeDonors, error: homeError } = await homeQuery.limit(MAX_REGION_DONORS);
  if (homeError) throw homeError;

  let availQuery = db
    .from("donor_availability_pincodes")
    .select("donor_id, pincode")
    .eq("region_id", caller.regionId);
  if (filters.pincode) availQuery = availQuery.eq("pincode", filters.pincode);
  const { data: availRows, error: availError } = await availQuery.limit(MAX_REGION_DONORS);
  if (availError) throw availError;

  const homeDonorIds = new Set(homeDonors.map((d) => d.id as string));
  const pincodeBySecondaryDonor = new Map<string, string>();
  for (const row of availRows) {
    const donorId = row.donor_id as string;
    if (!homeDonorIds.has(donorId)) pincodeBySecondaryDonor.set(donorId, row.pincode as string);
  }
  const secondaryDonorIds = [...pincodeBySecondaryDonor.keys()];

  let secondaryDonors: RawDonorRow[] = [];
  if (secondaryDonorIds.length > 0) {
    let secondaryQuery = db
      .from("donors")
      .select("id, blood_group, is_available, paused_until, eligible_from, pincode")
      .in("id", secondaryDonorIds)
      .is("deleted_at", null);
    if (filters.bloodGroup) secondaryQuery = secondaryQuery.eq("blood_group", filters.bloodGroup);
    if (filters.availableOnly) secondaryQuery = secondaryQuery.eq("is_available", true);
    const { data, error } = await secondaryQuery.limit(secondaryDonorIds.length);
    if (error) throw error;
    secondaryDonors = data as RawDonorRow[];
  }

  const merged = [
    ...(homeDonors as RawDonorRow[]).map((d) => ({ ...d, displayPincode: d.pincode })),
    ...secondaryDonors.map((d) => ({
      ...d,
      displayPincode: pincodeBySecondaryDonor.get(d.id) ?? d.pincode,
    })),
  ].sort((a, b) => a.id.localeCompare(b.id));

  if (merged.length === 0) return { rows: [], hasMore: false };

  const offset = Math.max(0, page) * DONORS_PER_PAGE;
  const pageSlice = merged.slice(offset, offset + DONORS_PER_PAGE);

  const donorIds = pageSlice.map((d) => d.id);
  const { data: profiles, error: profilesError } = await db
    .from("profiles")
    .select("id, full_name")
    .in("id", donorIds)
    .limit(donorIds.length);
  if (profilesError) throw profilesError;
  const nameByDonor = new Map(profiles.map((p) => [p.id as string, p.full_name as string]));

  const rows: AdminDonorSearchRow[] = pageSlice.map((d) => ({
    id: d.id,
    name: nameByDonor.get(d.id) ?? "",
    bloodGroup: d.blood_group as BloodGroup,
    isAvailable: d.is_available,
    pausedUntil: d.paused_until,
    eligibleFrom: d.eligible_from,
    pincode: d.displayPincode,
  }));

  return { rows, hasMore: merged.length > offset + DONORS_PER_PAGE };
}

export type OpenRequestOption = { id: string; bloodGroup: BloodGroup; urgency: string };

const MAX_OPEN_REQUESTS_FOR_PICKER = 100;

/**
 * Feeds A3's "which open request is this reveal for" picker - the
 * project owner's own requirement that a reveal be tied to a specific
 * open request, not a bare directory browse. Region-scoped the same way
 * as the search above (a coordinator gets none).
 */
export async function listOpenRequestsForRegion(caller: ActingAdmin): Promise<OpenRequestOption[]> {
  if (!caller.regionId) return [];
  const db = createDbClient();
  const { data, error } = await db
    .from("requests")
    .select("id, blood_group, urgency")
    .eq("region_id", caller.regionId)
    .in("stage", OPEN_STAGES)
    .limit(MAX_OPEN_REQUESTS_FOR_PICKER);
  if (error) throw error;
  return data.map((r) => ({ id: r.id as string, bloodGroup: r.blood_group as BloodGroup, urgency: r.urgency as string }));
}

export type RevealLookupResult =
  | { ok: true; name: string; phone: string }
  | { ok: false; reason: "not_found" | "no_open_request" | "invalid_reason" | "rate_limited" };

// Rolling window the rate limit counts against - matches the app_settings
// key's own name/description (Unit 41's migration).
const RATE_LIMIT_WINDOW_HOURS = 1;

/**
 * A3's reveal action (PRD.md §9.1 A3, CLAUDE.md rule 3's third channel -
 * confirmed with the project owner, see donor-contact.ts's own doc
 * comment). Requires, in order: a non-empty reason, the donor actually in
 * the caller's own region, a real *open* request also in that same
 * region (the operational justification for the lookup - not
 * necessarily blood-group-matched to this donor, just evidence the
 * region has a live need), and the caller's own rolling-hour reveal count
 * under the `app_settings`-configured limit (counted directly from this
 * admin's own `audit_log` `view_contact` rows - no new infrastructure,
 * CLAUDE.md rule 9). Every successful reveal writes one more such row,
 * which is exactly what the next reveal's own rate-limit count reads -
 * the audit trail and the rate limit are the same data, not two parallel
 * mechanisms that could drift apart.
 *
 * "The donor actually in the caller's own region" widened 2026-08-07 to
 * match `searchAdminDonors`'s own widened definition (home region OR a
 * secondary `donor_availability_pincodes` region) - deliberately kept in
 * lockstep with the search list: a donor this screen shows but this
 * check would reject is a worse bug than either extreme (a donor visible
 * in the list whose own Reveal button always fails with a confusing
 * generic error). CLAUDE.md rule 3's own text updated to match.
 */
export async function revealDonorContactForLookup(
  caller: ActingAdmin,
  donorId: string,
  requestId: string,
  reason: string,
): Promise<RevealLookupResult> {
  const trimmedReason = reason.trim();
  if (!trimmedReason) return { ok: false, reason: "invalid_reason" };
  if (!caller.regionId) return { ok: false, reason: "not_found" };

  const db = createDbClient();

  const { data: donor, error: donorError } = await db
    .from("donors")
    .select("id, region_id")
    .eq("id", donorId)
    .is("deleted_at", null)
    .maybeSingle();
  if (donorError) throw donorError;
  if (!donor) return { ok: false, reason: "not_found" };

  let donorInRegion = donor.region_id === caller.regionId;
  if (!donorInRegion) {
    const { data: avail, error: availError } = await db
      .from("donor_availability_pincodes")
      .select("donor_id")
      .eq("donor_id", donorId)
      .eq("region_id", caller.regionId)
      .limit(1)
      .maybeSingle();
    if (availError) throw availError;
    donorInRegion = avail !== null;
  }
  if (!donorInRegion) return { ok: false, reason: "not_found" };

  const { data: openRequest, error: requestError } = await db
    .from("requests")
    .select("id")
    .eq("id", requestId)
    .eq("region_id", caller.regionId)
    .in("stage", OPEN_STAGES)
    .maybeSingle();
  if (requestError) throw requestError;
  if (!openRequest) return { ok: false, reason: "no_open_request" };

  const cutoff = new Date(Date.now() - RATE_LIMIT_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
  const { count: recentReveals, error: countError } = await db
    .from("audit_log")
    .select("id", { count: "exact", head: true })
    .eq("actor_id", caller.profileId)
    .eq("action", "view_contact")
    .gte("created_at", cutoff);
  if (countError) throw countError;
  const rateLimit = await getAppSetting<number>("admin.donor_reveal_rate_limit_per_hour");
  if ((recentReveals ?? 0) >= rateLimit) return { ok: false, reason: "rate_limited" };

  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("full_name, phone")
    .eq("id", donorId)
    .maybeSingle();
  if (profileError) throw profileError;

  const contact = revealDonorContact("admin_region_lookup", null, {
    fullName: profile?.full_name ?? null,
    phone: profile?.phone ?? null,
  });
  if (!contact) return { ok: false, reason: "not_found" };

  await writeAuditLog(caller.profileId, "view_contact", "donor", donorId, {
    requestId,
    reason: trimmedReason,
  });

  return { ok: true, name: contact.name, phone: contact.phone };
}
