# 61 — Go live: infrastructure, hosting, and the last real blockers

**Handoff context for a fresh session.** Written 2026-08-10. The app itself is in good shape — feature-complete, a full security review passed clean (0 blockers/0 warnings, `prompts/60-final-security-review.md`), a real audit-log gap found and fixed the same day. Real geography and blood bank data are seeded. **None of that is reachable by anyone except the project owner, on their own laptop.** Everything — the app, the database — only runs inside local Docker + a local dev server. This file is about closing that gap: the project owner wants to open this to real users, target ~100-200/day.

## Read first

- `CLAUDE.md` — operating rules, read fully before touching anything. Its "Git history" note (under Commands) explains a real quirk you'll hit immediately: this repo's commit history before 2026-08-09 is a same-day retroactive reconstruction, not real incremental history. Don't be thrown by it.
- `FUTURE-WORK.md` — what's deliberately deferred and why. The project owner has explicitly said to leave the privacy-policy grievance contact and `app_settings` escalation timing values alone for now — don't re-raise them unprompted.
- `prompts/README.md`'s tail end (the "Post-M6 work" section) for a chronological summary of everything since the original 58-unit build.

## The order that actually matters

These gate each other — do them roughly in this sequence, not in parallel:

### 1. SMS/OTP provider — the single biggest remaining blocker

Nothing works for a real donor or a real requester without this — phone OTP currently only works for 12 hardcoded local test numbers. Research already done this project, don't redo it from scratch:
- **Twilio**: dead end for this use case. Their free trial flatly blocks India as a destination for *everything* — buying a number, enabling Geo Permissions, adding verified recipients are all gated behind upgrading to a paid account. Confirmed live, not assumed.
- **Vonage, Fast2SMS, MSG91**: researched, none set up yet. **Fast2SMS was the standing recommendation** — real ₹50 free credit on signup, no DLT registration needed (routes internationally under the hood, bypassing India's domestic-SMS regulatory requirement), works immediately. Trade-off: not natively supported by Supabase's built-in SMS provider list, so wiring it in means writing a small custom "Send SMS" Auth Hook (a Supabase Edge Function) rather than a plain `config.toml` block — more setup than Twilio would have been, but Twilio isn't usable here at all on a free tier.
- Don't re-relitigate this decision without a real reason to — ask the project owner to confirm Fast2SMS (or pick differently) and get credentials, then wire it in.

### 2. Get this project onto GitHub

`git remote -v` returns nothing — confirmed, this repo has never been pushed anywhere. Needed both as a real backup (right now the *only* copy of this code is the project owner's laptop) and because Vercel's normal deployment flow expects a GitHub repo to deploy from. Create a repo, push.

### 3. A real hosted Supabase project

Sign-up is free, no card required. Concretely: create a project via their dashboard (name, region — pick the AWS region closest to India), then `supabase link` to connect the local CLI to it, `supabase db push` to apply every migration in `supabase/migrations/` (recreates every table/RLS policy for real), then apply `supabase/seed.sql` by hand (not automatic for a hosted project the way local `supabase start` seeds it) to load the real geography/bank data. `supabase config push` pushes `config.toml`'s settings (including the Brevo SMTP block) to the hosted project — confirmed this is a real command, not a guess.

Free tier (confirmed 2026-08-09): 500MB DB storage, 50k monthly active users, 1GB file storage, 5GB bandwidth, unlimited API requests — comfortably enough for 100-200 users/day. One real quirk: a free project auto-pauses after 7 days with zero DB requests — irrelevant once real traffic exists, relevant if this gets set up and then sits untouched for a week before launch.

### 4. Vercel + domain

Connect Vercel to the new GitHub repo. Set real environment variables there (new Supabase project URL + new API keys — **never** the local dev ones, and the service-role/secret key must never be committed to the repo, same as it never has been). Buy a real domain, point it at the Vercel deployment.

### 5. Re-point what's still pointing at localhost

`supabase/config.toml`'s `[auth] additional_redirect_urls` currently only lists `localhost`/`127.0.0.1` — add the real domain's `/forgot-password/confirm` URL, or password-reset links will silently fall back to the bare homepage instead of the real confirm page (confirmed this exact failure mode once already, locally, before it was added there — same class of bug will happen again for the real domain if this is skipped).

### 6. Real accounts for real people

Every current admin/bank-staff login is a `.local` test fixture (`bankstaff1@test.local`, `TempPass123!`, etc.) — these should not be how real banks/admins sign in. Use the platform-manager portal (`/ops-control`) to create real regional admin accounts; bank-staff account creation still has no in-app flow at all (a known, documented gap — see `prompts/README.md`'s "Open decisions" item 1) and currently needs a script run directly against the database.

### 7. Production push keys

`.env.local`'s VAPID keys are dev keys. Generate real production ones before relying on push notifications for real users.

### 8. Backups + monitoring

Confirm backups are actually enabled on whatever Supabase plan gets chosen (varies by tier — check, don't assume). Set up at minimum Vercel's own built-in error tracking — right now there is no monitoring of any kind; if something breaks for a real user, nobody finds out unless that user complains.

## Things to actively avoid

- **Don't re-litigate decisions already made.** Fast2SMS as the SMS recommendation, Vercel for hosting, Supabase's own hosted tier for the database — these were reasoned through already. Only reopen one if the project owner raises a real new reason to.
- **Don't create real external accounts/pay for anything without the project owner doing it themselves** — Supabase, Vercel, a domain registrar, Fast2SMS all need *their* login/payment details, not something to work around.
- **If real credentials get pasted into the chat** (API keys, tokens, passwords) — same as happened with the Twilio/Brevo secrets earlier this project — flag that the value should be rotated once you're done with it, the same way that was handled before. Don't silently accept a secret typed into the conversation without saying anything.
- **Live-verify, don't just configure-and-assume.** Every piece of this project that's actually been wired up so far (Brevo, the persistent-session fix, the audit-log fix) was proven working with a real end-to-end test, not just "the code looks right." Hold deployment work to the same bar — after Vercel/Supabase are connected, actually load the real URL and click through a real flow before calling it done.
