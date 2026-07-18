# 7. Privacy & Data Controls

All conclusions require sign-off by the Privacy Officer and qualified Australian legal counsel (see docs/06).

## 7.1 Data inventory (MVP)

| Data item | Child/Parent | Purpose | Storage | Retention | Access roles | Subprocessors | Overseas disclosure | Deletion |
|---|---|---|---|---|---|---|---|---|
| Child nickname | Child | Personalise greetings/name-tracing | Device SQLite | Until parent deletes / app uninstall | Parent (gated), app runtime | None | No | Parent "Delete child data" (transactional wipe) or uninstall |
| Age band (2–3/3–5/5–7) | Child | Activity recommendation, difficulty | Device SQLite | as above | as above | None | No | as above |
| Avatar id, preferences (difficulty, handedness, sound, accessibility, screen-time target) | Child (set by parent) | Personalisation, accessibility | Device SQLite | as above | as above | None | No | as above |
| Activity progress aggregates (activity id, timestamps, attempts, hints, accuracy 0–100, duration) | Child | Parent progress report, recommendations, rewards | Device SQLite | Rolling 12 months on device (auto-prune), or deletion | as above | None | No | as above + automated 12-month prune |
| Artwork (vector stroke JSON + PNG thumbnail) | Child | Child gallery, parent export | Device file sandbox | Until deleted by parent/child-initiated parent action | as above | None | No | Per-item delete or full wipe |
| Daily usage seconds | Child | Screen-time limit | Device SQLite | 90 days rolling | as above | None | No | Wipe |
| Reward grants | Child | Motivation, sticker book | Device SQLite | as progress | as above | None | No | Wipe |
| Subscription entitlement token | Parent | Unlock paid content | OS billing + local cache | Life of subscription | Parent, app | Apple/Google (store billing — platform operators, not engaged subprocessors) | Yes — Apple/Google global infrastructure | Store-managed; local cache cleared on wipe |
| Support emails (name, email, message) | Parent | Support/complaints | Support mailbox (AU-hosted preferred) | 2 years then delete | Support staff | Email provider (register §7.6) | Depends on provider — record in register | Support-tool deletion on request |
| OS backups of app data | Child+Parent | Device restore (OS feature) | iCloud/Google (user's account) | Per user's OS settings | Device owner | Apple/Google (user-chosen OS feature) | Yes (user-controlled) | Documented in notice; keys excluded via backup rules |
| **Not collected at all** | — | — | — | — | — | — | — | Full name, DOB, email of child, photos/camera, microphone, precise/coarse location, contacts, biometrics, advertising IDs, device fingerprints, free-text from children, raw stroke traces |

Phase 2 (parent accounts/sync/CMS analytics) requires a new inventory + PIA revision before build.

**Status update (July 2026):** the phase-2 parent-account UI/state-machine scaffold described in
docs/04 §4.6 has been built (Parent → Cloud backup & sync) so the product experience can be
demonstrated end-to-end, but it is **off by default** and has **no backend** - `requestSignInCode`
shows the one-time code on-screen instead of emailing it, and "Sync now" only timestamps a local
mock rather than talking to a server (see `packages/core/src/account/account.ts`). No account data
leaves the device in this build. This row of the inventory stays intentionally blank until a real
AU-region backend exists: **do not enable this for real users, and do not connect it to a live
backend, without first revising this inventory and PIA and getting Privacy Officer/Legal sign-off**
per the phase-2 gate above and the security review in docs/09 §9.3.

## 7.2 Privacy Impact Assessment (summary)

1. **Scope & data flows:** as per inventory; MVP flow is device-internal; only parent-initiated flows touch the network (pack download — carries no personal data; store billing — handled by OS).
2. **Necessity & proportionality:** each item maps to a PRD function; DOB rejected in favour of age band (A-02); raw movement traces rejected (C-14).
3. **Best interests of the child** (draft Children's Code): assessed — the design serves learning; no monetisation of child data; no engagement-maximising mechanics (reward caps, no streak loss); defaults most restrictive; findings recorded here and re-checked when the final Code registers.
4. **Risks & mitigations:** device theft/shared device → data is low-sensitivity, gate protects settings, optional OS-level device security; re-identification of analytics → no remote analytics in MVP; sync breach → deferred + E2E encryption planned; over-collection creep → schema-level ban list + PR review checklist item.
5. **Residual risk:** LOW for MVP (device-local). Sign-off required: Privacy Officer, Legal.

## 7.3 Consent & permission flows

- Onboarding shows a collection notice (APP 5) *before* profile creation; proceeding = parent acknowledgement (recorded locally with timestamp + notice version).
- OS permissions: **none requested in MVP** (no camera/mic/location/contacts/notifications-push). Local notifications ask OS permission only when the parent enables reminders, from the gated area.
- Any future telemetry: separate opt-in toggle, off by default, parent-area only, versioned consent record; withdrawing stops collection immediately.
- Children are never asked for consent; anything consent-like is parent-only, behind the gate.

## 7.4 Access, correction & deletion processes

- **Access/export:** Parent area → Privacy & Data → "Export data" produces a human-readable JSON of profile, progress, rewards + artwork files via OS share sheet.
- **Correction:** all profile fields editable in parent area (APP 13 analogue).
- **Deletion:** "Delete child data" wipes all child rows + files in one transaction (automated test `deletion.test.ts`); uninstall removes the sandbox. Support pathway for anything held server-side (support emails): request via Help & Support, actioned ≤ 30 days.

## 7.5 Data-retention schedule

| Data | Retention | Mechanism |
|---|---|---|
| Progress aggregates | 12 months rolling | automated prune job on app start |
| Daily usage ledger | 90 days | automated prune |
| Artwork | until parent deletes | manual |
| Consent/notice acknowledgements | life of install | wipe on delete |
| Support correspondence | 2 years | support-tool policy |
| CMS audit logs (phase 2) | 7 years | immutable store |
| Backend backups (phase 2) | 35 days | snapshot expiry |

## 7.6 Subprocessor register (MVP)

| Subprocessor | Service | Data | Region | Child data? | Assessed |
|---|---|---|---|---|---|
| Apple Inc. | App distribution, StoreKit billing, TestFlight | Parent's Apple-ID-side purchase data (Apple-controlled) | Global | No | Store policies reviewed Jul 2026 |
| Google LLC | Play distribution + billing | as above (Google-controlled) | Global | No | as above |
| *(none else)* | MVP ships with zero additional SDKs/services | — | — | — | Gate: any new SDK/subprocessor requires child-privacy, security, retention, overseas-disclosure and model-training assessment recorded here **before** integration |

## 7.7 Analytics/SDK assessment gate

No analytics, advertising, crash-reporting or social SDK may be added unless a written assessment covers: child-privacy compliance (Kids Category / Play Families / draft Children's Code), security posture, data retention, overseas disclosure, and **whether the vendor uses data for AI/model training (must be no for any child data, by default for all data)**. Template in this section; approver: Privacy Officer + Eng Lead.

## 7.8 Data-breach response (NDB scheme)

1. Detect/report (any staff → security@…, 24 h internal SLA) → 2. Contain (revoke creds, isolate, preserve logs) → 3. Assess within 30 days: is serious harm likely? (child data = weight heavily toward notify) → 4. Notify OAIC + affected parents if required (template letters maintained) → 5. Remediate + post-incident review → 6. Update risk register. Roles: Incident Lead (Eng Lead), Privacy Officer, Comms. MVP exposure is minimal (no server-held child data) but the plan stands for support-mailbox and phase-2 systems. Tabletop exercise before phase-2 launch.
