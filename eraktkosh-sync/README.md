# eraktkosh-sync

Temporary, standalone tool that keeps `bank_stock` fresh automatically for
the 5 blood banks currently seeded (Sirsi x2, Kumta, Dandeli, Karwar),
instead of relying only on bank-staff manual entry. Not part of the
Next.js app in `frontend/` — nothing there imports this, and this has its
own `package.json`/dependencies so it never touches `frontend`'s own
dependency tree (same pattern as the sibling `image-gen/` tool).

Runs on a schedule via `.github/workflows/eraktkosh-sync.yml` (GitHub
Actions, not Vercel — a headless browser doesn't fit well as a Vercel
serverless cron function; GitHub's own runners already have everything
needed and this repo already lives there).

## Why this exists, and why it's temporary

`SPEC.md` originally marked "e-RaktKosh / automated stock sync" out of
scope (item I6), deferred until "manual entry decays" — the project owner
revisited that decision 2026-08-17 (see `eraktkosh_auto_sync.md` project
memory for the full history) because that's exactly what was happening.

The *real* fix is e-RaktKosh's own official API, published on
APISetu/UMANG — structured JSON, no scraping. Getting access requires (1)
a one-time platform approval on API Setu and (2) an Authorisation Letter
issued directly by e-RaktKosh/C-DAC for their specific API collection,
both currently in progress and outside this tool's control or timeline.

**This tool exists only to bridge that gap.** It drives a real headless
browser against e-RaktKosh's *public* stock-search page
(`eraktkosh.mohfw.gov.in/BLDAHIMS/bloodbank/stockAvailability.cnt`)
because that page has no plain HTTP endpoint — its result table is
populated by an obfuscated client-side request, confirmed live
2026-08-17. A real browser is the only way to read it.

## Swapping to the real API later

`src/scrape-source.mjs` exports `createScrapeSource()`, an object with one
method: `fetchDistrictStock({ state, district }) -> Promise<Reading[]>`.
`src/sync.mjs` only calls that method — it has no idea whether the data
came from a browser or a REST call. When real API credentials exist,
write `src/api-source.mjs` exporting `createApiSource()` with the
identical method shape (see the OpenAPI examples captured in
`eraktkosh_auto_sync.md` for the real request/response shape of
`stocknearbystate`/`stocknearbybcbg`), swap the one import line in
`sync.mjs`, and delete `scrape-source.mjs` and its `playwright` dependency
entirely. Nothing else in this tool, and nothing in `frontend/`, needs to
change.

## Adding a new bank

`src/bank-matching.mjs` hand-maps each of our 5 `blood_banks` rows to a
distinctive substring of e-RaktKosh's own listing name for that bank —
not e-RaktKosh's internal bank id (`h_code`), since getting that requires
the very API access this tool is working around. Add a new
`{ bankId, nameContains }` entry there for any bank added later, and
verify it live (search Karnataka → the bank's district on e-RaktKosh's
public page, confirm the name substring matches and nothing else does).

## Tiebreak rule

Confirmed with the project owner (2026-08-17): whichever of the existing
`bank_stock.updated_at` or e-RaktKosh's own reported `lastUpdate` is more
recent wins, regardless of whether the existing row was written by a real
bank-staff user or a previous sync run. See `src/sync.mjs`'s own header
comment.

## Local run

```bash
cp .env.example .env   # fill in SUPABASE_URL / SUPABASE_SECRET_KEY
npm install             # also downloads a Chromium build for Playwright
npm run sync
```

Requires Node 22+ (avoids the `--experimental-websocket` flag
`@supabase/supabase-js` needs on Node 20 — see
`frontend/scripts/create-platform-manager.mjs`'s own comment on this).
