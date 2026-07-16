# 9. Child Safety, Security & Risk

## 9.1 Child-safety risk assessment (Safety by Design)

Assessed against eSafety's three SbD principles (provider responsibility, user empowerment, transparency) — see docs/06 row 4.

| Risk to children | Inherent | Controls | Residual |
|---|---|---|---|
| Contact by strangers | n/a by design | No chat, messaging, sharing, profiles, multiplayer, comments — none exist and none can be enabled by content packs (schema has no such capability) | None |
| Exposure to inappropriate content | Medium | CMS four-review workflow (editorial/safety/accessibility/cultural, docs/12); no UGC; rapid revocation list; content standards §15 | Low |
| Commercial exploitation / purchase pressure | Medium | No child-visible commerce, no ads, no teaser-locked items in child UI, gate + OS purchase sheet, no urgency copy (lint-enforced) | Low |
| Excessive screen time / compulsion loops | Medium | Reward daily caps, no streak-loss, no countdowns, calm end-of-time screen, parent limits, session-length design (§12) | Low |
| Emotional harm from failure feedback | Medium | Positive-only copy registry, no fail states, corridor tolerance, hint escalation | Low |
| Privacy harm (identification/profiling) | Medium | Local-first, nickname+age-band only, no identifiers, no remote analytics in MVP | Low |
| Physical (photosensitivity, sound) | Low | No flashing >3/s, volume controls, calm animation standard, reduced-motion mode | Very low |
| Accessibility exclusion | Medium | docs/10 program | Low |

**High-risk future features** (public sharing, messaging, uploads, generative AI, multiplayer, UGC): blocked by governance rule — each requires a separate safety, privacy and moderation assessment approved by the Privacy Officer and Product Owner **before design begins** (risk register R-20).

## 9.2 Abuse & misuse cases

| Case | Vector | Mitigation |
|---|---|---|
| Child defeats parental gate | Guessing/repetition, watching parent | Randomised word-form arithmetic; 3-strike 60 s lockout; optional biometric second factor; relock on background/3 min; gate usability-tested with 5–7-year-olds |
| Sibling/other child uses wrong profile | Shared device | Low harm (no cross-profile data exposure); profile picker post-MVP |
| Adult stranger with device access reads child data | Stolen/shared device | Data is low-sensitivity by design (no identity/location); OS device lock recommended in onboarding tip |
| Malicious content pack (tampered CDN / MITM) | Network | TLS + SHA-256 manifest verification + (P2) signature; unverified packs refused |
| Content reviewer error publishes unsafe content | Process | Dual-control publishing (author ≠ approver), rapid revocation, audit log |
| Parent uses report to make medical claims | Misinterpretation | No-diagnosis disclaimer + copy guard test (FR-019) |
| App used to keep child occupied for very long periods | Product misuse | Default 15-min target, gentle end screen; we do not gamify time-in-app |
| Refund/billing disputes weaponised ("child bought it") | Commerce | Purchases impossible from child space; gate + OS sheet evidence trail |

## 9.3 Security threat model (STRIDE summary, MVP + phase 2)

Assets: child records (device), artwork, parent settings, entitlement, content pipeline, CMS credentials, support mailbox.

| Threat | Example | Controls |
|---|---|---|
| Spoofing | Fake content server | TLS 1.2+; cert validation (no user-CA trust for pack downloads in prod builds); pack signatures (P2) |
| Tampering | Modified pack injects link-outs | Schema has **no URL/webview capability** in child activities (structural control); hash verification |
| Repudiation | CMS staff deny a publish | Immutable audit log, SSO identities, dual control |
| Information disclosure | Device logs leak child data | Logging policy: no nickname, no artwork, no free text, no coordinates in logs (lint + review); OS sandbox; optional SQLCipher |
| DoS | CDN outage | App fully functional offline; bundled starter pack |
| Elevation | Child → parent area | Gate + relock; parent-area routes verify gate-session token in navigation guard |
| Secrets | Keys in binary | None exist client-side; CI gitleaks; (P2) server secrets in managed vault, least-privilege IAM |
| Supply chain | Malicious dependency | Lockfiles, `npm audit` gate, dependency-review action, minimal SDK policy (docs/07 §7.7) |

Operational security: least-privilege access to stores/CMS; MFA everywhere; admin audit logs (P2); SAST (typescript-eslint + semgrep) and dependency scanning in CI; DAST + **penetration test** before store submission and before phase-2 backend launch; secure logging review; automated retention jobs (docs/07 §7.5); incident response (docs/07 §7.8).

## 9.4 Risk register (delivery + product)

| ID | Risk | Inherent (L×I) | Mitigation | Residual |
|---|---|---|---|---|
| R-01 | Apple/Google reject Kids/Families submission | M×H | Pre-submission checklist (docs/14); zero third-party SDKs; gate per 2.5.14 | L |
| R-02 | Children's Code final text adds obligations | H×M | Designed to exposure draft; gap re-check on registration (Dec 2026) | M — legal watch item |
| R-03 | Drawing perf below 60 fps on low-end Android | M×H | Skia; perf budget tests on device lab from phase 1 | L-M |
| R-04 | Tracing tolerances frustrate children | M×M | Child usability rounds (docs/13 §7); data-driven per-activity params | L |
| R-05 | Content production (20 pages, 30 games, audio) slips | H×M | CMS-independent pack format; illustrative placeholders clearly labelled; content sprint in phase 2 | M |
| R-06 | Subscription flow breaches ACL/UTP timing | M×H | docs/11 checklist; legal review pre-launch; 1 Jul 2027 UTP readiness review | L |
| R-07 | Scope creep into high-risk features | M×H | R-20 governance rule | L |
| R-08 | Single-dev bus factor on core engine | M×M | Docs + tests in `@littlegrip/core`; pairing in phase 2 | L |
| R-20 | High-risk feature (UGC/AI/multiplayer/sharing) built without assessment | L×H | Mandatory separate safety/privacy/moderation assessment gate; enforced in delivery plan | L |
