// Units 09/35: creates real Supabase Auth accounts for test bank_staff
// and admin/coordinator users. No account-creation UI exists yet for
// either tier (M4 gap, see prompts/README.md "Open decisions" item 1),
// so these are seed-script-created, same spirit as root scripts/seed.mjs
// but through the Auth Admin API (createUser), which raw `pg` can't reach.
// Kept as one script/one command (CLAUDE.md's own Commands table already
// describes `db:seed:accounts` as "test bank_staff/admin accounts") -
// filename kept as-is from Unit 09 rather than renamed, to avoid
// unnecessary churn on an already-shipped file for a cosmetic mismatch.
// Reuses @supabase/supabase-js, already a frontend dependency - no new
// package needed. Run from the repo root via `npm run db:seed:accounts`,
// or directly from frontend/ with env already loaded:
//   node --env-file=.env.local --experimental-websocket scripts/seed-bank-accounts.mjs
//
// --experimental-websocket is required on Node 20: supabase-js's client
// constructor eagerly initialises a Realtime client (even though this
// script never uses realtime), which throws "native WebSocket not found"
// on Node <22 without a global WebSocket. Node 22 has one built in and
// won't need the flag; this script never actually opens a socket either
// way. No new dependency (e.g. `ws`) needed to work around it.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!url || !secretKey) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set (see frontend/.env.local).",
  );
  process.exit(1);
}

// Test accounts are seeded with a known, fixed password - never run this
// against anything but the local stack without deliberately overriding it.
const isLocal = /^https?:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(url);
if (!isLocal && !process.argv.includes("--i-know-this-is-production")) {
  console.error(
    `Refusing to seed test accounts with a known password against a non-local URL (${url}). ` +
      "Pass --i-know-this-is-production if this is really intended.",
  );
  process.exit(1);
}

// Same PLACEHOLDER bank/region ids as supabase/seed.sql (Unit 02) - swap
// together once real bank/region data exists.
const PLACEHOLDER_BANK_ID = "00000000-0000-0000-0000-000000000002";
const PLACEHOLDER_REGION_ID = "00000000-0000-0000-0000-000000000001";
const TEST_PASSWORD = "TempPass123!";

// Unit 35 adds admin/coordinator accounts to the same script/command
// (see the file-header note above) rather than a second script. `admin`
// gets a region (region-scoped queue reads, Unit 37) the same way bank
// staff get a bank; `coordinator` deliberately gets no region - SPEC.md
// §3 item 1 frames the coordinator as a district-wide escalation
// fallback, not a per-region role, matching Unit 33's own admin_rota
// design (only two per-region priority tiers; the coordinator tier is
// resolved by role, not a rota row).
const TEST_ACCOUNTS = [
  {
    email: "bankstaff1@test.local",
    fullName: "PLACEHOLDER Bank Staff 1",
    role: "bank_staff",
    profileFields: { bank_id: PLACEHOLDER_BANK_ID },
  },
  {
    email: "bankstaff2@test.local",
    fullName: "PLACEHOLDER Bank Staff 2",
    role: "bank_staff",
    profileFields: { bank_id: PLACEHOLDER_BANK_ID },
  },
  {
    email: "admin1@test.local",
    fullName: "PLACEHOLDER Admin 1",
    role: "admin",
    profileFields: { region_id: PLACEHOLDER_REGION_ID },
  },
  {
    email: "coordinator1@test.local",
    fullName: "PLACEHOLDER Coordinator 1",
    role: "coordinator",
    profileFields: {},
  },
];

const supabase = createClient(url, secretKey, { auth: { persistSession: false } });

for (const account of TEST_ACCOUNTS) {
  let userId;

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: account.email,
    password: TEST_PASSWORD,
    email_confirm: true,
  });

  if (createError) {
    if (!createError.message.includes("already been registered")) {
      throw createError;
    }
    const { data: list, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;
    const existing = list.users.find((u) => u.email === account.email);
    if (!existing) throw new Error(`${account.email} reported as registered but not found`);
    userId = existing.id;
    console.log(`${account.email} already exists (auth), reusing.`);
  } else {
    userId = created.user.id;
    console.log(`${account.email} created (auth), temp password: ${TEST_PASSWORD}`);
  }

  // must_reset_password defaults true (set explicitly here regardless of
  // column default) so a freshly-created account is always caught by the
  // forced-reset gate, even if the column default ever changes.
  const { error: profileError } = await supabase.from("profiles").insert({
    id: userId,
    phone: null,
    full_name: account.fullName,
    role: account.role,
    must_reset_password: true,
    ...account.profileFields,
  });

  if (profileError) {
    if (profileError.code === "23505") {
      console.log(`${account.email} profile already exists, left untouched.`);
    } else {
      throw profileError;
    }
  } else {
    console.log(`${account.email} profile created (${account.role}, must_reset_password=true).`);
  }
}

console.log("Test accounts ready.");
