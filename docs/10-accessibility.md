# 10. Accessibility Checklist & Test Plan (WCAG 2.2 AA target)

Target: WCAG 2.2 Level AA **where applicable** to a native mobile app (mapped below), plus child-specific motor-accessibility measures. DDA 1992 context in docs/06 row 8. Known, documented limitation: freeform drawing/tracing is inherently visual-motor; navigation and all settings remain fully accessible, and this is stated in the public accessibility statement.

## 10.1 Checklist (by WCAG principle)

**Perceivable**
- [ ] 1.1.1 All child tiles/cards/buttons have text alternatives + spoken labels (non-readers AND screen readers)
- [ ] 1.3.x Layout communicates structure to assistive tech (headings/roles in parent UI; accessibilityRole on all child controls)
- [ ] 1.4.3/1.4.11 Text 4.5:1 (parent UI), non-text UI components 3:1 (both UIs); high-contrast mode exceeds AAA where feasible
- [ ] 1.4.1 Colour never sole signal (colour-by-number shows numerals; matching games add pattern/shape cues) — colour-vision test protocol below
- [ ] Volume: independent music/effects/voice sliders; captions not applicable (no speech-bearing video), spoken instructions all have visual demonstration equivalents (alternative cues)

**Operable**
- [ ] 2.3.1 Nothing flashes more than 3×/s (animation review gate in CMS + design system rule)
- [ ] 2.5.8 Target size: ≥64 dp child (exceeds AA 24px minimum), ≥44 pt parent
- [ ] 2.5.1 No path-based gesture required for navigation (pinch-zoom has button fallback; two-finger actions optional per §7 "bilateral optional")
- [ ] 2.2.x No time limits by default; optional timers always disableable; "longer response time" setting multiplies windows ×2.5
- [ ] 2.1.x Keyboard/switch: navigational UI focusable/operable; documented drawing limitation
- [ ] 2.5.5 Accidental activation: hold-to-home; destructive actions two-step

**Understandable**
- [ ] 3.1 Language set (en-AU); simple language reviewed (child copy ≤ 8 words/sentence)
- [ ] 3.2 Consistent component placement (§13); no unexpected context changes
- [ ] 3.3 Errors: friendly, specific, non-technical; inputs (parent forms) labelled with instructions

**Robust**
- [ ] 4.1.2 Name/role/value on all custom components (BigTile, CanvasToolbar etc.)

**Child-motor-specific (beyond WCAG)**
- [ ] Adjustable touch sensitivity (drag start threshold, tap slop) and snap-assist scaling
- [ ] Larger-targets mode (≥88 dp), reduced on-screen density
- [ ] Left-handed mirroring of toolbars and demo hand
- [ ] Stylus parity with finger for every interaction
- [ ] Reduced-stimulation mode: static backgrounds, no ambient animation, effects muted

## 10.2 Manual test protocol (every release)

| Test | Method | Pass criterion |
|---|---|---|
| Screen reader | TalkBack (Android), VoiceOver (iOS): onboarding → gate → settings → child navigation | All controls announced with sensible labels/order; no traps |
| Switch access | iOS Switch Control / Android Switch Access on navigation + parent UI | Complete key journeys |
| Keyboard | External keyboard on tablet | Focus visible, complete navigation |
| Colour vision | Sim Daltonism/Android simulation across protan/deutan/tritan on all games | Every task solvable without colour discrimination |
| Reduced motion | OS setting + in-app toggle | No parallax/large movement; celebrations crossfade |
| Reduced fine-motor | Testing with weighted glove protocol + child testers with OT advisor (phase 3) | Level 1 completable; frustration observations logged and actioned |
| Contrast | Automated (axe-like tooling on parent web-preview) + manual spot checks | AA values above |
| Dynamic type | Parent UI at largest OS text sizes | No truncation/overlap |

Results recorded per release in `docs/test-records/` (created at phase 3); failures block release (docs/14 checklist).
