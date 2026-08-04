import { randomBytes } from "node:crypto";

/**
 * A strong temp password, generated server-side rather than typed by the
 * creating admin/platform-manager - avoids a weak/reused/guessable
 * password entering the system for an account with access to donor
 * phone numbers or region-wide data (CLAUDE.md rule 3). Never persisted
 * anywhere in plaintext by any caller - returned once, shown once in the
 * UI, and the account is forced through its portal's own forced-reset
 * form before it can do anything else (must_reset_password=true, set by
 * every caller of this function, enforced by lib/supabase/proxy.ts's
 * reset gate).
 *
 * Shared by lib/db/platform-admins.ts (creating a regional admin) and
 * lib/db/admin-banks.ts (creating a bank's staff login) - one
 * implementation, not two copies, matching this codebase's own
 * established rule for shared logic (writeAuditLog, assertNotBlocked,
 * completeForcedPasswordReset all follow the same "exactly one
 * implementation" pattern).
 */
export function generateTempPassword(): string {
  // 18 random bytes -> 24 base64url characters, well above Supabase
  // Auth's own minimum and the MIN_PASSWORD_LENGTH (8) this codebase's
  // reset forms already enforce.
  return randomBytes(18).toString("base64url");
}
