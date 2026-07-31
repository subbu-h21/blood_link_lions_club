# Blood Donor Platform — Product Requirements Document

**Version:** 1.0
**Status:** Ready for implementation
**Companion document:** `blood-donor-platform-spec.md` (product logic, event timelines, edge case decisions)

This PRD is written to be built from directly. Where a decision is still open, it is marked **[DECIDE]** rather than guessed at.

---

## 1. Overview

### 1.1 Problem

When a patient needs blood, the family has two possible sources: a blood bank that already has the unit, or a donor who can produce one. Today both are found by phoning around. The first is a lookup problem; the second is a coordination problem, and coordination is what fails.

### 1.2 Solution

A region-scoped platform with four separate portals. The software handles lookup, matching and notification. A named regional admin handles all human coordination from the moment a donor responds.

### 1.3 Goals

| Goal | Measure |
|---|---|
| Reduce time to find blood | Median request → first donor acceptance |
| Make donor mobilisation reliable | Prospects per successful donation |
| Keep donors engaged long-term | Decline and ignore rates over time |
| Give admins leverage, not more phone calls | Cases handled per admin per hour |

### 1.4 Non-goals for v1

Automated medical screening. In-app messaging. GPS or distance sorting. Platelets and plasma. Native mobile apps. Camps management. Automated cross-region escalation.

Full list with revisit triggers: spec §7.

### 1.5 Launch scope

One region (Sirsi), whole blood only, English and Kannada.

---

## 2. Technical stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 15, App Router, TypeScript | Server routes are required — the browser must never hold elevated DB access |
| Database | Postgres (Supabase) | Already known to the team |
| DB access | **Server-side only**, service role key in server env | RLS stays enabled as defence in depth, not as primary access control |
| Auth | Phone + OTP | Everyone has a phone; email is not universal in the launch region |
| Styling | Tailwind CSS | |
| Notifications v1 | Web Push (VAPID) from PWA | Free, instant, no registration queue |
| Notifications v2 | WhatsApp Business API | Requires approved templates; verification takes weeks — start early, off critical path |
| Scheduled jobs | `pg_cron` or Vercel Cron → protected route | Escalation timers and expiry |
| Hosting | Vercel | CDN and edge caching included |

**Hard rule:** no client component may query the database directly. All reads and writes go through `/api` route handlers or server actions.

---

## 3. Roles and portals

Four separate route trees, four separate navigation shells, four separate login states.

| Portal | Path | Auth | Who |
|---|---|---|---|
| Searcher | `/` | None to search; OTP to raise request | Public |
| Donor | `/donor` | Phone OTP | Registered donors |
| Blood bank | `/bank` | Phone OTP, staff account | Verified bank staff |
| Admin | `/admin` | Phone OTP, elevated | Regional volunteers |

```
app/
  (public)/          → searcher
  (donor)/donor/
  (bank)/bank/
  (admin)/admin/
  api/
```

A single `profiles.role` column drives portal access. Middleware rejects cross-portal access server-side; hiding nav links is not sufficient.

---

## 4. Data model

### 4.1 Geography

```sql
regions (
  id            uuid pk,
  name          text not null,          -- "Sirsi"
  district      text not null,
  state         text not null,
  created_at    timestamptz default now()
)

pincodes (
  code          text pk,                -- "581402"
  region_id     uuid fk → regions,
  office_name   text,                   -- for town-name search
  taluk         text,
  district      text
)

region_adjacency (
  region_id           uuid fk → regions,
  neighbour_region_id uuid fk → regions,
  primary key (region_id, neighbour_region_id)
)
```

**Constraint:** every region must contain ≥1 blood bank. Enforce in seed validation, not in schema.

### 4.2 Identity

```sql
profiles (
  id            uuid pk,                -- = auth user id
  phone         text unique not null,
  full_name     text not null,
  role          text not null check (role in
                  ('searcher','donor','bank_staff','admin','coordinator')),
  region_id     uuid fk → regions null,
  bank_id       uuid fk → blood_banks null,   -- bank_staff only
  is_blocked    boolean default false,
  created_at    timestamptz default now()
)
```

### 4.3 Donors

```sql
donors (
  id                  uuid pk fk → profiles,
  blood_group         text not null check (blood_group in
                        ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  group_verified_at   timestamptz null,     -- set by bank on confirmed donation
  dob                 date not null,        -- age gate 18–65
  sex                 text null,
  pincode             text fk → pincodes,
  region_id           uuid fk → regions,
  is_available        boolean default true,
  paused_until        timestamptz null,
  last_donation_at    timestamptz null,
  eligible_from       timestamptz null,     -- last_donation_at + cooldown
  notif_count_month   int default 0,
  notif_month         date,                 -- month the counter belongs to
  last_confirmed_at   timestamptz,          -- periodic PIN re-confirmation
  deleted_at          timestamptz null,
  created_at          timestamptz default now()
)
```

### 4.4 Blood banks

```sql
blood_banks (
  id            uuid pk,
  name          text not null,
  region_id     uuid fk → regions,
  pincode       text fk → pincodes,
  address       text not null,
  phone         text not null,
  licence_no    text,
  policy_notes  text,                    -- admin-visible only
  opening_hours jsonb,                   -- { mon: ["09:00","17:00"], ... }
  is_verified   boolean default false,
  is_active     boolean default true,
  created_at    timestamptz default now()
)

bank_stock (
  id            uuid pk,
  bank_id       uuid fk → blood_banks,
  blood_group   text not null,
  component     text not null default 'whole_blood',
  units         int not null check (units >= 0),
  updated_at    timestamptz not null default now(),
  updated_by    uuid fk → profiles,
  unique (bank_id, blood_group, component)
)

bank_shortages (
  id            uuid pk,
  bank_id       uuid fk → blood_banks,
  blood_group   text not null,
  units_needed  int not null,
  is_active     boolean default true,
  created_at    timestamptz default now(),
  resolved_at   timestamptz null
)
```

### 4.5 Requests and prospects

```sql
requests (
  id                  uuid pk,
  requester_phone     text not null,
  requester_profile_id uuid fk → profiles,
  patient_name        text null,          -- optional, minimal by design
  blood_group         text not null,
  component           text default 'whole_blood',
  units_needed        int not null check (units_needed between 1 and 10),
  destination_bank_id uuid fk → blood_banks,
  region_id           uuid fk → regions,
  urgency             text check (urgency in ('normal','emergency')),
  stage               text not null check (stage in
                        ('finding_prospects','evaluating_prospects',
                         'scheduled','resolved','closed')),
  close_reason        text null check (close_reason in
                        ('found_elsewhere','no_longer_needed',
                         'no_donor_found','expired','abusive')),
  owner_admin_id      uuid fk → profiles null,
  admin_notified_at   timestamptz null,
  escalated_at        timestamptz null,
  expires_at          timestamptz not null,
  resolved_at         timestamptz null,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
)

prospects (
  id            uuid pk,
  request_id    uuid fk → requests,
  donor_id      uuid fk → donors,
  status        text not null check (status in
                  ('invited','accepted','screening','donated',
                   'rejected','no_show','stood_down')),
  invited_at    timestamptz default now(),
  responded_at  timestamptz null,
  screened_at   timestamptz null,
  outcome_at    timestamptz null,
  admin_notes   text null,
  unique (request_id, donor_id)
)
```

**Partial unique indexes — these enforce the two critical invariants:**

```sql
-- one open request per phone number
create unique index one_open_request_per_phone
  on requests (requester_phone)
  where stage not in ('resolved','closed');

-- one active pledge per donor
create unique index one_active_pledge_per_donor
  on prospects (donor_id)
  where status in ('accepted','screening');
```

### 4.6 Operations

```sql
admin_rota (
  id            uuid pk,
  region_id     uuid fk → regions,
  admin_id      uuid fk → profiles,
  priority      int not null,            -- 1 = primary, 2 = secondary
  is_active     boolean default true
)

notifications (
  id            uuid pk,
  donor_id      uuid fk → donors,
  request_id    uuid fk → requests null,
  shortage_id   uuid fk → bank_shortages null,
  channel       text,                    -- 'web_push' | 'whatsapp' | 'sms'
  sent_at       timestamptz default now(),
  delivered_at  timestamptz null,
  responded_at  timestamptz null
)

audit_log (
  id            uuid pk,
  actor_id      uuid fk → profiles,
  action        text not null,           -- 'view_contact', 'close_request', ...
  entity_type   text not null,
  entity_id     uuid,
  metadata      jsonb,
  created_at    timestamptz default now()
)

reports (
  id            uuid pk,
  reporter_id   uuid fk → profiles,
  subject_id    uuid fk → profiles,
  reason        text not null,
  details       text,
  status        text default 'open',
  created_at    timestamptz default now()
)
```

### 4.7 Reference: red cell compatibility

A recipient of group X can receive from:

| Recipient | Compatible donors |
|---|---|
| O− | O− |
| O+ | O−, O+ |
| A− | O−, A− |
| A+ | O−, O+, A−, A+ |
| B− | O−, B− |
| B+ | O−, O+, B−, B+ |
| AB− | O−, A−, B−, AB− |
| AB+ | all |

**Warning for future work:** plasma compatibility is the inverse of this table. If plasma is ever added, write a second table — do not extend this one.

---

## 5. Permissions matrix

| Action | Searcher | Donor | Bank staff | Admin |
|---|---|---|---|---|
| Search bank stock | ✅ | ✅ | ✅ | ✅ |
| Raise request | ✅ (OTP) | ✅ | ❌ | ✅ (on behalf) |
| View own request status | ✅ | ✅ | ❌ | ✅ (all in region) |
| Close own request | ✅ | ✅ | ❌ | ✅ |
| See donor name | ❌ | ❌ | ✅ (assigned only) | ✅ (region) |
| See donor phone | ❌ | ❌ | ✅ (assigned only) | ✅ (region, audited) |
| Accept a request | ❌ | ✅ | ❌ | ❌ |
| Update bank stock | ❌ | ❌ | ✅ (own bank) | ✅ |
| Post shortage | ❌ | ❌ | ✅ (own bank) | ✅ |
| Confirm donation | ❌ | ❌ | ✅ | ✅ (by phone) |
| Assign / schedule prospect | ❌ | ❌ | ❌ | ✅ |
| Transfer request to region | ❌ | ❌ | ❌ | ✅ |
| Verify / suspend bank | ❌ | ❌ | ❌ | ✅ |
| Block user | ❌ | ❌ | ❌ | ✅ |
| View audit log | ❌ | ❌ | ❌ | ✅ coordinator only |

**Enforce every row server-side.** Client-side gating is presentation only.

---

## 6. Portal 1 — Blood searcher

### 6.1 Screens

**S1 · Search** `/`
- Input: PIN code **or** town name (autocomplete against `pincodes.office_name`)
- Select: blood group, component
- Resolves to region; shows region name for confirmation

**S2 · Results** `/search`
- Blood bank cards: name, address, phone (tap to call), distance-free
- Per-group stock table with **age label on every figure** ("updated 3 h ago")
- Stock older than threshold rendered greyed with explicit age
- Open/closed badge from `opening_hours`
- Adjacent region chips: *"Also check: Siddapur · Yellapur"*
- Persistent CTA: **"Can't find blood? Raise a request"**

**S3 · Bank detail** `/bank/[id]`
- Full stock table, address, call button, hours

**S4 · Raise request** `/request/new`
- Phone + OTP verification first
- Fields: blood group, component, units, destination bank (dropdown of region banks), urgency, optional patient first name
- Blocks with a clear message if an open request already exists for that phone

**S5 · Request status** `/request/[id]`
- Current stage in plain language, not enum names
- Counts: donors notified, donors accepted
- Admin name and phone once assigned
- **Never shows donor phone numbers**
- Buttons: *Contact admin*, *Cancel request* (reason required)

### 6.2 Rules

| Rule | Behaviour |
|---|---|
| Search is free | No auth, no rate limit beyond basic abuse protection |
| Searching never notifies anyone | Browsing regions is not broadcasting |
| One open request per phone | Enforced by partial unique index |
| Zero matching donors | Admin notified immediately, honest message shown to requester |
| Idle request | "Still needed?" prompt at 12 h, auto-close at 48 h **[DECIDE]** |
| Every search logged | Even when no request follows — measures tier 1 value |

---

## 7. Portal 2 — Donor

### 7.1 Screens

**D1 · Register** `/donor/register`
- Phone + OTP, full name, date of birth, blood group, PIN code
- Explicit consent checkbox with accurate wording — see §11.2
- Rejects DOB outside 18–65 with a clear message

**D2 · Home** `/donor`
- Eligibility state: available, or cooldown with date they become eligible again
- Availability toggle, pause control
- Active pledge card if one exists

**D3 · Request detail** `/donor/request/[id]`
- Blood group needed, destination bank, urgency, region
- Three buttons: **I can donate** · **Not now** · **Not for a while** (pauses N days)
- Shows "already handled, thank you" if the request has closed

**D4 · Active pledge** `/donor/pledge`
- Destination bank name, address, phone, time window
- Admin name and contact
- Cancel pledge option

**D5 · History** `/donor/history`
- Past confirmed donations, next eligible date

**D6 · Settings** `/donor/settings`
- Edit blood group, PIN code, name
- Pause notifications
- **Delete account** — hard requirement, not optional

### 7.2 Matching rules

A donor is eligible for a request when **all** hold:

1. `donors.blood_group` is compatible with `requests.blood_group` (§4.7)
2. `donors.region_id = requests.region_id`
3. `is_available = true` and `paused_until` is null or past
4. `eligible_from` is null or past
5. `deleted_at` is null, profile not blocked
6. `notif_count_month` below monthly cap **[DECIDE — suggest 6]**
7. Donor has no active pledge

Order by: previously reliable donors first, then least recently notified.

### 7.3 Rules

| Rule | Behaviour |
|---|---|
| One active pledge | Enforced by partial unique index |
| Notification budget | Counter resets monthly; excluded from matching when exhausted |
| Failed screening | Never penalised, never affects ranking |
| No-show | Affects internal ranking only, never shown to the donor |
| Stood down | Always receives a warm thank-you — **never silence** |
| Cooldown | Set from `last_donation_at` on bank confirmation only |
| Stale PIN | Re-confirmation prompt every 6 months **[DECIDE]** |

---

## 8. Portal 3 — Blood bank

### 8.1 Screens

**B1 · Stock dashboard** `/bank`
- Grid: 8 blood groups × component
- Inline edit, one-tap increment/decrement
- Prominent `updated_at` per row
- Banner if any row is older than the freshness threshold

**B2 · Post shortage** `/bank/shortage`
- Select group and units needed → notifies eligible donors in region
- Active shortages list with resolve action

**B3 · Incoming prospects** `/bank/prospects`
- Donors scheduled to attend: name, phone, blood group, request reference
- Actions per prospect: **Arrived (screening)** → **Donated** / **Rejected** / **No show**

**B4 · Confirm donation** `/bank/prospects/[id]/confirm`
- Confirms or corrects the donor's blood group — sets `group_verified_at`
- Sets `last_donation_at` and `eligible_from`
- This is the **only** trusted path for these fields

**B5 · Profile** `/bank/settings`
- Opening hours, address, phone, policy notes

### 8.2 Rules

| Rule | Behaviour |
|---|---|
| Stock always timestamped | `updated_at` written on every save, no exceptions |
| Stale stock never hidden | Greyed and labelled, still visible |
| Donation confirmation is authoritative | No other path may write `last_donation_at` |
| Bank staff see assigned prospects only | Not the regional donor list |
| Bank must be verified | `is_verified = false` accounts cannot post stock publicly |

---

## 9. Portal 4 — Admin

### 9.1 Screens

**A1 · Queue** `/admin`
- All open requests in region
- Columns: age, urgency, stage, blood group, prospects count, owner
- Sort: urgency then age. Filter by stage
- Visual flag on requests past escalation threshold

**A2 · Request detail** `/admin/request/[id]`
- Requester contact, patient details, destination bank
- Prospect list with each status and timestamps
- Actions: **take ownership**, **call donor**, **schedule**, **stand down prospect**, **transfer region**, **close (reason required)**
- Full event timeline of the request

**A3 · Donor lookup** `/admin/donors`
- Search regional donors by blood group and availability
- Contact reveal is **audit-logged on every view**

**A4 · Bank management** `/admin/banks`
- Verify, suspend, edit policy notes

**A5 · Moderation** `/admin/reports`
- Open reports, block user, review flagged accounts

**A6 · Audit log** `/admin/audit` — coordinator role only

### 9.2 Escalation engine

Runs on a schedule (cron → protected route). All values **[DECIDE]**.

| Trigger | Condition | Action |
|---|---|---|
| No prospect | Request in `finding_prospects` > 20 min (0 min if emergency) | Notify primary admin |
| Prospect appeared | Any prospect → `accepted` | Notify primary admin immediately |
| Zero donors matched | At request creation, no eligible donors | Notify primary admin immediately |
| Admin inaction | Notified > 15 min, no ownership taken | Notify secondary admin |
| Secondary inaction | Further 15 min | Notify district coordinator |
| Idle request | No activity 12 h | "Still needed?" to requester |
| Expiry | 48 h | Auto-close with reason `expired` |

### 9.3 Rules

| Rule | Behaviour |
|---|---|
| Every request has an owner once prospects exist | Unowned requests are an alert condition |
| Contact views audited | `audit_log` entry per view, no exceptions |
| Transfer moves ownership | Receiving region's primary admin becomes owner; logged |
| Close requires reason | No silent closes |
| Admins are region-scoped | Cannot see other regions except via transfer |

---

## 10. Notifications

### 10.1 v1 — Web Push

- Service worker registered on donor registration
- VAPID keys in server env
- Payload: blood group, destination bank, urgency, deep link to D3
- Delivery outcome written to `notifications`

### 10.2 v2 — WhatsApp Business

- Pre-approved template with quick-reply buttons (`I can donate` / `Not now`)
- Free-form messaging allowed for 24 h after a donor replies
- Business verification takes weeks — begin the process during v1 build

### 10.3 Constraint

The bot does **broadcast and buttons only**. The eligibility conversation — recent illness, last donation, whether they have eaten — stays with the admin. Do not let a chatbot creep into this.

---

## 11. Compliance

### 11.1 Requirements

- Consent record stored with timestamp and version of consent text
- Privacy notice reachable from every portal
- Working account deletion for donors
- Named grievance contact published
- Audit log of admin access to personal data
- Data minimisation: no medical detail beyond blood group and component

### 11.2 Consent wording

Must accurately state that data is stored on a server, that a donor's name and blood group become visible to regional admins and blood banks, and that their phone number is shared **only after they accept a request**.

The old "stored only in your browser" wording must not survive into this build.

### 11.3 Prohibited

Selling or buying blood is illegal in India. Terms of service must prohibit it explicitly, and the report mechanism must accept it as a reason.

---

## 12. Acceptance criteria

### Epic 1 — Geography and seed
- [ ] Every PIN code in the launch district resolves to exactly one region
- [ ] Every region contains ≥1 verified blood bank
- [ ] Adjacency is symmetric — if A neighbours B, B neighbours A
- [ ] Town-name search returns the correct region

### Epic 2 — Search
- [ ] Search with a valid PIN returns banks in that region only
- [ ] Every stock figure displays an age label
- [ ] Stock past threshold is visibly greyed, not hidden
- [ ] Closed banks show a closed badge
- [ ] Searching creates **zero** notification rows
- [ ] Adjacent region chips navigate without broadcasting

### Epic 3 — Requests
- [ ] Raising a request requires a verified OTP
- [ ] Second open request from the same phone is rejected with a clear message
- [ ] Request with zero eligible donors notifies an admin immediately
- [ ] Requester never sees a donor phone number at any stage
- [ ] Cancelling requires a reason and stands down all prospects
- [ ] Idle request auto-closes with reason `expired`

### Epic 4 — Donors
- [ ] DOB outside 18–65 is rejected at registration
- [ ] Donor in cooldown receives no notifications
- [ ] Donor cannot accept a second request while a pledge is active
- [ ] Accepting reveals destination bank and admin contact
- [ ] Late acceptance shows "already handled", never dispatches
- [ ] Stood-down donors receive a thank-you message
- [ ] Account deletion removes the donor and stands down any pledge
- [ ] Notification cap excludes a donor once exhausted

### Epic 5 — Blood bank
- [ ] Stock save always writes `updated_at`
- [ ] Only bank staff of that bank can edit its stock
- [ ] Donation confirmation sets `last_donation_at`, `eligible_from`, `group_verified_at`
- [ ] No other code path writes those three fields
- [ ] Shortage notifies only eligible donors in that region
- [ ] Rejected prospect returns the request to `finding_prospects` when no other prospect is live

### Epic 6 — Admin
- [ ] Queue shows only that admin's region
- [ ] Every contact reveal writes an audit row
- [ ] Escalation fires at configured thresholds
- [ ] Unowned request with prospects raises an alert
- [ ] Transfer reassigns ownership and logs it
- [ ] Close without reason is rejected

### Epic 7 — Security
- [ ] No client component queries the database directly
- [ ] Every API route validates role server-side
- [ ] Cross-portal access is rejected by middleware
- [ ] Donor phone numbers never appear in any list response
- [ ] All user-supplied strings escaped at render
- [ ] IDs are server-generated UUIDs, never client-supplied

---

## 13. Build order

| Milestone | Contents | Outcome |
|---|---|---|
| **M1** | Schema, seed geography, auth, role middleware | Foundations |
| **M2** | Bank portal + searcher tier 1 | Stock lookup works end to end |
| **M3** | Requests, donor portal, matching, web push | The core loop |
| **M4** | Admin portal, escalation engine | Coordination layer |
| **M5** | Audit, moderation, consent, deletion | Compliance |
| **M6** | Metrics dashboard | Operational visibility |

Build and verify each milestone before starting the next. M3 is the milestone that proves the product — if the loop from request to confirmed donation does not work in one region, nothing after it matters.

---

## 14. Metrics

| Metric | Why |
|---|---|
| Prospects per successful donation | Drives how many donors to notify |
| % requests reaching `resolved` | Whether the platform works |
| Median request → first acceptance | Whether it feels fast |
| Median acceptance → donation | Where delay actually lives |
| % closed `found_elsewhere` | How often the platform was bypassed |
| Tier 1 hit rate | Whether maintaining stock data is worth it |
| Donor decline/ignore rate over time | Early warning for fatigue |
| Admin response time distribution | Capacity planning |

**Not a success metric:** registered donor count.

---

## 15. Open decisions

| # | Decision | Owner |
|---|---|---|
| 1 | Seven escalation and expiry timings (§9.2) | Lions Club |
| 2 | Monthly notification cap per donor | Lions Club |
| 3 | Stock freshness threshold | Lions Club |
| 4 | Donor cooldown period — confirm local guidance | Lions Club / bank |
| 5 | Admins committed per region and rota shape | Lions Club |
| 6 | SMS provider and DLT registration owner | Project |
| 7 | Account and infrastructure ownership | Lions Club |
| 8 | Region rollout order after Sirsi | Lions Club |