# 11. Subscriptions & Australian Consumer Law Design

Purchases are **parent-only**, reachable exclusively via the parental gate. The child interface contains no prices, no locked-content teasers, no upsell copy, ever. Requires legal review before launch (docs/06 rows 5–6); UTP Act 2026 obligations commence 1 Jul 2027 — designed-in now.

## 11.1 Products (proposal — owner decision A-06/open decision 2)

| Product | Price (AUD, incl. GST, placeholder) | Billing | Notes |
|---|---|---|---|
| Full Library — Monthly | $6.99/month | Auto-renewing, monthly | 7-day free trial (single use) |
| Full Library — Annual | $49.99/year | Auto-renewing, yearly | Trial shared with monthly |
| Free tier | $0 | — | Genuine, permanent; boundary per A-06; never described as anything but "Free activities included" |

## 11.2 Disclosure & purchase flow (parent area → Subscription)

1. Plan cards show: **AUD price incl. GST, billing frequency, renewal date wording** ("Renews automatically each month until cancelled"), trial terms ("7 days free, then $6.99/month unless you cancel before the trial ends"), and cancellation instructions — all before any purchase button.
2. **No preselected option**; equal visual weight; no countdown/urgency copy (lint rule bans "hurry/only today/last chance").
3. Purchase = parental gate (already passed) + OS purchase sheet (Face ID/password) = the "parent confirmation" required by PRD §16/§27.
4. Post-purchase screen repeats terms + renewal date + how to cancel.
5. **Renewal reminders:** stores send their own; the app additionally offers an optional local reminder 3 days before annual renewal and before trial end (UTP-ready; consumer-friendly beyond current minimum).

## 11.3 Cancellation & restore

- "Cancel subscription" is one tap from the Subscription screen → deep-links to the store's manage-subscription page (Apple/Google manage billing; cancellation is as easy as sign-up, satisfying the click-to-cancel principle).
- Cancelling retains access to period end; then the free tier continues — **child's saved artwork and progress are never removed or held hostage by subscription state**.
- "Restore purchases" button re-syncs entitlements (device change/reinstall).

## 11.4 Refunds, complaints, guarantees

- Refunds primarily via store mechanisms; the Help screen explains both the store pathway and our direct support contact, and states plainly: *"Nothing here limits your rights under the Australian Consumer Law. Our services come with guarantees that cannot be excluded."*
- Complaint pathway: in-app Help → support email (ack ≤ 2 business days) → escalation note referencing state/territory fair trading and the ACCC. Complaint log reviewed monthly (docs/14 ops).
- No terms may exclude/limit ACL consumer guarantees; T&Cs drafted by counsel.

## 11.5 Billing integration rules

- Native StoreKit 2 / Play Billing via `react-native-iap`; **no third-party monetisation SDK** unless it passes the docs/07 §7.7 assessment (child-data, model-training, Kids-Category compatibility).
- Entitlement checked locally with store receipts; grace period handling so a lapsed network check never interrupts a child mid-activity.
- Prices localised through store consoles; AUD storefront primary at launch.

## 11.6 Prohibited patterns (enforced by design review + copy lint)

Pre-ticked paid options · trial converting without disclosure · "free" claims for paid features · child-visible commerce or nag screens · cancellation friction (retention interstitials capped at one informational screen with a working cancel link) · guilt copy ("your child will lose…") · artificial urgency.
