# 61 — Go live: infrastructure, hosting, and the last real blockers

**Sections 1-6 COMPLETED 2026-08-10, same day, by a fresh session using this handoff.** The app is live at **`https://bloodlink.live`** (real domain, GoDaddy DNS → Vercel), backed by a real hosted Supabase project (`kqucebkqjgnwhjgjuqwm`, Mumbai region) with all 23 migrations + real seed data applied, SMTP live, redirect URLs re-pointed, a real platform-manager account created and login-verified, and real production VAPID keys generated and deployed. Full detail (including two real gaps caught mid-flow — the GitHub repo being public instead of private, and hardcoded local-dev placeholders in Supabase Vault that would've silently broken every scheduled cron job in production) is in `prompts/README.md`'s dated 2026-08-10 entry — read that before assuming anything below still needs doing. **Section 7 (SMS/OTP) remains deliberately deferred, now being picked up in a later session — don't treat its presence below as still-untouched without checking `prompts/README.md` first.** Section 8 (backups + monitoring) was never part of this session's ask and is still untouched.

**Below this line is the original handoff context, written *before* sections 1-6 ran — kept for reference, not a live status.**

**Handoff context for a fresh session.** Written 2026-08-10. The app itself is in good shape — feature-complete, a full security review passed clean (0 blockers/0 warnings, `prompts/60-final-security-review.md`), a real audit-log gap found and fixed the same day. Real geography and blood bank data are seeded. **None of that is reachable by anyone except the project owner, on their own laptop.** Everything — the app, the database — only runs inside local Docker + a local dev server. This file is about closing that gap: the project owner wants to open this to real users, target ~100-200/day.

## Read first

- `CLAUDE.md` — operating rules, read fully before touching anything. Its "Git history" note (under Commands) explains a real quirk you'll hit immediately: this repo's commit history before 2026-08-09 is a same-day retroactive reconstruction, not real incremental history. Don't be thrown by it.
- `FUTURE-WORK.md` — what's deliberately deferred and why. The project owner has explicitly said to leave the privacy-policy grievance contact and `app_settings` escalation timing values alone for now — don't re-raise them unprompted.
- `prompts/README.md`'s tail end (the "Post-M6 work" section) for a chronological summary of everything since the original 58-unit build.

## The order that actually matters

**The project owner has deliberately chosen to defer the SMS/OTP provider decision (2026-08-10) and start with the rest of the infrastructure instead.** This is a real, deliberate choice, not an oversight — don't push it back to the top of the list or treat it as the obvious first step just because it's the single biggest blocker to a *real donor* using the app. GitHub/Supabase/Vercel/domain don't depend on SMS being decided first, so this reordering doesn't actually break anything gate-wise. SMS is section 7 below, not section 1 — come back to it once the rest of the hosting picture exists, unless the project owner raises it sooner.

### 1. Get this project onto GitHub

`git remote -v` returns nothing — confirmed, this repo has never been pushed anywhere. Needed both as a real backup (right now the *only* copy of this code is the project owner's laptop) and because Vercel's normal deployment flow expects a GitHub repo to deploy from. Create a repo, push.

### 2. A real hosted Supabase project

Sign-up is free, no card required. Concretely: create a project via their dashboard (name, region — pick the AWS region closest to India), then `supabase link` to connect the local CLI to it, `supabase db push` to apply every migration in `supabase/migrations/` (recreates every table/RLS policy for real), then apply `supabase/seed.sql` by hand (not automatic for a hosted project the way local `supabase start` seeds it) to load the real geography/bank data. `supabase config push` pushes `config.toml`'s settings (including the Brevo SMTP block) to the hosted project — confirmed this is a real command, not a guess.

Free tier (confirmed 2026-08-09): 500MB DB storage, 50k monthly active users, 1GB file storage, 5GB bandwidth, unlimited API requests — comfortably enough for 100-200 users/day. One real quirk: a free project auto-pauses after 7 days with zero DB requests — irrelevant once real traffic exists, relevant if this gets set up and then sits untouched for a week before launch.

### 3. Vercel + domain

Connect Vercel to the new GitHub repo. Set real environment variables there (new Supabase project URL + new API keys — **never** the local dev ones, and the service-role/secret key must never be committed to the repo, same as it never has been). Buy a real domain, point it at the Vercel deployment.

### 4. Re-point what's still pointing at localhost

`supabase/config.toml`'s `[auth] additional_redirect_urls` currently only lists `localhost`/`127.0.0.1` — add the real domain's `/forgot-password/confirm` URL, or password-reset links will silently fall back to the bare homepage instead of the real confirm page (confirmed this exact failure mode once already, locally, before it was added there — same class of bug will happen again for the real domain if this is skipped).

### 5. Real accounts for real people

Every current admin/bank-staff login is a `.local` test fixture (`bankstaff1@test.local`, `TempPass123!`, etc.) — these should not be how real banks/admins sign in. Use the platform-manager portal (`/ops-control`) to create real regional admin accounts; bank-staff account creation still has no in-app flow at all (a known, documented gap — see `prompts/README.md`'s "Open decisions" item 1) and currently needs a script run directly against the database.

### 6. Production push keys

`.env.local`'s VAPID keys are dev keys. Generate real production ones before relying on push notifications for real users.

### 7. SMS/OTP provider — deliberately deferred to here, not skipped

Still has to happen before real launch — nothing works for a real donor or a real requester without this, phone OTP currently only works for 12 hardcoded local test numbers. Just not first. Research already done this project, don't redo it from scratch:
- **Twilio is NOT set up — explicitly paused/deferred, not abandoned.** There's a real but inert partial config already sitting in `supabase/config.toml` (`[auth.sms.twilio]`, `enabled = true`, a real Account SID and Auth Token in the gitignored `.env`) from earlier exploration — but `message_service_sid` is still the literal placeholder `"test_service_sid"`, so a real send would fail even if this path were ever reached, and `[auth.sms.test_otp]` short-circuits before Twilio's API is called at all regardless. **This is for later, specifically**: Twilio's *free trial* blocks India as a destination entirely (buying a number, Geo Permissions, verified recipients all gated behind upgrading) — confirmed live, not assumed — but a **paid** Twilio account would remove all of that and just work. The pivot to researching alternatives happened because a free option was wanted to test with immediately, not because Twilio itself is unusable. If the project owner would rather just add billing to the existing Twilio account than set up a different provider, that's a completely valid path back to finishing what's already partially there — don't treat the alternatives below as the only option.
- **Vonage, Fast2SMS, MSG91**: researched, none set up yet. **Fast2SMS was the standing recommendation** — real ₹50 free credit on signup, no DLT registration needed (routes internationally under the hood, bypassing India's domestic-SMS regulatory requirement), works immediately. Trade-off: not natively supported by Supabase's built-in SMS provider list, so wiring it in means writing a small custom "Send SMS" Auth Hook (a Supabase Edge Function) rather than a plain `config.toml` block — more setup than finishing Twilio would be, but doesn't require adding billing to get started.
- Ask the project owner to actually decide between "pay to finish Twilio" vs. "set up Fast2SMS/another free option" before doing either — don't assume which they want.

### 8. Backups + monitoring

Confirm backups are actually enabled on whatever Supabase plan gets chosen (varies by tier — check, don't assume). Set up at minimum Vercel's own built-in error tracking — right now there is no monitoring of any kind; if something breaks for a real user, nobody finds out unless that user complains.

## Things to actively avoid

- **Don't re-litigate decisions already made.** Fast2SMS as the SMS recommendation, Vercel for hosting, Supabase's own hosted tier for the database — these were reasoned through already. Only reopen one if the project owner raises a real new reason to.
- **Don't create real external accounts/pay for anything without the project owner doing it themselves** — Supabase, Vercel, a domain registrar, Fast2SMS all need *their* login/payment details, not something to work around.
- **If real credentials get pasted into the chat** (API keys, tokens, passwords) — same as happened with the Twilio/Brevo secrets earlier this project — flag that the value should be rotated once you're done with it, the same way that was handled before. Don't silently accept a secret typed into the conversation without saying anything.
- **Live-verify, don't just configure-and-assume.** Every piece of this project that's actually been wired up so far (Brevo, the persistent-session fix, the audit-log fix) was proven working with a real end-to-end test, not just "the code looks right." Hold deployment work to the same bar — after Vercel/Supabase are connected, actually load the real URL and click through a real flow before calling it done.
