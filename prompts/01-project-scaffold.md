# Unit 01 — Project scaffold

**Milestone:** M1
**Depends on:** none

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §2 (Technical stack), §3 (folder tree), CLAUDE.md "Conventions".

## Task
Initialize the Next.js 15 App Router + TypeScript + Tailwind project. Create the
folder skeleton from CLAUDE.md's Conventions section (`app/(public)/`,
`app/donor/`, `app/bank/`, `app/admin/`, `app/api/`, `lib/db/`,
`lib/serialise/`, `lib/i18n/`, `supabase/migrations/`) as empty directories.
Wire up `npm run dev`, `npm run build`, `npm run lint` (eslint + `tsc --noEmit`),
`npm run test` (vitest). Add `.env.example` listing every env var named in
PRD.md §2, with no real values.

## Read before writing
None yet — this is the first unit.

## Constraints
9. **No new infrastructure.** No Redis, no queue service, no search engine.
Scheduled work uses `pg_cron`/`pg-boss`. This is maintained by volunteers —
every moving part is a liability.
Scope limit: no schema, no auth, no real screens. A blank home page is enough.

## Reference
PRD.md §2, §3. CLAUDE.md "Commands" and "Conventions" sections.
Paste current docs for Next.js 15 App Router before implementing. Do not rely
on training data for the exact CLI scaffold flags.

## Verify when done
- [ ] `npm run dev` serves a blank page with no console errors
- [ ] `npm run build` succeeds; folder skeleton matches CLAUDE.md exactly
- [ ] `.env.example` lists every var named in PRD.md §2 with no real values
- [ ] existing features still work
- [ ] npm run lint passes
