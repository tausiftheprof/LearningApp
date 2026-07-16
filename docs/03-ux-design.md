# 3. Product & UX Design

Working title: **Little Grip**. Child users are pre-readers or early readers; every child-facing design decision assumes **zero reading ability** at Level 1.

---

## 3.1 User journeys

### Child journey (core loop)
1. **Open app** → warm hello animation + spoken "Hi! Let's play!" → lands on **Child Home** (if a profile exists).
2. **Pick a tile** (illustrated icon; tapping speaks its label: "Drawing!").
3. **Activity picker** shows large cards with pictures; locked (paid) content is *invisible* to the child, never shown as a teaser.
4. **Activity intro**: spoken instruction + demonstration hand animation; "▶" replays instructions any time.
5. **Play**: immediate feedback, gentle off-path/hint support, autosave continuously.
6. **Complete**: calm celebration (confetti respects reduced-motion), star/sticker earned, spoken praise; "again" or "home".
7. **Daily limit reached**: current activity finishes → "Great playing today! Time to rest your hands" screen with a wave-goodbye animation. No countdown, no guilt.

### Parent journeys
- **First run (onboarding)**: Welcome → *parent-addressed* setup ("Grown-ups: set up in under a minute") → create profile (nickname, age band, avatar) → optional: difficulty, handedness, daily time target, sound → privacy summary ("Everything stays on this device. No ads. No chat.") → hand device to child.
- **Check progress**: Child Home → gate icon (top corner, small, adult-labelled) → parental gate → dashboard → Progress.
- **Set limits / sounds / difficulty / categories**: gate → Settings.
- **Export or view artwork**: gate → Saved Artwork → share/export via OS share sheet (parent action).
- **Delete data**: gate → Privacy & Data → Delete child data → typed confirmation → summary of what was erased.
- **Subscribe**: gate → Subscription → store purchase sheet (OS-level) → confirmation; **never reachable from child UI**.

### Administrator journey (CMS, phase 2 — docs/12)
Draft activity → editorial + safety + accessibility + cultural review → approval → scheduled publish → monitor usage → rapid unpublish/rollback if needed.

---

## 3.2 Information architecture

```
App
├─ Child space (default)
│  ├─ Home (8 tiles): Draw · Colour · Puzzles · Toddler Games ·
│  │   Preschool Games · Logic Games · Daily Adventure · My Rewards
│  ├─ Activity pickers (one level deep, per category)
│  ├─ Activity player (full-screen, one activity)
│  └─ My Rewards (sticker book, badges, star count)
└─ Parent space (behind parental gate; distinct visual theme)
   ├─ Dashboard (summary cards)
   ├─ Child Profile · Progress · Screen Time · Activity Settings ·
   │   Accessibility · Saved Artwork · Subscription · Privacy & Data ·
   │   Help & Support
   └─ (all external links live here only)
```
Max depth in child space: Home → Picker → Activity (2 taps to play). Flash cards / counting / word games are activity types inside Preschool Games (PRD C-11).

## 3.3 Age-appropriate design system

- **Touch targets:** child interactive elements ≥ 64 dp; toddler-game targets ≥ 76 dp; minimum spacing 12 dp. Parent UI follows platform norms (≥ 44 pt / 48 dp).
- **Type:** rounded, high-legibility face (e.g. system-rounded); child UI uses text only as decoration under icons; parent UI standard scale, supports OS Dynamic Type.
- **Colour:** warm pastel base palette; interactive elements pass 3:1 non-text contrast; parent UI text 4.5:1 (WCAG 2.2 AA). Colour is never the only signal — icons/patterns accompany every colour cue (colour-blind support).
- **Themes (owner-approved, July 2026):** three selectable looks — **Candy Clouds** (default, owner-selected July 2026; pink/purple/blue clouds on a `#F7F5FF` gradient, white cloud greeting with smiling-star mascot, icon-left bubbly tiles, treasure-chest rewards banner), **Soft Storybook** (lavender/peach/mint on `#FFF8F1`) and **Little Aussie Adventure** (eucalyptus/wattle/ocean on `#FFF9ED`, Australian-animal tile icons). Palettes live in `packages/core/src/content/themes.ts` (single source for app + demo); chosen per child in Parent → Theme; presentation-only (no behaviour or data change); the high-contrast accessibility palette always overrides theme tile colours. Child Home layout under every theme: greeting card ("Hi, <nickname>!" + theme subtitle + mascot), star pill, low-salience Grown-ups lock, eight tiles with icon medallions and subtitles, full-width "My Rewards" banner.
- **Motion:** 200–350 ms ease-out; nothing flashes >3×/s (WCAG 2.3.1); celebrations are drift-and-fade, not strobe; **Reduce Motion** honours OS setting and in-app toggle (crossfades replace movement).
- **Sound:** three independent channels — music (default low), effects, voice (default on). Every child-visible element has a spoken label on tap-and-hold (and on focus for screen readers).
- **Components:** `BigTile`, `ActivityCard`, `InstructionBar` (replay ▶ always visible), `HoldToHomeButton` (tap goes home — owner direction July 2026), `StarBurst`, `DemoHand`, `CanvasToolbar` (mirrors for left-handers), `ParentListRow`.
- **Copy voice:** short, warm, effort-praising ("Good trying!", "Almost there!"); the copy registry (code: `packages/core/src/feedback`) is the single source; no negative words, no urgency words ("hurry", "last chance" banned by lint rule).

## 3.4 Parental-gate flow

1. Entry: small "grown-ups" icon (top corner of Child Home) — deliberately low-salience for children.
2. Challenge: spoken-free, **written-word arithmetic** ("Seven plus twelve = ?") with a numeric keypad; numbers as words defeat non-readers; question randomised each attempt.
3. 3 failed attempts → gate pauses 60 s (calm screen, no error tone).
4. Optional hardening (parent setting): require device biometric/PIN via OS LocalAuthentication after the arithmetic.
5. Unlock lasts one parent-area session; **relocks** on: leaving parent area, app background, or 3 min inactivity.
6. Purchases: gate + OS purchase sheet (double protection). External links: rendered only inside parent area, marked "leaves the app".

## 3.5 Onboarding flow

Screens: (1) Welcome + what the app is; (2) "For grown-ups" interstitial (gate-lite: hold 3 s); (3) Profile — nickname (with hint "a nickname is fine!"), age band picker (2–3 / 3–5 / 5–7), avatar from fixed set; (4) Preferences (skippable): difficulty (defaults from age band), handedness, daily time target (default 15 min), sounds; (5) Privacy summary — plain-English, links to full notice; (6) "Ready!" → Child Home. No account, no email, no permissions requested (no permission prompts exist in MVP at all).

## 3.6 Screen inventory & key specifications

| # | Screen | Space | Key spec |
|---|--------|-------|----------|
| S01 | Splash/loading | — | Logo + gentle animation; <1.5 s target; no network wait |
| S02–S07 | Onboarding 1–6 | Parent | §3.5 |
| S08 | Child Home | Child | 8 `BigTile`s in 2×4 (tablet landscape) / 2-col scroll (phone portrait); tap speaks label then navigates on second tap *or* after 600 ms (setting: single/double-tap confirm); grown-ups icon top-right (top-left for left-hand mode) |
| S09 | Activity picker | Child | Horizontal cards, illustrated thumbnail, star badge if completed; locked content hidden; audio label on focus |
| S10 | Drawing board | Child | Full-bleed Skia canvas; toolbar (mirrorable): brush type (crayon/pencil/marker/paint), size (3), colour wells + pastel page + glitter + rainbow, sticker tray, eraser, undo/redo, clear (two-step), save; tap-to-home; replay-my-drawing button in gallery |
| S11 | Tracing player | Child | Path corridor rendered with animated start dot + arrow; `DemoHand` traces first; live gentle sparkle on-path, soft fade off-path (never red/cross); restart; 3 low-accuracy tries → demo replays |
| S12 | Colouring player | Child | Region tap-fill + freehand mode toggle; palette incl. glitter/pattern swatches; pinch zoom (2 fingers, bilateral); by-number mode shows numeral chips |
| S13 | Puzzle player | Child | Tray of pieces bottom (or side for left-hand); drag with 1.15× lift scale; snap within radius (difficulty-scaled); wrong drop = gentle drift back, no sound sting; hint pulse after 3 misses; completion animation |
| S14 | Game player (templates) | Child | Template-driven: tap-target, drag-sort, match-pairs, memory-cards, path-maze, odd-one-out, counting, letter-match, sequence, stack |
| S15 | Daily Adventure | Child | Recipe of 5 slots (§12); progress shown as a path with footprints; completion certificate animation |
| S16 | My Rewards | Child | Star total, sticker book grid, badges; purely celebratory — no locked/greyed teaser items |
| S17 | Time's-up | Child | Calm "all done today" + wave; single button "Bye!"; parent override via gate |
| S18 | Rotate prompt | Child | Friendly character rotates a tablet; shown when activity requires landscape (PRD §13) |
| S19 | Parental gate | Bridge | §3.4 |
| S20 | Parent dashboard | Parent | Cards: today's minutes, activities done, stars, quick links |
| S21 | Child Profile | Parent | Edit FR-001 fields; (multi-profile list post-MVP) |
| S22 | Progress | Parent | Skill bars (tracing accuracy trend, puzzle completion, colouring control), favourites, suggested next activities; footer disclaimer: "This is play information, not a medical or developmental assessment." |
| S23 | Screen Time | Parent | Daily target slider (off–120 min), reminder toggle, weekly view |
| S24 | Activity Settings | Parent | Category toggles, difficulty override, hint frequency |
| S25 | Accessibility | Parent | All FR-023 toggles, grouped: See / Hear / Touch / Pace |
| S26 | Saved Artwork | Parent | Grid; view, replay, export/share (OS sheet), delete |
| S27 | Subscription | Parent | Current plan, AUD price + renewal date, manage/cancel deep-link to store, restore purchases, ACL notice (docs/11) |
| S28 | Privacy & Data | Parent | Plain-English notice, child-friendly explanation, data summary ("what's on this device"), **Delete child data**, export data |
| S29 | Help & Support | Parent | FAQ, contact email, complaint pathway (docs/11 §7) |
| S30 | Error/empty/loading states | Both | §3.8 |

## 3.7 Offline & interrupted-session behaviour

- **Offline is the default assumption**: starter content is bundled; no child-space screen ever blocks on network. Pack downloads happen in parent area with progress + pause/resume; a pack is playable only after checksum verification.
- **Interruption (call, home button, kill):** activity state snapshots continuously (drawing strokes, puzzle placements, trace progress) to local storage; on relaunch within 24 h the child is offered "keep going?" with a thumbnail; otherwise home. Artwork is never lost (§22).
- **Low storage:** saving fails gracefully → parent-facing note in dashboard; child sees "saved!" only on true success (never lie to the child; if save failed, say "let's try saving again").
- **Airplane-mode test suite** covers first-run, play, save, rewards, report (docs/13).

## 3.8 Error, loading & empty states

- Child-space errors are **never technical**: a friendly character says "Hmm, that didn't work. Let's try again!" with a retry; second failure routes softly home. No error codes, no dialogs with OK/Cancel.
- Loading: skeleton canvas + bouncing dot ≤1.5 s budget; >4 s shows the character "Just getting ready…".
- Empty states: gallery with no art → character invites "Draw your first picture!"; rewards with no stars → "Play anything to earn a star!" (invitation, not pressure).
- Parent-space errors are standard, specific and actionable ("Couldn't restore purchases — check you're signed in to the App Store").

## 3.9 Accessibility behaviour (summary — full checklist docs/10)

- Every setting in FR-023 maps to a concrete behaviour: e.g. *longer response time* multiplies all timing windows ×2.5 and disables optional timers; *larger targets* raises child minimum to 88 dp and swaps grids to fewer-per-row; *high contrast* switches to WCAG-AAA-contrast palette with outlines; *alternative cues* adds haptic tick + visual pulse wherever sound conveys meaning.
- Screen readers: parent UI fully labelled; child navigation (home, pickers, buttons) labelled and focus-ordered; canvas play is inherently visual-motor — reader users get spoken descriptions of tools and state.
- Switch access/keyboard: all navigational UI operable via external switch/keyboard focus; documented limitation: freeform drawing requires pointer input (recorded in accessibility statement).
