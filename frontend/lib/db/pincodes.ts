import { createDbClient } from "@/lib/db/client";

// A district's PIN codes are a small, bounded set (dozens to low
// hundreds), not an unbounded/growing table like requests or donors -
// fetching all of them for S1's autocomplete is the intended read, not
// a CLAUDE.md rule-4 violation. Still capped explicitly rather than
// left open-ended.
const MAX_PINCODES = 500;

export type PincodeOption = {
  code: string;
  officeName: string;
};

export async function getAllPincodes(): Promise<PincodeOption[]> {
  const db = createDbClient();
  const { data, error } = await db
    .from("pincodes")
    .select("code, office_name")
    .not("office_name", "is", null)
    .limit(MAX_PINCODES);
  if (error) throw error;

  return data.map((row) => ({ code: row.code, officeName: row.office_name as string }));
}

/**
 * A3 donor lookup's own PIN code filter (2026-08-07) - unlike
 * `getAllPincodes` (S1's district-wide autocomplete), this is scoped to
 * one region and deliberately does NOT filter out a null `office_name`
 * (several real seeded PIN codes have none yet) - a filter dropdown
 * needs every real code that could match a donor, not just the ones with
 * a friendly label; the caller falls back to the bare code when
 * `officeName` is null.
 */
export async function getPincodesForRegion(regionId: string): Promise<PincodeOption[]> {
  const db = createDbClient();
  const { data, error } = await db
    .from("pincodes")
    .select("code, office_name")
    .eq("region_id", regionId)
    .order("code", { ascending: true })
    .limit(MAX_PINCODES);
  if (error) throw error;

  return data.map((row) => ({ code: row.code, officeName: (row.office_name as string | null) ?? "" }));
}

export type ResolvedLocation = {
  regionId: string;
  regionName: string;
};

// Postgres's default LIKE/ILIKE escape character is backslash, so a
// literal backslash must be doubled first - otherwise escaping % or _
// afterward would themselves get re-escaped by the backslashes just
// inserted. Without this, a bare "%" (or "_") in the typed input is a
// wildcard, not literal text, and ILIKE matches (and resolves to) an
// arbitrary row instead of correctly finding no match (M2 review gate,
// Unit 15 - verified live against the real DB before this fix: `ILIKE
// '%'` returned the first pincode row).
function escapeLikePattern(input: string): string {
  return input.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * S1 · Search (PRD.md §6.1) - PIN code or town name (office_name)
 * resolves to exactly one region (PRD.md's own domain vocabulary in
 * CLAUDE.md: "PIN code... Resolves to exactly one region"). Two
 * sequential lookups, not a combined `.or()` filter - the raw input is
 * user-typed text, and building a combined PostgREST filter string out
 * of unsanitised user input is worth avoiding even though every method
 * here is still parameterised (no real injection risk, just needless
 * fragility if the input ever contains characters that mean something
 * in PostgREST's filter DSL).
 */
export async function resolveLocation(rawInput: string): Promise<ResolvedLocation | null> {
  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  const db = createDbClient();

  const { data: byCode, error: byCodeError } = await db
    .from("pincodes")
    .select("region_id")
    .eq("code", trimmed)
    .maybeSingle();
  if (byCodeError) throw byCodeError;

  let regionId = byCode?.region_id;

  if (!regionId) {
    const { data: byName, error: byNameError } = await db
      .from("pincodes")
      .select("region_id")
      .ilike("office_name", escapeLikePattern(trimmed))
      .limit(1)
      .maybeSingle();
    if (byNameError) throw byNameError;
    regionId = byName?.region_id;
  }

  if (!regionId) return null;

  const { data: region, error: regionError } = await db
    .from("regions")
    .select("name")
    .eq("id", regionId)
    .maybeSingle();
  if (regionError) throw regionError;
  if (!region) return null;

  return { regionId, regionName: region.name };
}

export type CreatePincodeResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Platform-manager-only write (/ops-control). Add-only for this build -
 * no edit, so re-adding an existing code is rejected rather than silently
 * moving it to a different region (that would be a real, surprising
 * side effect - every search resolution and every donor's own region
 * assignment depends on pincodes.region_id staying stable unless someone
 * deliberately edits it, which this build doesn't yet support).
 * pincodes.code is the primary key (Unit 02) - a duplicate insert fails
 * with Postgres 23505, translated here into a clear message instead of a
 * raw thrown error reaching the form.
 */
export async function createPincode(
  input: { code: string; regionId: string; officeName?: string; taluk?: string; district?: string },
): Promise<CreatePincodeResult> {
  const code = input.code.trim();
  if (!code) {
    return { ok: false, error: "PIN code is required." };
  }
  if (!input.regionId) {
    return { ok: false, error: "A region must be selected." };
  }

  const db = createDbClient();
  const { error } = await db.from("pincodes").insert({
    code,
    region_id: input.regionId,
    office_name: input.officeName?.trim() || null,
    taluk: input.taluk?.trim() || null,
    district: input.district?.trim() || null,
  });
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: `PIN code ${code} already exists.` };
    }
    if (error.code === "23503") {
      return { ok: false, error: "Selected region does not exist." };
    }
    throw error;
  }

  // No writeAuditLog() call here, unlike createRegion/createAdminAccount:
  // audit_log.entity_id is `uuid not null` (Unit 33), but pincodes.code
  // is the table's own primary key and is `text`, not a uuid - there is
  // no uuid to log against. Not worth widening a shared, already-shipped
  // column for one low-risk add-only write; the row itself (code ->
  // region_id) is the durable record of what was added, and the caller
  // (lib/actions/platform-manager.ts) already gated this behind
  // getActingPlatformManager() before reaching here.
  return { ok: true };
}
