# Unit 59 — Admin case ownership: Handle button, My Cases table, exclusive action lock

**Status:** Planned, not yet built. Written 2026-08-07 at the end of a long design conversation
that went through several wrong turns before landing here. Read the "Rejected alternatives"
section before proposing anything different — those paths were considered and explicitly
abandoned by the project owner, not overlooked.

**Milestone:** Post-58-unit-build ad hoc feature (same category as the platform-manager portal,
the admin-assign-to-bank feature, etc. — not part of the original numbered sequence's own plan,
but numbered here to fit this project's existing "prompts/NN-*.md describes the plan,
prompts/README.md logs what happened" convention).

**Depends on:** The admin-assign-to-bank feature built 2026-08-06 (`prospects.assigned_at`,
`assignProspectToBank`/`unassignProspectFromBank`, the inline expand-in-place prospects panel
currently living in `AdminQueueBoard.tsx`). Read that work first — this unit relocates and
gates it, it doesn't replace it.

## Anchor
Read CLAUDE.md first, follow it strictly. Read `[[project_build_state]]`'s entries for
2026-08-06/07 (admin-assign-to-bank feature + this planning conversation) before writing any
code — this file is the plan; that memory file has the full "why," including a bug found live
by the user (donor saw "no admin assigned" after Assign was clicked) that this unit is the real
fix for.

## Context — why this exists, in one paragraph
An admin clicked "Assign to bank" without ever clicking "Take ownership." The donor's own pledge
page still showed "not assigned yet," because Assign and ownership were completely unrelated
actions. Investigating surfaced a second, worse problem: `takeOwnership()` itself has **zero**
conflict guard today — any admin/coordinator in-region can silently take over (steal) any other
admin's already-owned request at any time; this is explicitly documented in that function's own
existing doc comment as intentional-at-the-time, and is exactly wrong now. This unit fixes both:
makes ownership a real, enforced, exclusive lock, and gives admins an actual UI path to claim
and work a case without that lock being trivially bypassable.

## Rejected alternatives — do not re-propose these
1. **Assign auto-claims ownership as a side effect.** Rejected — would defeat the deliberate
   "Needs an owner" alert (PRD's "every request has an owner once prospects exist" wants a human
   to *consciously* claim it, not have it happen invisibly as a side effect of something else).
2. **Many-to-many "multiple admins can each independently handle the same case."** Genuinely
   proposed by the user, worked through in real detail (a new join table, a "this case is already
   being handled, proceed anyway?" warning-not-block popup), then explicitly abandoned in favour
   of the simpler model below: **"i'm fine with one request having a single owner... that request
   becomes exclusive."** Do not build the join-table version.
3. **"Label only" ownership** (any admin/coordinator in-region can still act regardless of who
   owns it — ownership is cosmetic). This was the user's own answer to a direct question, then
   explicitly reversed two messages later. **Final answer is the opposite: exclusive lock.**

## Final design — confirmed with an explicit "yes"

### Data model: no migration
Reuses `requests.owner_admin_id` / `owner_assigned_at`, which already exist (M4 admin-ops
migration). **"Handle" is not a new mechanism — it is the existing "Take ownership" feature,
given a real lock and a better front door.** Confirm this is still true by checking
`lib/db/admin-requests.ts`'s `RequestRow` type already selects both columns (it does, as of
2026-08-06) before assuming a migration is needed.

### The lock itself
`takeOwnership()` currently (verify this hasn't drifted before editing):
```ts
export async function takeOwnership(caller: ActingAdmin, requestId: string): Promise<AdminActionResult> {
  const db = createDbClient();
  const request = await getScopedRequestRow(db, caller, requestId);
  if (!request) return { ok: false, reason: "not_found" };

  const now = new Date().toISOString();
  const { error } = await db
    .from("requests")
    .update({
      owner_admin_id: caller.profileId,
      owner_assigned_at: request.owner_assigned_at ?? now,
      admin_notified_at: request.admin_notified_at ?? now,
      updated_at: now,
    })
    .eq("id", requestId);
  if (error) throw error;

  return { ok: true };
}
```
Needs a guard: reject when `request.owner_admin_id` is already set to a **different** profile id
than `caller.profileId`. Re-clicking by the **same** already-owning admin must stay a harmless
no-op success (idempotent) — a stale page or double-click shouldn't error.

**Prefer a plain read-then-guarded-write over a combined `.or()` filter** — this codebase has an
established preference against combined `.or()` filters (`lib/db/pincodes.ts`'s `resolveLocation`,
`lib/db/matching.ts`'s two-sequential-reads reasoning) in favour of sequential, explicit checks.
`getScopedRequestRow` already reads `owner_admin_id` before this point — branch on what it
returns:
- `null` → proceed with the update, guarded by `.is("owner_admin_id", null)` on the write (re-check,
  not a pre-check-and-trust, matching `acceptProspect`/`assignProspectToBank`'s own pattern) —
  if the guarded write affects zero rows, someone beat this call to it; return `{ ok: false, reason: "conflict" }`.
- equals `caller.profileId` → return `{ ok: true }` immediately, no write needed.
- anything else (a different admin's id) → return `{ ok: false, reason: "conflict" }` without
  writing anything.

**Add audit logging** — `takeOwnership` doesn't call `writeAuditLog` today; it should now, since
this is a real, consequential lock, not a cosmetic label. New action string `"take_ownership"`,
entity_type `"request"`. New i18n key `adminPortal.auditLog.actionTakeOwnership` + a new case in
`AdminAuditLog.tsx`'s `actionLabel()` switch (mirrors how `actionAssignToBank` was added
2026-08-06 — same pattern, same file).

### The exclusive lock — what it actually restricts
Once `owner_admin_id` is set, **only that admin, or any coordinator** (coordinators already have
an existing district-wide override on A2, established Unit 39 — reuse that precedent, don't
invent a new one) may:
- `assignProspectToBank` / `unassignProspectFromBank`
- see/call the donor's phone (today's `getAdminRequestDetail` reveals it via `revealDonorContact`
  with zero ownership awareness at all)
- `standDownProspectByAdmin`
- `closeRequestByAdmin`
- `transferRequestToRegion` — **but only when the request is currently owned.** An unowned
  request has nothing to protect; transfer of an unowned request stays open to any admin/
  coordinator in-region exactly as today. Transfer's own existing behaviour of reassigning
  ownership to the receiving region's primary admin is unchanged — transfer is itself an
  ownership-transferring action by definition, not a stranger grabbing someone else's case.

**For a request with no owner yet, every action above stays open to any admin/coordinator
in-region, exactly as today.** The lock only activates once someone has actually clicked Handle —
otherwise a request with an accepted prospect but nobody yet in charge would become permanently
un-actionable by anyone, which is its own new bug.

**Implementation: one small shared helper** in `lib/db/admin-requests.ts`:
```ts
function canActOnOwnership(caller: ActingAdmin, request: { owner_admin_id: string | null }): boolean {
  if (caller.role === "coordinator") return true;
  if (request.owner_admin_id === null) return true;
  return request.owner_admin_id === caller.profileId;
}
```
Call it inside `assignProspectToBank`, `unassignProspectFromBank`, `standDownProspectByAdmin`,
`closeRequestByAdmin` right after the existing region-scope check (`getScopedRequestRow` already
resolves `request` with `owner_admin_id` in every one of these — confirmed present in `RequestRow`),
returning `{ ok: false, reason: "conflict" }` on failure — the same opaque `conflict` reason
already used everywhere else in this file for "can't do this right now," not a new distinguishable
value (CLAUDE.md rule 3's "never leak more than the recipient is entitled to" spirit extends
naturally here too: don't reveal *why* an action is blocked).
`transferRequestToRegion` calls the same helper unconditionally (it already returns `true` for the
unowned case, so no special-casing needed at the call site).

**Also gate the phone reveal itself, not just the write actions** — for the same defence-in-depth
reasoning already applied to `assigned_at`/the bank channel on 2026-08-06 (checking status alone
was not enough there; checking write-permission alone is not enough here either). Inside
`getAdminRequestDetail`, call `canActOnOwnership` before the `revealDonorContact("admin_prospect", ...)`
call for each prospect; on failure, treat it the same as `revealDonorContact` already returning
`null` (hide the phone, don't throw).

### UI changes

**A1 Request Queue (`AdminQueueBoard.tsx`) — revert to a plain table.**
- Remove the entire inline expand-in-place prospects panel added 2026-08-06 (the `Fragment`/
  `expandedId`/`detailByRequest`/`handleAssign`/`handleUnassign`/loading/error state, and the
  `<tr>` click-to-expand + panel `<tr>` rendering). This code **moves** to the new My Cases
  component below — it is not deleted from the app, just relocated.
- Remove the now-unused imports this leaves behind: `loadAdminRequestDetail`,
  `assignProspectToBankAction`, `unassignProspectFromBankAction`, `AdminRequestDetailView` type,
  `ProspectStatus` type, `useRouter` (unless still needed for the Handle confirm flow below — it
  is, keep it), `Fragment` (no longer needed once the expand panel is gone).
- Add one new last column. Header text is a detail, not a blocking decision — something like
  `t("adminPortal.queue.columnHandle")`.
  - `row.ownerName === null` → render a **Handle** button. `onClick` sets a local `confirmingId`
    state (mirror `AdminRequestDetail.tsx`'s own `closing` confirm-step pattern exactly — same
    inline "are you sure" shape, not a new interaction pattern) → shows an inline
    "Take ownership of this request? [Confirm] [Cancel]" → Confirm calls **the already-existing**
    `takeOwnershipAction(row.id)` from `lib/actions/admin-request-detail.ts` (no new action needed
    — this is the whole point of Handle being the same mechanism as Take Ownership) → on success,
    `router.refresh()` (this page now shows two server-fed tables; both need to reconcile the
    change — same staleness lesson already applied twice on 2026-08-06, applied here from the
    start rather than found as a bug afterward).
  - `row.ownerName !== null` → a plain, non-interactive label, e.g.
    `t("adminPortal.queue.columnHandleTaken")` ("Handled").
- `AdminQueueRow` (from `lib/db/requests.ts`) already exposes `ownerName` — no new field needed
  for this column.
- **Keep the existing "Owner" column and "Needs an owner" flag exactly as they are** — this is an
  additive change, nothing existing gets removed.

**New component — `components/admin/AdminMyCases.tsx`.** This is where the removed
expand-in-place block actually lands, pointed at a new data source:
- New read, `getMyCases(caller: ActingAdmin): Promise<AdminQueueRow[]>`, added to
  `lib/db/requests.ts` (the file that already owns `AdminQueueRow`/`getAdminQueue`/`OPEN_STAGES`
  — keep this new function there too, this codebase organizes `lib/db/` by table, not by
  feature). Query: `requests` where `owner_admin_id = caller.profileId` and `stage in OPEN_STAGES`.
  **Reuse `AdminQueueRow` as the return shape** (don't invent a second, near-identical type) so
  the row-rendering logic can be shared or at least kept structurally identical between both
  tables.
- Render: same table shape as the Queue, **plus** the expand-in-place row → panel (prospects:
  name, age, blood group, status, call button, assign/unassign) — this is a near-verbatim move of
  the code already built 2026-08-06, not a rewrite. The "Owner" column is redundant here (every
  row is already this admin's own) — drop it or keep it for visual consistency; genuinely a
  detail, decide when building.
- Empty state: `t("adminPortal.myCases.emptyMessage")` (e.g. "You don't have any active cases
  right now.").

**`app/admin/(portal)/page.tsx`** — fetch both `getAdminQueue(regionId)` and
`getMyCases(caller)` (parallel `Promise.all`, matching this codebase's existing pattern in this
same file). Render `<AdminQueueBoard .../>` then `<AdminMyCases .../>` stacked on the same page
— confirmed with the user: same page, not a separate nav tab.

**`AdminRequestDetail.tsx` (A2, `/admin/request/[id]`) — becomes read-only for a non-owning,
non-coordinator admin.**
- The component's existing `canAct` (`!CLOSED_STAGES.includes(detail.stage)`) needs to also
  reflect ownership. The component currently has no way to know "is the viewer the owner" —
  it's only ever given `ownerName` (a display string), not an id or a computed flag.
- **Add a server-computed `canAct: boolean` to `AdminRequestDetailView`** (in
  `lib/db/admin-requests.ts`), computed via the same `canActOnOwnership` helper inside
  `getAdminRequestDetail` (where `caller` is already in scope). Fold both the existing
  stage-based condition and the new ownership-based one into this single server-computed flag,
  rather than shipping two separately-derived booleans to the client and recombining them there
  — matches this codebase's existing preference for server-computed booleans over raw ids
  (`ownerName` itself is already resolved server-side the same way).
- `AdminRequestDetail.tsx` reads `detail.canAct` directly instead of deriving its own local
  `canAct` constant.
- The existing "Take ownership" button block (rendered when `!detail.ownerName`) needs no new UI
  — it already handles a race gracefully (`takeOwnershipAction` returning `{ok:false}` → the
  existing generic `actionError` message). Just confirm this still holds once the new guard
  exists; it will.

### i18n — new keys needed, both `en.ts` and `kn.ts`, plus the shared `Dictionary` type
- `adminPortal.queue.columnHandle` (column header — check whether other unlabelled action
  columns in this same table already go header-less before deciding this needs real text)
- `adminPortal.queue.handleButton` ("Handle")
- `adminPortal.queue.handleTakenLabel` ("Handled")
- `adminPortal.queue.confirmHandleMessage` ("Take ownership of this request?")
- Confirm/Cancel button text for the popup — **check first whether a generic pair already exists
  project-wide before adding new ones** (e.g. `adminPortal.requestDetail.closeConfirmButton`/
  `closeBackButton` are close but request-close-specific wording; a bare generic "Confirm"/"Cancel"
  may already exist somewhere reusable — grep before adding near-duplicates).
- `adminPortal.myCases.title` ("My cases")
- `adminPortal.myCases.emptyMessage`
- `adminPortal.auditLog.actionTakeOwnership` ("Took ownership") + new switch case in
  `AdminAuditLog.tsx`'s `actionLabel()`
- A message for A2's new read-only state when a non-owner lands there directly — e.g.
  `adminPortal.requestDetail.notYourCaseMessage` ("Owned by another admin — you can view this
  request but can't act on it.") — exact copy is a detail, decide when building.

### Edge cases — already resolved during planning, implement directly, do not re-derive
| # | Case | Resolution |
|---|---|---|
| 1 | Two admins click Handle on the same request within the same moment | DB-level guarded write (`.is("owner_admin_id", null)` re-checked on write), loser gets `conflict` |
| 2 | Handle clicked on a request that's since closed/deleted | `getScopedRequestRow` already returns `null` → `not_found`, unchanged existing behaviour |
| 3 | Same admin re-clicks Handle on their own already-owned case | Idempotent success, no error, no duplicate write |
| 4 | Network failure mid-confirm | Standard existing error-state handling (`actionError`), no special case |
| 5 | Transfer to another region, on an **owned** request | Requires being the current owner (or coordinator) — gated via `canActOnOwnership` |
| 6 | Transfer to another region, on an **unowned** request | Stays open to any admin/coordinator in-region — nothing to protect |
| 7 | Coordinator (no home region) | Sees no Queue at all today (pre-existing, unchanged) — but retains full override on any region's owned request via A2/My-Cases-equivalent access, matching existing Unit 39 precedent |
| 8 | Request with an accepted prospect but no owner yet | Every action stays open to any admin/coordinator in-region — the lock only activates once someone has actually clicked Handle |
| 9 | Escalation engine notifying a secondary admin/coordinator | Unaffected — escalation only ever notifies, never reassigns ownership, both before and after this unit |
| 10 | Non-owning admin navigates directly to `/admin/request/[id]` via an old link | Page loads, but `canAct` is now `false` — read-only, no action buttons render |
| 11 | Does this need a DB migration | No — `owner_admin_id`/`owner_assigned_at` already exist |
| 12 | Does this widen any existing access (CLAUDE.md rule 1 risk) | No — every change narrows/gates existing open access, never widens it |
| 13 | Known gap, explicitly out of scope for this unit | No "release ownership" or "hand off to another admin" mechanism exists once a case is claimed, other than region-transfer (which changes region too). Flagged for future work, not built now — do not add this without asking first, it wasn't part of what was requested |

### Testing plan — mirror the exact rigor already used for the 2026-08-06 assign-to-bank feature
1. `npm run lint` clean (`eslint` + `tsc --noEmit`).
2. Mechanical security scan (`python scan.py frontend` from repo root, global path — see
   `[[project_environment_gotchas]]`) — trace every new/shifted finding to its actual source line,
   don't just pattern-match against known false-positive categories.
3. **Direct server-function edge-case testing via `npx tsx`** — do not rely on UI-only testing for
   the ownership-lock cases (race between two admins, coordinator override, unowned-request open
   access, transfer-of-owned-vs-unowned). Call `takeOwnership`/`assignProspectToBank`/etc. directly
   with hand-built `ActingAdmin` objects, exactly like the 2026-08-06 edge-case script did. See
   `[[project_environment_gotchas]]` for the exact env-var-export + `--experimental-websocket`
   setup this needs, and write cleanup into a `.finally()` block from the start.
4. Live Playwright verification with **two real admin sessions at once** (reuse the
   `admin1@test.local` pattern + a second real seeded admin, or create one if needed) confirming:
   admin A takes a case via Handle → admin B cannot act on it (button gone from Queue, action
   attempts rejected, direct A2 link is read-only) → a coordinator session CAN still act on admin
   A's case → the donor's own pledge page shows admin A's real name/phone once Handle succeeds
   (this is the original bug this whole unit fixes — verify it directly, not just infer it from
   the code).
5. Full `npm run test` (60/60 baseline as of 2026-08-06 — confirm this hasn't drifted before
   assuming it's still 60) unaffected.
6. Clean up every fixture, confirm a 0-row baseline for anything created, update
   `[[project_build_state]]` with what shipped — same discipline as every other unit.

## Verify when done
- [ ] `takeOwnership` rejects a second, different admin; accepts the same admin idempotently
- [ ] `assignProspectToBank`/`unassignProspectFromBank`/`standDownProspectByAdmin`/
      `closeRequestByAdmin` all reject a non-owning, non-coordinator admin
- [ ] `transferRequestToRegion` rejects a non-owner on an owned request, stays open on an unowned one
- [ ] Phone reveal in `getAdminRequestDetail` is also gated, not just the write actions
- [ ] A1 Queue has no dropdown/call/assign left in it at all — plain table + the new last column
- [ ] My Cases shows only this admin's own open-stage owned requests, with the full prospects panel working exactly as it did in the Queue before this unit
- [ ] A2 is genuinely read-only (no action buttons render, not just disabled) for a non-owner
- [ ] Donor's pledge page shows a real admin name/phone after Handle, verified live, not assumed
- [ ] No migration was added (confirms the "no schema change" plan held)
- [ ] Every new string has both `en` and `kn`
- [ ] `npm run lint` / `npm run test` both clean
- [ ] Mechanical scan + judgment checklist both reported before any fix, per the security-review skill's own rule
