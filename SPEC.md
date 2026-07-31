# Blood Donor Platform — Product Specification v1

**Status:** Draft for Lions Club review
**Scope:** One region (Sirsi) at launch, expandable region by region

---

## 1. Design principles

These are the decisions everything else follows from. If one of these changes, most of this document changes.

1. **Software matches and notifies. Humans coordinate.** The platform's automated job ends when a donor raises their hand. Everything after that is the regional admin, working the phone.
2. **A location is a PIN code, resolved to a region.** No GPS, no distance calculation, no map permissions.
3. **A request never widens by itself.** It stays in its region. Only an admin moves it.
4. **An accepted donor is a prospect, not a donor.** Nobody counts until blood is actually collected.
5. **Blood bank stock is a hint, not a promise.** Always shown with an age. The phone call is the source of truth.
6. **Every request is owned by a named human** from the moment prospects appear.

---

## 2. Core entities

| Entity | What it is |
|---|---|
| **Region** | A named group of PIN codes. Must contain at least one blood bank. Has ≥2 admins. |
| **Blood bank** | A licensed blood centre. Has stock, opening hours, policy notes. |
| **Donor** | A phone-verified person with a blood group and a home region. |
| **Request** | One patient's need for blood. Has a stage and an owner. |
| **Prospect** | One donor's involvement in one request. This is where the real state lives. |
| **Admin** | A regional volunteer with a dashboard and a rota slot. |

**Key modelling note:** a request's stage is *derived* from its prospects. Prospects hold the truth; the request stage is a summary for the dashboard.

---

## 3. Stage model

### 3.1 Request stages

| Stage | Meaning | Moves on | Moved by |
|---|---|---|---|
| `finding_prospects` | Donors notified, nobody has accepted | Request raised | System |
| `evaluating_prospects` | At least one donor accepted | First acceptance | System |
| `scheduled` | Donor and appointment agreed | Admin fixes appointment | Admin |
| `resolved` | Blood was actually donated | Bank or admin confirms | Bank / Admin |
| `closed` | Ended without a donation | Requires a reason | Admin / System |

### 3.2 Prospect statuses

| Status | Meaning |
|---|---|
| `invited` | Notified, no response yet |
| `accepted` | Tapped "I can donate" |
| `screening` | At the bank being assessed |
| `donated` | Blood collected |
| `rejected` | Failed screening |
| `no_show` | Did not turn up |
| `stood_down` | No longer needed — request covered elsewhere |

### 3.3 Close reasons

`found_elsewhere` · `no_longer_needed` · `no_donor_found` · `expired` · `abusive`

**Why two levels:** a prospect can fail screening while another is still being evaluated and a third search is running. A single stage field cannot express that. Deriving the request stage from prospects handles the loop for free.

### 3.4 Deliberately not a stage

`donor_on_the_way` — no reliable signal exists for it. Neither donor nor admin will update it consistently, and a stale stage makes the dashboard less trustworthy. Revisit only if a "leaving now" button is added and actually gets used.

---

## 4. Event timelines

### 4.1 Requester

| # | Event | System response |
|---|---|---|
| 1 | Enters PIN code or town name | Resolves to region |
| 2 | Selects blood group and component | — |
| 3 | Views blood banks in region | Shows name, address, phone, stock per group, **age of each stock figure**, open/closed status |
| 4 | Taps an adjacent region to browse | Shows that region's banks. **Nothing is broadcast.** |
| 5a | **Stock found** → calls bank directly | Search logged. "Raise a request anyway" stays one tap away (banks often require replacement donors) |
| 5b | **No stock** → raises request | Requires OTP-verified phone. Captures group, component, units, destination bank, urgency, contact number |
| 6 | — | Request created at `finding_prospects`. Matching donors in region notified |
| 7 | Watches status | Sees count notified, count accepted. Never sees donor phone numbers at this point |
| 8 | — | On first acceptance → `evaluating_prospects`. **Admin notified** |
| 9 | Speaks to admin | Admin has already called the donor. Requester and admin agree which prospect to use |
| 10 | — | Admin fixes appointment → `scheduled` |
| 11 | — | Blood collected → `resolved` |
| 12 | Can cancel at any point | Requires a close reason. Remaining prospects `stood_down` and thanked |
| 13 | No activity for a set period | Prompted: "is this still needed?" No reply → `closed / expired` |

### 4.2 Donor

| # | Event | System response |
|---|---|---|
| 1 | Registers | Name, phone + OTP, blood group, date of birth, PIN code → region, explicit consent |
| 2 | — | Age gate: must be 18–65. Under-18 registrations rejected outright |
| 3 | Idle in pool | Not contacted. No requests during eligibility cooldown |
| 4 | Matching request raised in region | Push notification (v1) with group, destination bank, urgency |
| 5 | Blood bank posts shortage of their group | Same notification path |
| 6 | Responds | One tap: **I can donate** / **Not now** / **Not for a while** (pauses notifications) |
| 7 | Accepts | Prospect → `accepted`. Sees destination bank name and address. **Admin calls them** |
| 8 | — | Cannot accept a second request while one pledge is active |
| 9 | Attends bank | Prospect → `screening` |
| 10a | Passes, donates | Bank confirms → `donated`. Eligibility clock resets ~3 months. Group verified/corrected on profile |
| 10b | Fails screening | → `rejected`. Request returns to `finding_prospects` if no other prospect is live. **Donor is not penalised** |
| 10c | Doesn't turn up | Admin marks `no_show`. Affects internal reliability ranking only |
| 11 | Accepts after request closed | Graceful "already handled, thank you". Never sent to a bank |
| 12 | Not needed | `stood_down` with a warm thank-you message — never silence |
| 13 | Any time | Can edit group/PIN, pause notifications, or delete account entirely |
| 14 | Every few months | Prompted to re-confirm PIN code and availability |

### 4.3 Blood bank

| # | Event | System response |
|---|---|---|
| 1 | Account created | Verified by admin before going live |
| 2 | Updates stock | Manual entry screen in v1. Timestamped on every save |
| 3 | Stock ages past threshold | Displayed greyed out with age. Never hidden silently |
| 4 | Sets opening hours / closed status | Requester sees this next to stock |
| 5 | Posts a shortage | Eligible donors in region notified |
| 6 | Donor arrives | Marks prospect `screening` |
| 7 | Screening outcome | Marks `donated` or `rejected`. **This is the only trusted source for resetting a donor's clock** |
| 8 | Confirms donation | Also confirms or corrects the donor's blood group |
| 9 | Policy notes | Free-text field: replacement donor requirements, which hospitals they serve, quirks. Visible to admins only |

### 4.4 Admin

| # | Event | System response |
|---|---|---|
| 1 | On rota | ≥2 admins per region. District coordinator as fallback |
| 2 | Dashboard | All open requests in region, sorted by urgency then age. Stage and age visible per row |
| 3 | **Notified: no prospect after timeout** | Takes over. Works the phones |
| 4 | **Notified: prospect accepted** | Calls the donor to pre-screen — last donation, recent illness, general fitness |
| 5 | Zero donors matched at creation | Notified **immediately**, not after timeout |
| 6 | Agrees donor with requester | Fixes appointment → `scheduled` |
| 7 | Follows up | Confirms attendance, marks `no_show` if needed |
| 8 | Can transfer request to another region | Receiving region's admin becomes owner. Logged |
| 9 | Doesn't act within timeout | Escalates to second admin, then district coordinator |
| 10 | Closes request | Reason mandatory |
| 11 | Also | Verifies/suspends blood banks, blocks abusive users, reviews reported donors |
| 12 | Every view of patient/donor contact data | Written to audit log |

---

## 5. Timing parameters

To be filled in by Lions Club members with real emergency experience. Suggested starting values only.

| Parameter | Suggested | Notes |
|---|---|---|
| No-prospect → notify admin | 20 min | 0 min if urgency = emergency |
| Admin inaction → second admin | 15 min | |
| Second admin inaction → district | 15 min | |
| Request auto-expiry | 48 h | With "still needed?" prompt at 12 h |
| Max notifications per donor per month | 6 | Protects against fatigue |
| Stock freshness before greying out | 6 h | |
| Donor eligibility cooldown | ~3 months | Per standard guidance; confirm locally |

---

## 6. Edge cases — handled in v1

### Request lifecycle

| # | Case | Handling |
|---|---|---|
| R1 | Duplicate requests for one patient across regions | One open request per verified phone number. Moving region is an admin **transfer**, not a new request |
| R2 | Family finds blood elsewhere, never closes | "Still needed?" prompt, then auto-expiry. Expected to be the single most common outcome |
| R3 | Zero matching donors at creation | Admin notified immediately. Requester sees an honest message, not an empty list |
| R4 | Patient died or discharged | Admin's first call is always "is this still needed?" before mobilising anyone |
| R5 | Prank / test requests | OTP required before raising. Rate limit per number. Admin can block |
| R6 | Request raised but bank actually had stock | Bank branch and request branch are one tap apart, not separate journeys |

### Donor side

| # | Case | Handling |
|---|---|---|
| D1 | Several donors accept for one unit | Treated as desirable — screening failure is common. Extras `stood_down` with a warm thank-you |
| D2 | Donor accepts then doesn't show | Admin marks `no_show`, one tap to return request to `finding_prospects` |
| D3 | Donor fails screening | Prospect `rejected`, request reopens. Notifications to other donors were never stopped |
| D4 | Donor accepts two requests | One active pledge per donor, enforced |
| D5 | Late acceptance after close | "Already handled, thank you." Never dispatched |
| D6 | Wrong self-declared blood group | Bank corrects it on confirmation |
| D7 | Donor moved, stale PIN | Periodic re-confirmation prompt |
| D8 | Under-18 / over-65 | Date-of-birth gate at registration |
| D9 | Donor still in cooldown | Excluded from matching automatically |
| D10 | Donor deletes account mid-pledge | Prospect auto-`stood_down`, admin notified |
| D11 | No smartphone | Admin phones them directly |

### Blood bank

| # | Case | Handling |
|---|---|---|
| B1 | Stock stale | Age shown on every figure, greyed past threshold |
| B2 | Bank closed | Open/closed shown next to stock |
| B3 | Bank requires replacement donors | Policy notes field, visible to admins |
| B4 | Bank won't serve patients from other hospitals | Same policy notes field |

### Safety and abuse

| # | Case | Handling |
|---|---|---|
| S1 | Paid donors / touts | Report-and-suspend. Admin watches for one "donor" recurring across unrelated requests |
| S2 | Harassment of donors | Contact opens only after acceptance **and** after admin has spoken to both sides. Block-and-report button |
| S3 | Admin misusing contact data | Audit log of every view. Signed conduct undertaking |
| S4 | Donor phone numbers scraped | Numbers never returned in any search result or list response |

---

## 7. Edge cases — deliberately ignored in v1

Each of these is a conscious decision, not an oversight. The trigger column says what would make us revisit.

| # | Ignored | Why | Revisit when |
|---|---|---|---|
| I1 | Automatic widening to adjacent regions | Admin transfer is more reliable and keeps a human accountable | Admin load becomes the bottleneck |
| I2 | `donor_on_the_way` tracking | No trustworthy signal | Donors actually use a "leaving now" button |
| I3 | GPS and distance sorting | PIN → region is sufficient and avoids a privacy liability | Regions prove too coarse in a city |
| I4 | In-app chat between requester and donor | Admin mediation is the safety mechanism, not an inconvenience | Never, probably |
| I5 | Automated eligibility screening | Medical judgment belongs to the bank | Never |
| I6 | e-RaktKosh / automated stock sync | Integration effort before we know if stock data is even used | Tier 1 proves valuable and manual entry decays |
| I7 | Platelets and plasma | v1 is whole blood only. **Note: plasma compatibility is inverted vs red cells** — the compatibility table must be rewritten, not extended | Banks ask for it |
| I8 | Donor reliability scoring acted on | Collect the data, don't rank on it yet — too little signal | Enough history exists |
| I9 | Hospital / patient verification | Admin judgment in v1 | Fake requests become common |
| I10 | Masked calling | Admin mediation covers most of the risk | Harassment reports appear |
| I11 | Offline mode | Adds real complexity | Field reports demand it |
| I12 | Native mobile apps | PWA reaches Android users instantly, no install friction | Push reliability proves inadequate |
| I13 | Camps management | Not on the emergency path | Lions Club asks for it |
| I14 | Duplicate donor detection beyond phone number | Diminishing returns | Visible duplication |
| I15 | Notification delivery receipts | Nice to have, not decision-changing | Delivery failures suspected |
| I16 | Languages beyond English and Kannada | Existing translations already cover launch region | Expansion outside Karnataka |
| I17 | Multi-district admin hierarchy | One district, flat structure | Second district onboards |

---

## 8. Notification channels

| Phase | Channel | Notes |
|---|---|---|
| **v1** | Web push from PWA | Free, instant, no registration, works on Android |
| **v1** | Admin phone call | For everything after acceptance — this is by design |
| **v2** | WhatsApp Business | Requires approved templates for business-initiated messages; quick-reply buttons supported; free-form allowed for 24 h after donor replies. Business verification takes weeks — start it early, off the critical path |
| **v2** | SMS fallback | Requires DLT registration with TRAI |

**Constraint to hold:** the bot does broadcast and buttons only. The eligibility conversation stays with the admin.

---

## 9. Metrics to instrument from day one

| Metric | Why |
|---|---|
| Prospects per successful donation | The key operational number. Drives how many donors to notify |
| % of requests reaching `resolved` | Whether the platform works |
| Median time request → first acceptance | Whether it feels fast |
| Median time acceptance → donation | Where the real delay lives |
| % requests closed `found_elsewhere` | How often the platform was bypassed |
| Tier 1 hit rate (stock found, no request raised) | Whether maintaining stock data is worth it |
| Donor decline and ignore rates over time | Early warning for fatigue |
| Admin response time distribution | Capacity planning |

**Explicitly not a success metric:** number of registered donors.

---

## 10. Open questions for Lions Club

1. The seven timing parameters in section 5.
2. How many admins can be committed per region, and on what rota? *Platform throughput ≈ admins × cases per hour. This number determines expansion speed.*
3. Which blood banks in the launch region will participate, and what do they currently use for stock?
4. Who owns the system — account ownership, and who handles a data deletion request?
5. Is whole blood only acceptable for v1?
6. Which regions after Sirsi, and in what order?