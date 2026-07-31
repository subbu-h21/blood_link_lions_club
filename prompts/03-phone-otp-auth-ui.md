# Unit 03 — Phone OTP auth UI (public/donor)

**Milestone:** M1
**Depends on:** 01

## Anchor
Read CLAUDE.md first and follow it strictly.
Relevant: PRD.md §3 (Searcher and Donor rows only), §7.1 D1 (fields, not
wiring).

## Task
Build the phone-entry and OTP-verification screens used by the searcher (to
raise a request) and by donors (to register/log in). Two screens: enter
phone number, enter 6-digit OTP with resend. Use mocked verification — any
6-digit code succeeds — so the screens are reviewable before Supabase auth is
wired in Unit 04. This UI is shared by both portals; build it once under a
reusable location, not duplicated per portal.

## Read before writing
Unit 01's `app/(public)/` and `app/donor/` folders — this UI needs to be
callable from both without duplication.

## Constraints
6. **Search stays public.** Never put auth, a signup wall, or email capture
in front of blood bank search. Only *raising a request* requires OTP.
8. **Every user-facing string exists in both English and Kannada.** No
hardcoded text in components.
Scope limit: bank and admin auth are separate units (08–09, 34–35) and use
email+password, not this component.

## Reference
PRD.md §3, §7.1 D1. CLAUDE.md "Conventions" (`lib/i18n/`).

## Verify when done
- [ ] Phone entry → OTP entry → mocked success screen, with resend control
- [ ] Every string on both screens has an `en` and `kn` version
- [ ] Component is reused by both a donor-portal entry point and a
      searcher-portal entry point, not copy-pasted
- [ ] existing features still work
- [ ] npm run lint passes
