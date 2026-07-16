# 14. Delivery Plan & Operations

## 14.1 Phases, milestones, dependencies

| Phase | Weeks | Deliverables (milestone gate) | Depends on |
|---|---|---|---|
| 0 — Foundations *(this repo)* | 1–2 | Docs 01–14; monorepo; `@littlegrip/core` domain engines + tests; mobile scaffold; CI gates | PRD |
| 1 — Child core | 3–8 | Drawing, tracing, colouring players on-device at perf budget; design system; onboarding + gate; local storage/migrations; starter pack v1 (illustrative) | 0; visual identity decision (OD-1) |
| 2 — Full MVP + content | 9–16 | Puzzles + 30 games via templates; Daily Adventure; rewards; parent dashboard complete (reports, deletion, screen time); real content production (20 pages, audio recordings) through interim review workflow; CMS service + publishing pipeline; subscription integration | 1; content budget; price decision (OD-2) |
| 3 — Hardening & compliance | 17–20 | Device-lab perf/offline/E2E suites; accessibility audit + child usability rounds; pen test; PIA/legal sign-offs; store assets, privacy labels | 2; legal engagement |
| 4 — Launch | 21–22 | TestFlight/closed track beta with families → staged rollout AU | 3; release checklist |
| 5+ — Post-launch | — | Future-release list docs/01 §1.5, starting multi-profile UI + content packs | 4 |

**Roles:** Product Owner · Tech Lead/Architect · 2× RN engineers · 1× backend/CMS engineer (from phase 2) · Content designer/illustrator · Audio producer · QA engineer · Privacy Officer (part-time) · Australian legal counsel (engaged, external) · Early-learning/OT advisor (sessional) · Release manager (tech lead dual-hat).

**Delivery risks:** see docs/09 §9.4 (R-01…R-08); top three: content production slip (R-05), device performance (R-03), Children's Code final-text changes (R-02).

## 14.2 Release-readiness checklist

- [ ] All MVP RTM rows `Implemented` with tests green (docs/02)
- [ ] Test-strategy release gate met (docs/13)
- [ ] PIA signed (Privacy Officer + counsel); privacy notices legally reviewed; store privacy labels match data inventory
- [ ] Child-safety risk assessment + SbD self-assessment signed
- [ ] Accessibility manual protocol recorded; statement published
- [ ] Pen test criticals/highs closed
- [ ] Subscription flow legal review (ACL/UTP) complete
- [ ] Copy audit: no negative/urgency language (lint + human)
- [ ] Data-deletion E2E evidence archived
- [ ] Support mailbox + complaint pathway staffed; ops runbook rehearsed
- [ ] Rollback plan tested (store phased release halt + content revocation drill)

## 14.3 App-store submission checklist

**Both:** child-safe screenshots (no personal data), age-appropriate description, no ratings-inflation copy, contact + privacy-policy URLs live.
**Apple:** Kids Category enrolment, age bands 5-and-under + 6–8; guideline 2.5.14 gate demonstration notes for review; no IDFA usage declared; privacy nutrition label from docs/07 §7.1; sign-in-not-required declaration.
**Google:** Target audience = children (incl. under 5); Families policy declaration; Data safety form from docs/07 §7.1; content rating questionnaire (IARC); confirm no AD_ID permission in merged manifest; consider Teacher Approved submission; pre-launch report clean.

## 14.4 Operational support plan

- **Support:** support@ mailbox, ack ≤ 2 business days; FAQ in Help screen; complaint log with monthly review (ACL pathway, docs/11 §11.4).
- **Monitoring (MVP):** store console vitals (crashes/ANRs, aggregate), review monitoring, CDN/CMS uptime alerts (phase 2). No in-app telemetry until assessed (A-05).
- **Incident response:** docs/07 §7.8; content incidents → revocation drill ≤ 1 h (docs/12); severity matrix: S1 child-safety/privacy incident (page Privacy Officer immediately), S2 outage/billing, S3 defect.
- **Maintenance cadence:** monthly dependency/security patch train; OS-beta compatibility checks each Apple/Google beta season; quarterly restore-from-backup test (phase 2); quarterly review of compliance register (docs/06) — **December 2026 Children's Code registration re-check is a standing calendar item**.
- **Rollback:** app — halt staged rollout / expedite prior-version resubmission; content — revocation list + pack rollback (one action, docs/12); data — migrations are forward-safe with down-scripts where possible; billing — entitlement grace prevents lockouts.
