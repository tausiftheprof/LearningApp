# 13. Test Strategy

Quality gates run in CI (`.github/workflows/ci.yml`): typecheck (strict TS) → lint (incl. copy-tone lint) → unit/integration tests → secret scan → dependency audit. Device/E2E suites run in phases 2–3 on the device lab.

| # | Layer | Scope & tooling | Key cases |
|---|---|---|---|
| 1 | Unit (`@littlegrip/core`, Jest) — **in this repo, running now** | Tracing corridor engine, puzzle snap/hint, rewards caps, screen-time ledger, recommendation/difficulty, parental gate, daily plan, progress report (incl. no-diagnosis copy guard), content-pack schema, deletion, feedback registry tone | Deterministic, seeded; ≥ 90 % line coverage on core target |
| 2 | Integration | Repositories against real SQLite (better-sqlite3 in CI, expo-sqlite on device); migrations up/down; pack install/verify/revoke | Corruption/interrupt recovery (kill mid-transaction), hash mismatch refusal |
| 3 | Mobile E2E (Maestro or Detox) | E2E-C1 onboarding→play→reward; E2E-C2 draw→save→gallery→replay; E2E-C3 colouring fill/undo; E2E-P1 gate (incl. 3-fail lockout, background relock); E2E-P2 delete-data wipes everything (assert DB+files empty); E2E-S1 purchase/restore sandbox | Runs on staging builds per PR label + nightly |
| 4 | Drawing performance | On-device harness: scripted 60 s stroke storm on floor devices (2019 mid-tier Android tablet, iPad 9th gen) | ≥ 55 fps sustained, < 16.6 ms p95 stroke latency, memory < 350 MB |
| 5 | Offline | Airplane-mode suite: first run, all MVP activities, save, rewards, report, time-limit; pack download pause/resume/integrity | Zero network-dependent failures in child space |
| 6 | Accessibility | docs/10 §10.2 manual protocol + automated contrast/labels checks | All manual tests recorded per release |
| 7 | Child usability | Moderated sessions: 6–10 children across the three age bands + parents; early-learning professional review (PRD §30) | Task completion without adult help; frustration/joy observations; gate not bypassed by 5–7s panel |
| 8 | Parental gate | Unit (challenge space, lockout, relock timers) + E2E-P1 + child panel attempts + fuzz (rapid taps, backgrounding mid-challenge) | No bypass path; purchases unreachable from child space (navigation-guard test) |
| 9 | Privacy & deletion | Automated: deletion test, retention prune test, log-content scan (no nickname/artwork/coords in logs), manifest permission audit (no location/contacts/mic/camera/AD_ID) ; manual: data-inventory ↔ store-label match | All green = release checklist items |
| 10 | Security | SAST (semgrep + eslint-security), dependency audit, gitleaks; DAST on phase-2 API; **external penetration test** before public release and before backend launch | No high/critical open |
| 11 | Subscription | Store sandbox: purchase, trial, renewal, cancellation, grace, restore, refund state; disclosure copy review vs docs/11 | All states handled; child space unaffected by any billing state |
| 12 | Device/OS matrix | Android 8/10/13/15 phone+tablet (incl. 1 GB-class low end), iOS 15/17/26 iPhone+iPad; portrait/landscape; stylus (S-Pen passive, Apple Pencil) | Layout, input, perf pass |
| 13 | CMS publishing (phase 2) | Workflow-state machine tests, role-permission matrix, revocation propagation E2E (< 15 min CDN, app hides content), rollback E2E, audit immutability | Server-enforced dual control proven |
| 14 | Interruption/reliability | Kill app mid-draw/mid-puzzle → relaunch restores; low-storage simulation; OS-backup restore smoke | No lost artwork/progress |

**Executed home-button verification (16 Jul 2026, web build):** 54/54 checks pass — hold-to-home from all 7 category pickers, 30 game activities (all 15 templates), tracing/colouring/jigsaw/drawing players, Rewards and Daily Adventure; "Bye!" from Time's-up; gate back-link; "Exit to child mode" from all 9 parent sections. Suite: web-demo test hook + Playwright (see repo history). Mobile-native repeat is part of the phase-3 device-lab run.

**Release gate:** suites 1–2 green in CI; 3–6, 8–9, 11–12, 14 green on release candidate; 7 completed at least once pre-launch and after major child-UX changes; 10 pen test complete with criticals closed.
