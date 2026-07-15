# 12. CMS & Content Governance (Phase 2 build; format ships in MVP)

The mobile app consumes versioned **content packs** (docs/04 §4.4) from day one; the CMS is the phase-2 authoring/governance service that produces them. API surface: docs/05.

## 12.1 Roles (RBAC, least privilege, SSO + MFA)

| Role | Can |
|---|---|
| Author | Create/edit drafts, upload assets (pages, templates, audio, translations), tag metadata |
| Reviewer — Editorial | Approve language/age-appropriateness checklist |
| Reviewer — Child Safety | Approve §15 safety checklist (no fear/violence/stereotypes; reward/pressure audit) |
| Reviewer — Accessibility | Approve contrast, colour-independence, target sizes, audio quality, flash-rate |
| Reviewer — Cultural | Approve cultural respect/diversity checklist (external advisor as needed) |
| Approver/Publisher | Final approval, publish, schedule, **unpublish/rollback** (cannot approve own authored content — dual control) |
| Admin | Manage roles, view audit; cannot silently edit content (all actions logged) |

## 12.2 Workflow

`draft → in_review → approved → scheduled/published → unpublished(revoked)`

- Transition to `approved` requires **all four review checklists** completed and stored with the activity version (server-enforced, 422 otherwise — see API).
- **No content is publishable without documented review and approval.** Author ≠ Approver enforced.
- Publishing creates an immutable content version; the previous published version remains available for **rollback** (one action).
- **Scheduled publishing** for seasonal content (§18); schedules are cancellable until fire time.
- **Rapid unpublish:** adds pack/activity ids to the revocation list (served on CDN, cache TTL ≤ 15 min); apps check on every parent-area entry and pack refresh and hide revoked content immediately, including already-downloaded copies. Target: harmful content unreachable in new sessions < 1 hour.
- **Audit history:** every transition records actor, timestamp, prior/next state, checklist snapshot, note. Immutable, retained 7 years (docs/07 §7.5).

## 12.3 Activity metadata (schema-enforced — `packages/core/src/content`)

Age bands · skill category · activity type · difficulty level + params · motor-skill tags (§7 movements) · estimated completion time · theme · language(s) · accessibility notes/requirements · review-approval reference · version · minAppVersion.

## 12.4 Usage review

Phase-2 CMS dashboard shows **aggregate, k-anonymised** usage (plays, completion rate, hint rate per activity) sourced from the opt-in telemetry channel only (docs/04 §4.7) — never per-child data. Until telemetry exists, editors rely on store-console stats and usability testing.

## 12.5 Content correction without app release

Pack re-publish with bumped version → apps fetch updated manifest → checksum-verified swap. App-code changes still require store review; the schema deliberately keeps all *content* (images, paths, audio, difficulty params, translations) data-driven to maximise what can be fixed server-side (§18, §26 admin stories).
