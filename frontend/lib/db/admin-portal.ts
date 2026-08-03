import { createClient } from "@/lib/supabase/server";
import { createDbClient } from "@/lib/db/client";
import { assertNotBlocked } from "@/lib/db/profiles";

export type AdminRole = "admin" | "coordinator";

export type ActingAdmin = {
  profileId: string;
  role: AdminRole;
  regionId: string | null;
};

/**
 * Resolves the acting admin/coordinator's own profile id, role, and
 * region from the server-verified session - never from a client-supplied
 * value (CLAUDE.md rule 2). Mirrors lib/db/bank-portal.ts's
 * getActingBankStaff() exactly. The role re-check here is defensive, not
 * redundant with lib/supabase/proxy.ts's gate - same pattern already
 * established for owner_admin_id reads (Unit 26/30): the route-level gate
 * covers normal navigation, this covers any code path that calls this
 * function directly.
 *
 * regionId is nullable and deliberately not required to be non-null -
 * coordinators are a district-wide role (SPEC.md §3 item 1: "District
 * coordinator as fallback"), not tied to one region, unlike admin.
 */
export async function getActingAdmin(): Promise<ActingAdmin> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    throw new Error("No verified session");
  }
  const { sub: profileId } = data.claims as { sub: string };
  await assertNotBlocked(profileId);

  const db = createDbClient();
  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("role, region_id")
    .eq("id", profileId)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile || (profile.role !== "admin" && profile.role !== "coordinator")) {
    throw new Error("Session is not an admin/coordinator session");
  }

  return { profileId, role: profile.role, regionId: profile.region_id };
}

export type AdminContext = {
  role: AdminRole;
  fullName: string;
  regionName: string | null;
};

/** For the portal shell's header (Unit 36). */
export async function getAdminContext(): Promise<AdminContext> {
  const { profileId, role, regionId } = await getActingAdmin();

  const db = createDbClient();
  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("full_name")
    .eq("id", profileId)
    .single();
  if (profileError) throw profileError;

  let regionName: string | null = null;
  if (regionId) {
    const { data: region, error: regionError } = await db
      .from("regions")
      .select("name")
      .eq("id", regionId)
      .maybeSingle();
    if (regionError) throw regionError;
    regionName = region?.name ?? null;
  }

  return { role, fullName: profile.full_name, regionName };
}
