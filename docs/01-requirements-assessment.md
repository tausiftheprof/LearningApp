# 1. Requirements Assessment

> **Scope revision — 16 July 2026 (product owner direction):** the owner has superseded the
> recommended MVP boundary (§1.4) and directed development of the **full product scope** per the
> updated PRD, which also fixes the product name (**"Little Grip, big learning adventures"**) and
> requires a **soft female voice** for all spoken output. Additional owner directions: original
> image-based artwork (dolphins, whales, unicorns, dinosaurs and similar child-friendly subjects;
> no third-party imagery), a single replaceable image folder (`assets/images/`), and verified
> Home-button behaviour on every screen. Items requiring external infrastructure (store billing
> accounts, CMS hosting, cloud sync) remain implementation-ready designs pending those services —
> tracked in the RTM. Assumption A-06 (freemium boundary) and §1.4 are superseded accordingly;
> A-12 is amended: instruction audio is recorded/generated with a **soft female voice**.

**Product:** Kids Fine Motor Skills Learning App — **Little Grip, big learning adventures**
**Source of truth:** Product Requirements Document (Requirements.docx, §1–§30)
**Date:** 15 July 2026
**Status:** Draft for product-owner review. Compliance conclusions require review by qualified Australian legal counsel.

---

## 1.1 Executive summary

The PRD describes a well-scoped, child-safe learning app for children aged 2–7 that develops fine-motor, cognitive and preschool skills through drawing, colouring, tracing, puzzles and short games, with a gated parent area, offline-first operation, a CMS for content operations, and a freemium/subscription model aimed at parents.

The PRD is unusually strong on child-safety intent (§16, §30): minimal data collection, parental gate, no chat/public sharing, no behavioural advertising, no location tracking, and explicit Australian compliance. It is weakest on: identity/account model (no requirement for a parent account is stated, yet cloud sync, subscriptions and notifications imply one), the boundary between the free and paid tiers, tracing-accuracy definitions, analytics/crash-reporting mechanics compatible with Apple Kids Category and Google Play Families rules, and CMS governance workflow detail.

**Recommended approach (adopted in this repo):**

1. **Local-first MVP.** The entire child experience runs on-device with no account, no child email, no network dependency. A child profile is a *local record* (nickname + age band), not a cloud identity.
2. **Optional parent account, deferred past MVP v1.0.** Subscriptions run through the app stores (StoreKit / Play Billing) and need no server account. Cloud backup/sync becomes a post-MVP, consent-gated feature.
3. **Content-pack architecture.** Activities are data (JSON + vector/audio assets) validated against a versioned schema, so the CMS can publish new content without app releases (§18) while the starter pack ships in the binary for offline first-run.
4. **Compliance by architecture.** Designing to the *exposure draft* of the Australian Children's Online Privacy Code (registration due 10 Dec 2026 — likely in force during this product's first year) and to Apple Kids Category / Google Play Families policies now, rather than retrofitting.

The MVP defined in PRD §25 is achievable and has been kept, with the clarifications in §1.4 below.

---

## 1.2 Assumptions register and open decisions

Each assumption uses the child-safest reasonable interpretation. **All assumptions require product-owner confirmation; A-01, A-03, A-08, A-12 also require Australian legal review.**

| ID | Area | Assumption / decision | Rationale | Risk if wrong |
|---|---|---|---|---|
| A-01 | Identity | **No parent account and no child account in MVP.** Child profile is local-only (nickname, age band, preferences). Subscriptions use app-store billing identity only. | PRD never requires an account; child-safety principles say core activities must work without a child email; local-first minimises APP obligations and honours §17. | Cloud gallery / multi-device sync deferred; acceptable — both are listed as later releases (§25). |
| A-02 | Age data | Store a **broad age band** (2–3, 3–5, 5–7) not date of birth, even though §6.1 permits DOB. | Date of birth is unnecessary for recommendations; broad bands satisfy §6.1's purpose ("use the child's age to recommend activities") with less data. | Slightly coarser recommendations; none material. |
| A-03 | Parental gate | Gate = **adult arithmetic challenge (spoken-word numbers, randomised) + optional device biometric/PIN**, re-locking after 3 min of inactivity and on app background. | Meets Apple 2.5.14 "parental gate" expectations; arithmetic in written words defeats non-readers; biometric adds strength without collecting biometric data (OS-held). | Gate strength contested at app review; mitigation: configurable gate provider. |
| A-04 | Artwork | Child drawings are stored **on-device only** in MVP, exportable by the parent from the gated area. Never uploaded, never logged. | §11 "Download or view saved artwork" is satisfied locally; avoids hosting children's creative content (privacy + moderation burden). | Cloud gallery deferred (already a later-release item, §25). |
| A-05 | Analytics | MVP ships with **no third-party analytics or ad SDKs**. A first-party, on-device aggregation produces the parent progress report; an **opt-in, anonymised, batched telemetry** channel (no identifiers, no free text, no drawings) may be enabled post-legal-review. Crash reporting only via a Kids-Category-compatible, self-hosted or assessed service, off by default for MVP. | Apple Kids Category restricts third-party analytics; Play Families forbids AAID transmission for children; PRD §23 permits but does not require analytics. | Less product telemetry at launch; acceptable trade for approval certainty. |
| A-06 | Monetisation boundary | Free tier: full drawing board, 5 colouring pages, 2 puzzles, 3 toddler + 3 preschool + 3 logic games, tracing letters A–F and numbers 1–5. Paid ("Full Library"): everything in §25 MVP list + monthly content packs. Prices AUD, set in stores; **monthly and annual family subscription only** at launch. | PRD §24 lists options without deciding; smallest viable paid surface; no purchase surface in child UI. | Conversion economics unproven; adjustable server-side via content-pack entitlements. |
| A-07 | Screen-time behaviour | When the daily limit is reached mid-activity, the child may **finish the current short activity**, then a calm "all done for today" screen appears; no countdown pressure in child UI. Parent can override from the gated area. | §10/§19 require no-pressure design; hard cut-offs mid-drawing cause distress and data loss (§22 reliability). | None material. |
| A-08 | Notifications | MVP: **local notifications only** (screen-time reminder, weekly summary), opt-in, configured in parent area. No push infrastructure, no marketing messages. Any future marketing email is parent-only, opt-in, with unsubscribe (Spam Act). | §19 parents-only; local notifications need no server or token collection. | Re-engagement weaker; acceptable at launch. |
| A-09 | Tracing accuracy | "Following the path" = ≥80 % of sampled stroke points within a difficulty-scaled corridor (Beginner 48 dp, Developing 32 dp, Confident 22 dp), with direction-agnostic scoring at Beginner. Never shown to the child as a failure; three low-accuracy attempts → animated demonstration replays. | §6.2/§27 require detection + tolerance but give no numbers. Values from touch-target research; tuned in child usability testing. | Tuning needed after testing; engine parameters are data-driven per activity. |
| A-10 | Portrait/landscape | Child activities run **landscape-primary on tablets, portrait-supported on phones**; activities that require landscape show the friendly "turn your device" prompt (§13). Parent area supports both. | §13 explicitly requires the rotate prompt where portrait unsupported. | None. |
| A-11 | Languages | English (en-AU) only at launch; all strings externalised, audio-instruction files keyed by locale in the content-pack format from day one. | §20. | None. |
| A-12 | Voice audio | Instruction audio is **pre-recorded/pre-generated at build/CMS time** and shipped as assets. No on-device TTS of child data, no cloud TTS calls at runtime. Child-friendly voice; recordings reviewed in CMS workflow. | Avoids runtime network dependency and third-party voice SDK assessment; §20 permits generated voices. | Asset size; mitigated by pack downloads. |
| A-13 | Left-handed support | Left-handed setting mirrors tool-palette placement and demonstration-hand animations. | §6.1/§14 name the preference but not the behaviour. | None. |
| A-14 | Multiple profiles | Data model supports N profiles from day one; **UI exposes one profile in MVP** (§25), unlockable later without migration. | Prevents a schema migration for the highest-priority later feature. | None. |
| A-15 | "Developer dashboard" (§23) | Interpreted as an internal, aggregate-only statistics view fed by the opt-in telemetry channel (A-05), not per-child tracking. Deferred past MVP. | §23 says "permissible according to Australian laws"; aggregates only. | None. |
| A-16 | Stylus | Any OS-recognised pointer works (finger, capacitive or active stylus); no vendor SDK (e.g. S-Pen SDK) in MVP. | §21; vendor SDKs would need child-privacy assessment. | Reduced palm rejection on some devices. |

**Open decisions for the product owner** (blocking nothing in MVP build, blocking store submission):

1. Final app name, brand, and character/illustration style (PRD has none).
2. Confirm free/paid boundary (A-06) and AUD price points.
3. Confirm PRD §6.3 themes with "??" markers ("Food … ??", "Festivals and celebrations??") — recommend including both, subject to cultural review in the CMS workflow (§15).
4. Whether a childcare/school licence (§24) is pursued in year one (affects backend roadmap only).
5. Commission of legal review (see docs/06) and privacy impact assessment sign-off (docs/07).

---

## 1.3 Contradictions, ambiguities and missing requirements

| ID | Issue | Location | Recommended resolution |
|---|---|---|---|
| C-01 | "One child profile" in MVP (§25) vs "Parents must be able to create one or more child profiles" (§6.1) and scalability "multiple child profiles per family" (§22). | §6.1 / §22 / §25 | Data model multi-profile, UI single-profile in MVP (A-14). |
| C-02 | Cloud backup and "choose whether progress data is stored locally or synchronised" (§11, §17) vs no stated account/auth requirement anywhere. | §11 / §17 | Defer sync to post-MVP parent-account release; MVP toggle is honest: "stored on this device only". |
| C-03 | §23 lists "App crashes" and "Subscription conversion" analytics vs §16 minimal collection vs Apple Kids Category third-party analytics restrictions. | §16 / §23 | First-party, opt-in, anonymised telemetry only (A-05); subscription conversion measured from store-console aggregates, not in-app tracking. |
| C-04 | "Practice writing your name … use name from the profile **or enter a name option**" (§6.6) invites free-text child input. | §6.6 | Restrict to profile nickname or a parent-entered word from the gated area; no child-facing free-text field. Never log the value. |
| C-05 | Rewards include "virtual room decorations" and daily rewards (§10) — collection mechanics risk compulsion-loop / dark-pattern findings against §30 and eSafety Safety by Design. | §10 / §30 | MVP: stars, stickers, badges only; effort-based; daily cap; no streak-loss mechanics, no countdown timers, no "come back tomorrow" pressure. Decorations deferred + design-reviewed. |
| C-06 | "Time limit option" for puzzles (§6.4) vs accessibility "activities without time limits" (§14) and calm design (§9). | §6.4 / §14 | Timed mode exists only as an *optional* Confident-level challenge, default off, always beatable untimed; disabled entirely when the reduced-stimulation accessibility profile is on. |
| C-07 | No requirement for what happens to progress when a profile is deleted, or deletion proof. | §11 / §16 | Deletion is immediate, local, complete (profile, progress, artwork, rewards) with a confirmation summary; covered by automated tests (docs/13). |
| C-08 | Puzzle "hint after N failed attempts" (§6.4) vs "hints available after several unsuccessful attempts" (§9) — N undefined. | §6.4 / §9 | Default N=3, CMS-tunable per activity. |
| C-09 | "Prevent accidental exit from an activity" (§13) vs "easy home button" (§13). | §13 | Home button always visible; a single tap goes home (owner direction, July 2026 — the earlier 1.2 s hold-to-home tested as "broken" with the owner); work auto-saves first (§22). Accidental-exit risk is mitigated by button placement (top corner, outside the play surface). |
| C-10 | Success measures include "subscription retention"/"conversion" (§29) vs no advertising profiles for children (§23) and no purchase pressure (§24). | §23 / §29 | Measure from store console aggregates; never per-child; no in-child-UI upsell surfaces at all. |
| C-11 | §5 lists "Flash cards", "Learn to count", "Word Games" as home categories; §28 navigation omits them. | §5 / §28 | §28 is the navigation truth (8 tiles max for non-readers); flash cards/counting/word games are *activity types inside* Preschool Games; revisit post-MVP. |
| C-12 | Missing: data-retention periods, breach process, subprocessor list, admin audit logging — required by good practice and APP 1/11 but absent from PRD. | — | Supplied in docs/07 and docs/12; flagged for legal review. |
| C-13 | Missing: minimum OS versions, device floor, performance budgets. | §21/§22 | Set: Android 8.0+ (API 26), iOS 15+, 60 fps drawing target on 2019-era mid-tier tablet, cold start < 3 s, activity load < 1.5 s (docs/13 performance tests). |
| C-14 | Missing: what "measure movement accuracy" (§7) stores. | §7 | Store per-activity aggregate scores (0–100) and attempt counts only — never raw stroke traces, never coordinates, in progress records (docs/07 data inventory). |

---

## 1.4 Recommended MVP boundary

**In (maps to PRD §25, with clarifications):**

- One local child profile (nickname, age band, avatar from fixed set, difficulty, handedness, sound + accessibility prefs, daily screen-time target).
- Age-band activity recommendation + Daily Adventure session (5/10/15 min/custom).
- Drawing board (brushes: crayon/pencil/marker/paint; sizes; standard + pastel palette; glitter + rainbow brushes; eraser; undo/redo; clear; stickers/shapes; save to local gallery; replay animation).
- Tracing: lines, curves, zigzags, shapes, letters A–Z, numbers 0–9, with corridor feedback (A-09).
- 20 colouring pages (tap-fill + freehand, brush sizes, zoom, undo/redo, eraser, save, restart; free / colour-by-number modes).
- 10 jigsaw/shape puzzles (snap assist, hints after 3 misses, completion animation).
- 10 toddler, 10 preschool, 10 logic games (from PRD §6.5–§6.7 lists; exact ten of each in docs/03 screen inventory).
- Audio instructions + replay button on every activity; demonstration animations.
- Stars/stickers/badges with daily caps; My Rewards room.
- Local progress tracking + parent report (accuracy aggregates, completions, time, favourites, suggestions — no diagnosis language).
- Parent area behind gate: profile, screen time, sound, difficulty, category toggles, activity history, artwork export, **data deletion**, subscription management (store-billing), accessibility settings, privacy notice, help.
- Offline: everything above works with zero connectivity; content packs downloadable when online.
- Accessibility: WCAG 2.2 AA where applicable — high contrast, reduced motion, larger targets, longer response times, no-time-limit default, repeat-instruction, colour-blind-safe palettes with pattern cues, screen-reader labels on parent UI and child navigation, adjustable touch/hold durations, left-handed mirroring.

**Out (future releases — PRD §25 list, plus items moved out by assumptions):**
Multiple child profiles (UI), teacher dashboard, OT mode, multiplayer, cloud artwork gallery, printable worksheets, advanced adaptive learning, handwriting analysis, additional languages, school reporting, custom activity creation, AI-generated activities, parent cloud account + sync, push notifications, room decorations, childcare/school licences, web/Chromebook, remote crash reporting/telemetry (until assessed), name-writing free-entry (C-04).

> Any future feature involving public sharing, messaging, uploads, generative AI, multiplayer or UGC is classified **high-risk** and requires a separate safety, privacy and moderation assessment before design begins (see docs/09 §risk register R-20).

---

## 1.5 Future-release feature list (prioritised)

1. Multiple child profiles UI (data model ready) — low risk.
2. Parent account + encrypted cloud backup/sync (needs PIA update, auth design in docs/04 §9) — medium risk.
3. Additional content packs & seasonal content via CMS — low risk.
4. Assessed crash reporting + opt-in aggregate telemetry — medium risk (Kids Category assessment).
5. Additional languages (ar, hi, ur, zh, es, fr) — low risk.
6. Printable worksheets — low risk.
7. Teacher / childcare licence + dashboard — high effort, medium risk (new user class, new PIA).
8. OT mode with professional input (§14) — medium.
9. Cloud artwork gallery — **high risk** (children's content hosting; separate assessment).
10. Advanced adaptive difficulty / handwriting analysis — **high risk** (profiling concerns under draft Children's Code; separate assessment).
11. AI-generated activities — **high risk**; prohibited from using child data/artwork for model training by default; separate assessment mandatory.

---

## 1.6 Requirements traceability matrix

See **docs/02-traceability-matrix.md** (kept as its own file for review tooling). Status values used there: `Implemented` (code + tests in this repo), `Designed` (spec in docs, build pending), `Deferred` (future release), `Blocked` (needs owner/legal decision).
