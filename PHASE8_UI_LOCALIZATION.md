# easyParking — Phase 8: UI/UX Polish & Localization

> **Instruction to AI coding assistant (GitHub Copilot):** Only work on this phase. Phases 1–7 must already be complete — all features exist functionally. This phase is about polish and making the app work in all 4 required languages. Read `DESIGN.md` fully (again) and `PROJECT_CONTEXT.md` section 10 before starting.

---

## Implementation status

The four locale resources, language preference persistence, RTL direction switching, responsive navigation, icons, and UI polish are implemented and included in the Phase 8 commit. Translation-key coverage, backend tests, frontend lint, and the production build passed during implementation. The authentication rate-limit message is localized; other API-provided validation/error text can still be English. Native Urdu/Persian review and a manual visual pass across every RTL screen remain release checks.

## Goal of This Phase

By the end of this phase:
1. Every screen is reviewed against the `DESIGN.md` checklist and polished to match
2. The app fully supports English, Iranian Persian, Urdu, and Roman Urdu
3. RTL layout works correctly for Persian and Urdu
4. Each user's language preference is saved and applied independently

---

## 1. i18n Setup

```
npm install i18next react-i18next i18next-browser-languagedetector
```

### Folder structure for translations

```
frontend/src/locales/
├── en/translation.json
├── fa-IR/translation.json
├── ur/translation.json
└── ur-Latn/translation.json
```

### Rules
- **No hardcoded UI text anywhere in components.** Every label, button, placeholder, validation message, and status word goes through the `t('key')` translation function.
- Use clear, namespaced keys (e.g. `customer.addButton`, `payment.statusDue`, `validation.phoneRequired`) — not raw English text as the key, since that gets confusing to maintain across 4 files.
- Status labels must use the exact wording from `PROJECT_CONTEXT.md` section 6 in each language:
  - English: "Due" / "Received"
  - Roman Urdu: "Baqaya" / "Wasool Shuda"
  - Urdu script: proper Urdu translations of the same concepts (a native speaker should review these before final release — flag with a comment if a direct translation feels uncertain)
  - Persian: proper Iranian Persian (not Dari) translations of the same concepts

### Language switching
- On login/signup, default to `Parking.defaultLanguage` or browser-detected language, falling back to English
- Add a language switcher (simple dropdown or a dedicated row in a user settings/profile screen)
- On change: update `User.preferredLanguage` via `PATCH /api/auth/me`, and update `i18next`'s active language + `document.documentElement.dir` (`rtl` for `fa-IR`/`ur`, `ltr` otherwise) immediately, without requiring a page reload

---

## 2. RTL Layout Implementation

- Set `dir="rtl"` or `dir="ltr"` on the root `<html>` element based on the active language, not per-component
- Audit all CSS for direction-sensitive properties — per `DESIGN.md` section 8, use logical properties (`margin-inline-start`, `padding-inline-end`, `inset-inline-start`, `text-align: start`) instead of `left`/`right`-based ones wherever layout direction matters. Go through every component from Phases 2–7 and fix any hardcoded `margin-left`/`margin-right`/`left`/`right` usage.
- Verify the bottom tab bar / sidebar navigation (from `DESIGN.md` section 6) mirrors correctly
- Verify forms, especially ones with icons next to inputs, mirror correctly
- Money amounts and dates: keep numerals in standard left-to-right order even inside RTL text, per `DESIGN.md` section 8 — don't let the browser auto-mirror digit sequences

---

## 3. Visual Polish Pass

Go through **every screen built in Phases 2–7** and check it against the `DESIGN.md` section 9 checklist:

- [ ] No purple/blue gradient anywhere
- [ ] No emoji used as a functional icon — confirm Lucide icons are used consistently everywhere
- [ ] Only the defined color palette and spacing/radius scale used — search the codebase for any hardcoded hex colors or arbitrary pixel values outside the CSS variables and fix them
- [ ] One dominant primary action per screen
- [ ] Status always shown as color + icon + text together
- [ ] Money figures are visually the largest, boldest numbers on their screen
- [ ] Works and looks correct in both LTR and RTL

Specifically revisit:
- **Dashboard** (Phase 7) — the most visually dense screen, make sure the stat-card grid doesn't feel cluttered, generous spacing per `DESIGN.md` section 3's Hostinger-inspired whitespace guidance
- **Payment screens** (Phase 5) — money is the main content here, make sure amounts are the clear visual focus
- **Forms across the app** — confirm consistent label-above-input styling, consistent button styling, consistent spacing

---

## 4. What NOT to Do in This Phase

- Do not add a dark mode (explicitly out of scope per `DESIGN.md` section 7)
- Do not change any business logic — this phase is presentation-layer only
- Do not add new features — if a gap is found (e.g. a missing screen from an earlier phase), note it but handle it as a fix to that phase, not scope creep here

---

## 5. Definition of Done for Phase 8

- [ ] No hardcoded UI strings remain — everything flows through translation files
- [ ] All 4 languages are selectable and persist per-user
- [ ] Owner and Manager can simultaneously use different languages without affecting each other
- [ ] RTL layout is correct for Urdu and Persian across every screen (navigation, forms, lists, dashboard)
- [ ] Every screen passes the `DESIGN.md` checklist
- [ ] A native Urdu/Persian speaker has reviewed the translation files for accuracy (flag this as a manual review step, not something Copilot can verify itself)

Once confirmed working, stop and wait before starting Phase 9 (PWA, Testing & Deployment).
