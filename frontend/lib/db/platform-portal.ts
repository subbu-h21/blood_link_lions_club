import { createClient } from "@/lib/supabase/server";
import { createDbClient } from "@/lib/db/client";
import { assertNotBlocked } from "@/lib/db/profiles";

export type ActingPlatformManager = {
  profileId: string;
};

/**
 * Resolves the acting platform manager's own profile id from the
 * server-verified session - never from a client-supplied value (CLAUDE.md
 * rule 2). Mirrors lib/db/admin-portal.ts's getActingAdmin() and
 * lib/db/bank-portal.ts's getActingBankStaff() exactly, including the
 * assertNotBlocked() check (same shared implementation, not a copy) even
 * though blocking a platform manager isn't a real operational path today
 * (A5 moderation only ever blocks searchers/donors/reporters) - kept for
 * the same reason those two do: it's the one shared gate every acting-X
 * resolver in this codebase runs first, not a per-portal decision.
 *
 * The role re-check here is defensive, not redundant with
 * lib/supabase/proxy.ts's route gate - that gate covers normal
 * navigation to /ops-control/*, this covers any server action called
 * directly (e.g. a crafted request straight at a Server Action endpoint,
 * bypassing the page entirely).
 */
export async function getActingPlatformManager(): Promise<ActingPlatformManager> {
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
    .select("role")
    .eq("id", profileId)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile || profile.role !== "platform_manager") {
    throw new Error("Session is not a platform manager session");
  }

  return { profileId };
}

export type PlatformManagerContext = {
  fullName: string;
};

/** For the portal shell's header. */
export async function getPlatformManagerContext(): Promise<PlatformManagerContext> {
  const { profileId } = await getActingPlatformManager();

  const db = createDbClient();
  const { data: profile, error } = await db
    .from("profiles")
    .select("full_name")
    .eq("id", profileId)
    .single();
  if (error) throw error;

  return { fullName: profile.full_name ?? "Platform Manager" };
}
