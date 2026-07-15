# Little Hands - children's fine-motor-skills learning app

A local-first, ad-free learning app for children aged 2-7 (Android & iOS) and their parents/carers,
built from the Product Requirements Document with Australian child-privacy and safety compliance
designed in from the start.

> **Status:** Phase-0 foundation. Domain engines are implemented and fully tested; the Expo app is a
> working scaffold with illustrative content and placeholder art/audio (clearly labelled in code).
> Compliance conclusions in `docs/` require review by qualified Australian legal counsel and are
> not legal advice.

## Repository layout

| Path | What it is |
|---|---|
| `docs/01…14` | Complete requirements assessment, traceability matrix, UX design, architecture, API spec, **Australian compliance register**, privacy pack (PIA, data inventory, notices), safety & security, accessibility, subscriptions/ACL, CMS governance, test strategy, delivery plan |
| `packages/core` | `@littlehands/core` - pure TypeScript domain logic: tracing corridor engine, puzzle snap/hints, rewards (daily-capped), screen-time ledger, parental gate, recommendations, daily plan, progress/report, content-pack schema, deletion. **96 unit tests.** |
| `apps/mobile` | Expo (React Native, TypeScript strict) app: onboarding, child home, drawing board (Skia), tracing, colouring, jigsaw, six game templates, rewards, daily adventure, parental gate, full parent area incl. data deletion. |
| `.github/workflows/ci.yml` | Quality gates: typecheck, tests, dependency audit, secret scan, child-safety manifest audit. |

## Key design decisions (details in docs/01 & docs/04)

- **No accounts, no child email** - a child profile is a local record (nickname + age band only).
- **Offline-first** - the bundled starter content pack means the child experience never needs a network.
- **Zero third-party SDKs** that touch data (no analytics/ads/crash reporting) pending the assessment gate in docs/07 §7.7 - Apple Kids Category / Google Play Families compatible by construction.
- **Content packs** (zod-validated, hash-verified, revocable) let the CMS fix content without app releases; the schema is structurally incapable of link-outs, chat or free-text collection.
- **Parental gate**: word-form arithmetic + lockouts + auto-relock (Apple 2.5.14-style).

## Getting started

```bash
npm install          # workspaces: packages/core + apps/mobile
npm test             # core unit tests (96)
npm run typecheck    # strict TS across workspaces
cd apps/mobile && npx expo start   # run the app (Expo Go / dev client)
```

Native builds use EAS (`eas build`) - see docs/14 for environments, release checklist, rollback and
support runbooks. No secrets belong in this repo (CI enforces).

## Deliverable index for reviewers

Start at `docs/01-requirements-assessment.md`, then `docs/02` (traceability), `docs/06`
(compliance register + sources checked 15 Jul 2026), `docs/07-08` (privacy pack), `docs/09-10`
(safety/security/accessibility), `docs/11-14` (commerce, CMS, testing, delivery).
