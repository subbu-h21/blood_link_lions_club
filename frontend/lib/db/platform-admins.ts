import { createDbClient } from "@/lib/db/client";
import { writeAuditLog } from "@/lib/db/audit-log";
import { generateTempPassword } from "@/lib/auth/temp-password";
import type { ActingPlatformManager } from "@/lib/db/platform-portal";

export type RotaPriority = 1 | 2; // 1 = primary, 2 = backup (admin_rota.priority, Unit 33)

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Deactivates any existing active admin_rota row for this exact
 * (region_id, priority) pair, then inserts the new one - the table's own
 * one_active_admin_per_region_priority unique index (Unit 33) would
 * otherwise reject a second active row outright. Plain sequential
 * service-role writes, matching this codebase's established convention
 * for multi-step app-level state changes (lib/db/requests.ts's
 * syncRequestStageAfterProspectChange), not a new DB-transaction/
 * function pattern - see the migration's own comment for why a
 * security-definer function isn't needed here.
 */
export async function assignAdminRota(
  regionId: string,
  adminId: string,
  priority: RotaPriority,
): Promise<void> {
  const db = createDbClient();

  const { error: deactivateError } = await db
    .from("admin_rota")
    .update({ is_active: false })
    .eq("region_id", regionId)
    .eq("priority", priority)
    .eq("is_active", true);
  if (deactivateError) throw deactivateError;

  const { error: insertError } = await db
    .from("admin_rota")
    .insert({ region_id: regionId, admin_id: adminId, priority, is_active: true });
  if (insertError) throw insertError;
}

export type CreateAdminResult =
  | { ok: true; adminId: string; tempPassword: string }
  | { ok: false; error: string };

/**
 * Creates a real regional admin account: a Supabase Auth user
 * (email+password) plus its `profiles` row (role='admin'), then assigns
 * it as primary/backup for the given region. The one place in this
 * codebase that creates a privileged account through the app itself
 * rather than a seed script (prompts/README.md "Open decisions #1").
 *
 * auth.admin.createUser is an Auth Admin API call, not a
 * signInWithOtp/signInWithPassword/etc-class call - it requires the
 * secret key and is server-only under all circumstances (CLAUDE.md rule
 * 1's own clarification only carves out interactive sign-in/session
 * calls, not account-creation/admin.* calls). This function is only ever
 * reached from a "use server" action, never a Client Component.
 *
 * Not wrapped in a single DB transaction - the auth.users insert and the
 * profiles insert are two separate systems (GoTrue vs this app's own
 * tables) that were never atomic in this codebase (scripts/seed-bank-
 * accounts.mjs has the identical two-step shape). A failure between them
 * leaves an orphaned auth user with no profile, same category of gap the
 * seed script already has - not a new one introduced here.
 */
export async function createAdminAccount(
  caller: ActingPlatformManager,
  input: { email: string; fullName: string; regionId: string; priority: RotaPriority },
): Promise<CreateAdminResult> {
  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();

  if (!EMAIL_PATTERN.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (!fullName) {
    return { ok: false, error: "Full name is required." };
  }
  if (!input.regionId) {
    return { ok: false, error: "A region must be selected." };
  }
  if (input.priority !== 1 && input.priority !== 2) {
    return { ok: false, error: "Priority must be primary or backup." };
  }

  const db = createDbClient();

  // Checked before touching the Auth service at all - a crafted/stale
  // regionId would otherwise create a real Auth user just to immediately
  // delete it again in the profileError branch below. The dropdown this
  // form actually uses (listRegions()) can't produce an invalid id in
  // normal use; this only guards a direct/crafted call.
  const { data: region, error: regionError } = await db
    .from("regions")
    .select("id")
    .eq("id", input.regionId)
    .maybeSingle();
  if (regionError) throw regionError;
  if (!region) {
    return { ok: false, error: "Selected region does not exist." };
  }

  const tempPassword = generateTempPassword();

  const { data: created, error: createError } = await db.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });
  if (createError) {
    if (createError.message.toLowerCase().includes("already been registered")) {
      return { ok: false, error: `${email} is already registered.` };
    }
    throw createError;
  }

  const { error: profileError } = await db.from("profiles").insert({
    id: created.user.id,
    phone: null,
    full_name: fullName,
    role: "admin",
    region_id: input.regionId,
    must_reset_password: true,
  });
  if (profileError) {
    // Best-effort cleanup so a rejected profile insert (e.g. a bad
    // region_id FK) doesn't leave a stray, profile-less auth user behind
    // - the auth user was only just created in this same call, so
    // deleting it back out is safe (nothing else could have referenced
    // it yet).
    await db.auth.admin.deleteUser(created.user.id).catch(() => {});
    if (profileError.code === "23503") {
      return { ok: false, error: "Selected region does not exist." };
    }
    throw profileError;
  }

  await assignAdminRota(input.regionId, created.user.id, input.priority);

  await writeAuditLog(caller.profileId, "create_admin", "profiles", created.user.id, {
    email,
    regionId: input.regionId,
    priority: input.priority,
  });

  return { ok: true, adminId: created.user.id, tempPassword };
}

export type ResetAdminPasswordResult =
  | { ok: true; tempPassword: string }
  | { ok: false; error: string };

/**
 * Platform-manager-mediated password reset for an existing admin -
 * CLAUDE.md's own convention text says bank/admin resets are "admin-
 * mediated only," and until now nothing implemented that mediation for
 * admin accounts at all (no reset path existed once must_reset_password
 * had already been cleared once). A true self-service "forgot password"
 * flow is intentionally deferred - see FUTURE-WORK.md.
 *
 * Re-verifies the target is actually role='admin' before touching
 * anything - this action must never be reachable against a bank_staff,
 * coordinator, or (especially) the platform_manager's own account
 * through this code path; the platform manager's own credential has no
 * reset path here or anywhere else in this build.
 */
export async function resetAdminPassword(
  caller: ActingPlatformManager,
  adminProfileId: string,
): Promise<ResetAdminPasswordResult> {
  const db = createDbClient();

  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("role, full_name")
    .eq("id", adminProfileId)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile || profile.role !== "admin") {
    return { ok: false, error: "Not a regional admin account." };
  }

  const tempPassword = generateTempPassword();
  const { error: updateError } = await db.auth.admin.updateUserById(adminProfileId, {
    password: tempPassword,
  });
  if (updateError) throw updateError;

  const { error: flagError } = await db
    .from("profiles")
    .update({ must_reset_password: true })
    .eq("id", adminProfileId);
  if (flagError) throw flagError;

  await writeAuditLog(caller.profileId, "reset_admin_password", "profiles", adminProfileId, {
    fullName: profile.full_name,
  });

  return { ok: true, tempPassword };
}

export type AdminRow = {
  id: string;
  email: string;
  fullName: string;
  regionName: string | null;
  priority: RotaPriority | null; // null = not currently in any region's active rota
};

/**
 * All regional admins, for the dashboard's admin list + reset-password
 * table. A district's admins are a small, bounded set (one platform
 * manager provisioning them one at a time, not an unbounded/growing
 * table like requests or donors) - same reasoning lib/db/pincodes.ts's
 * getAllPincodes and lib/db/platform-geography.ts's listRegions already
 * document for their own reads, still capped rather than left
 * open-ended.
 */
const MAX_ADMINS = 500;

export async function listAdmins(): Promise<AdminRow[]> {
  const db = createDbClient();

  const { data: profiles, error: profilesError } = await db
    .from("profiles")
    .select("id, full_name, region_id")
    .eq("role", "admin")
    .order("full_name")
    .limit(MAX_ADMINS);
  if (profilesError) throw profilesError;
  if (profiles.length === 0) return [];

  const adminIds = profiles.map((p) => p.id as string);
  const regionIds = [...new Set(profiles.map((p) => p.region_id as string | null).filter(Boolean))] as string[];

  // db.auth.admin.listUsers() paginates (50 per page by default) and has
  // no "filter by these ids" option - looping it to find just these
  // admins would either miss rows past page 1 (wrong) or require fetching
  // every auth user in the project (CLAUDE.md rule 4 territory). Since
  // profiles has no email column (only auth.users does), getUserById()
  // per admin id is the correct, bounded lookup - the same "small,
  // bounded set" cap already justifies doing this in parallel rather than
  // paginating a much larger, unrelated table.
  const [{ data: rota, error: rotaError }, { data: regions, error: regionsError }, authResults] = await Promise.all([
    db
      .from("admin_rota")
      .select("admin_id, priority")
      .eq("is_active", true)
      .in("admin_id", adminIds)
      .limit(adminIds.length),
    regionIds.length
      ? db.from("regions").select("id, name").in("id", regionIds).limit(regionIds.length)
      : Promise.resolve({ data: [] as { id: string; name: string }[], error: null }),
    Promise.all(adminIds.map((id) => db.auth.admin.getUserById(id))),
  ]);
  if (rotaError) throw rotaError;
  if (regionsError) throw regionsError;

  const priorityByAdminId = new Map(rota.map((r) => [r.admin_id as string, r.priority as RotaPriority]));
  const regionNameById = new Map(regions.map((r) => [r.id as string, r.name as string]));
  const emailById = new Map(
    adminIds.map((id, i) => [id, authResults[i].data?.user?.email ?? ""]),
  );

  return profiles.map((p) => ({
    id: p.id as string,
    email: emailById.get(p.id as string) ?? "",
    fullName: (p.full_name as string | null) ?? "",
    regionName: p.region_id ? (regionNameById.get(p.region_id as string) ?? null) : null,
    priority: priorityByAdminId.get(p.id as string) ?? null,
  }));
}
