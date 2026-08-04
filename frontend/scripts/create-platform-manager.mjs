// One-time bootstrap for the platform manager account (prompts/README.md
// "Open decisions #1", closed by the /ops-control portal). Deliberately
// separate from scripts/seed-bank-accounts.mjs: that script seeds *test*
// accounts with a fixed known password and refuses to run against a
// non-local URL without an explicit override. This script creates the
// one real, permanent platform-manager credential and is meant to be run
// for real (including against production), so it takes an email and
// password as required arguments instead of a hardcoded one, and refuses
// to run a second time if a platform_manager profile already exists —
// there is exactly one of this role, ever, by design (no in-app account
// creation flow for it exists or should exist).
//
// Run from the repo root via `npm run db:create-platform-manager -- --email=you@example.org --password=...`,
// or directly from frontend/ with env already loaded:
//   node --env-file=.env.local --experimental-websocket scripts/create-platform-manager.mjs --email=... --password=...
//
// --experimental-websocket is required on Node 20 for the same reason
// scripts/seed-bank-accounts.mjs needs it (supabase-js eagerly
// initialises a Realtime client that throws "native WebSocket not found"
// on Node <22 without a global WebSocket) — this script never opens a
// socket either way. Node 22 has one built in and won't need the flag.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!url || !secretKey) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set (see frontend/.env.local).",
  );
  process.exit(1);
}

function readArg(flag) {
  const prefix = `--${flag}=`;
  const found = process.argv.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

const email = readArg("email");
const password = readArg("password");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

if (!email || !EMAIL_PATTERN.test(email)) {
  console.error("Pass a valid --email=you@example.org");
  process.exit(1);
}
if (!password || password.length < MIN_PASSWORD_LENGTH) {
  console.error(`Pass a --password=... of at least ${MIN_PASSWORD_LENGTH} characters.`);
  process.exit(1);
}

const supabase = createClient(url, secretKey, { auth: { persistSession: false } });

// Refuse a second platform manager - exactly one is meant to ever exist.
// A crafted duplicate run (or a re-run after a partial failure below)
// must not silently create a second privileged account.
const { data: existing, error: existingError } = await supabase
  .from("profiles")
  .select("id")
  .eq("role", "platform_manager")
  .maybeSingle();
if (existingError) throw existingError;
if (existing) {
  console.error(
    `A platform_manager profile already exists (id ${existing.id}). Refusing to create a second one. ` +
      "Use lib/db/platform-admins.ts's reset-password path (once the portal exists) or a direct, deliberate " +
      "database edit if this account genuinely needs replacing.",
  );
  process.exit(1);
}

const { data: created, error: createError } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});
if (createError) throw createError;

// must_reset_password=true even though the caller just chose this
// password themselves - the same safety reasoning as the test-account
// script: it may have been typed on a command line (shell history) or
// relayed over a side channel, so the first real login should still
// force a change only the platform manager themselves has performed.
const { error: profileError } = await supabase.from("profiles").insert({
  id: created.user.id,
  phone: null,
  full_name: "Platform Manager",
  role: "platform_manager",
  must_reset_password: true,
});
if (profileError) throw profileError;

console.log(`Platform manager created: ${email} (id ${created.user.id}).`);
console.log("They will be forced to set a new password on first login at /ops-control/login.");
