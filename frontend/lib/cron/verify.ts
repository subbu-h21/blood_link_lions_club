// Shared auth check for every /api/cron/* route (Unit 31) - a new
// top-level lib/ folder, same treatment as lib/matching (Unit 17) and
// lib/push (Unit 18). The migration's pg_cron jobs call these routes via
// pg_net with `Authorization: Bearer <cron_secret>` (the secret lives in
// Supabase Vault, read at schedule time - see the Unit 31 migration).
// CRON_SECRET is a server-only env var, never exposed to the browser
// (CLAUDE.md rule 1) - it exists purely so a random internet request
// can't trigger these routes and force an early notif-count reset or
// auto-expire a live request.
export function verifyCronRequest(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${expected}`;
}
