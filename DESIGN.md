# easyParking — Design System

> **Instruction to AI coding assistant (GitHub Copilot):** This file defines the ONLY visual style allowed in this project. Follow it exactly. Do not fall back on generic default styling (no default Bootstrap look, no generic "AI app" purple-gradient-and-rounded-everything look, no stock Material icon set used randomly, no placeholder-feeling UI). Every screen must look deliberately designed, not auto-generated. If you are about to use a generic blue/purple gradient, a default browser-style button, or an emoji as an icon, stop — that is explicitly against this spec.

---

## 1. Design Direction (the two references)

This app must feel like a **merge of two specific references** — not a copy of either, but their *qualities* combined:

### From Easypaisa (simplicity & clarity):
- Big, obvious tap targets. A non-technical 50-something parking owner must never hesitate about what to tap.
- One primary action per screen, visually dominant.
- Short labels, no jargon. "Receive Payment" not "Process Transaction."
- Status is communicated with color + text together, never color alone (colorblind-safe, and clearer for non-technical users).
- Numbers (money, dues) are large and easy to scan — this is a financial record app, the numbers ARE the content.

### From Hostinger (premium & professional):
- Confident, modern typography — not default system font stacking that looks like a prototype.
- Generous whitespace, not cramped.
- Restrained color use: one strong brand/accent color, a neutral dark-ink text color, and a clean light background — not a rainbow of status colors everywhere.
- Subtle depth (soft shadows, 1px borders) instead of heavy drop-shadows or flat-with-nothing design.
- Rounded corners that are consistent and moderate (not "everything is a pill/blob" and not "everything is a sharp square").

**The result should feel like a real fintech product a paying customer would trust with their money records** — not a hackathon demo, not a default admin dashboard template, not an "AI-generated" looking UI.

---

## 2. What to Explicitly Avoid

- ❌ Purple-to-blue gradients (this is the single most common "default AI app" tell — do not use it)
- ❌ Default emoji used as functional icons (💰 📅 ✅) — use a proper icon set instead (see section 5)
- ❌ Generic light-gray-everything dashboard look with no personality
- ❌ Overly saturated "candy" colors
- ❌ Centering every single thing with huge empty margins that feel like a template, not a real product
- ❌ Default `Arial`/`sans-serif` with zero typographic hierarchy
- ❌ Harsh pure-black (`#000000`) text or pure-white (`#FFFFFF`) backgrounds — always use slightly off tones (see palette)
- ❌ Inconsistent border-radius across components (pick values from the scale in section 4 and stick to them)

---

## 3. Color Palette

Use CSS custom properties (`:root` variables), never hardcode hex codes directly in components.

```css
:root {
  /* Brand */
  --color-primary: #0F6B4C;        /* deep trustworthy green — evokes money/growth, not generic tech-blue */
  --color-primary-dark: #0A4F38;
  --color-primary-light: #E6F4EE;  /* tint for backgrounds/badges */

  /* Neutrals (off-black / off-white, never pure) */
  --color-ink: #16201C;            /* primary text */
  --color-ink-muted: #5B6B63;      /* secondary text */
  --color-bg: #FAFBF9;             /* page background */
  --color-surface: #FFFFFF;        /* card/surface background */
  --color-border: #E3E8E4;

  /* Status (used WITH text labels, never alone) */
  --color-success: #1B8A5A;        /* paid / received */
  --color-success-bg: #E7F6EE;
  --color-warning: #B97A1A;        /* partially paid */
  --color-warning-bg: #FBF0DD;
  --color-danger: #C23B3B;         /* due / outstanding, old unpaid */
  --color-danger-bg: #FBEAEA;

  /* Elevation */
  --shadow-sm: 0 1px 2px rgba(22, 32, 28, 0.06);
  --shadow-md: 0 4px 12px rgba(22, 32, 28, 0.08);
}
```

Why green instead of blue/purple: this is a money-tracking app. Green reads as "financial, trustworthy, growth" without tipping into the generic blue-SaaS or purple-AI look everything else uses. Do not substitute a blue or purple primary color.

---

## 4. Typography & Spacing Scale

**Font:** Use a real typeface, loaded explicitly — don't rely on default system-ui stacking alone.
- Recommended: `Inter` or `Manrope` (both free, both have a confident-but-friendly feel appropriate to both references). Load via self-hosted font files or a font-display:swap strategy for PWA performance — do not block render on a slow external font request.

```css
:root {
  --font-family: 'Inter', -apple-system, 'Segoe UI', sans-serif;

  /* Type scale */
  --text-xs: 12px;
  --text-sm: 14px;
  --text-base: 16px;
  --text-lg: 18px;
  --text-xl: 22px;
  --text-2xl: 28px;   /* used for big money numbers on dashboard/customer profile */
  --text-3xl: 36px;

  /* Spacing scale (use multiples of 4) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-8: 48px;

  /* Radius scale — pick from here only */
  --radius-sm: 6px;   /* inputs, small buttons, badges */
  --radius-md: 10px;  /* cards */
  --radius-lg: 16px;  /* modals, bottom sheets */
}
```

Money amounts (dues, payments) should always use `--text-xl` or larger, bold weight, and a tabular/monospaced-number font-feature if available (`font-variant-numeric: tabular-nums;`) so figures align cleanly in lists.

---

## 5. Icons

Use a **single consistent icon library** throughout — do not mix icon sets, and never use emoji as functional UI icons.

Recommended: **Lucide** (lucide-react) — clean outline style, free, matches the "premium but simple" direction. Consistent 1.5–2px stroke weight throughout.

Icon usage rules:
- Icons are always paired with a text label in navigation and primary actions (never icon-only for a primary action, per the Easypaisa-style clarity requirement).
- Icon-only is acceptable only for secondary/repeated small actions (e.g. an edit pencil inside a list row) where the context is already obvious.
- Status icons (paid/due) use a small filled circle or check/clock icon next to the status label, colored per the status palette in section 3 — not a random icon chosen per developer taste.

---

## 6. Core Components — Behavior Spec

### Buttons
- Primary button: solid `--color-primary` background, white text, `--radius-sm`, generous padding (`--space-3` vertical, `--space-5` horizontal), subtle `--shadow-sm`. Only ONE primary button visible per screen/section — this enforces the "one obvious action" rule from Easypaisa.
- Secondary button: white/surface background, 1px `--color-border`, `--color-ink` text.
- Destructive action (e.g. deactivate customer): uses `--color-danger`, always requires a confirmation step before executing (per original spec's "confirmation before important actions" rule).

### Status Badges (Due / Received)
- Small pill, `--radius-sm`, background = the status's `-bg` variable, text = the status's solid color variable, bold text, icon + label together (e.g. a clock icon + "Baqaya / Due", or a check icon + "Wasool Shuda / Received"). See `PROJECT_CONTEXT.md` section 6 for the exact labels — do not invent new status words.

### Cards (Customer card, Due card, Payment row)
- White `--color-surface` background, `--radius-md`, `--shadow-sm`, 1px `--color-border`.
- Customer name and outstanding amount are the two most visually dominant pieces of info on a customer card — everything else is secondary/smaller text.

### Forms
- Large touch-friendly inputs, minimum 44px height (mobile tap-target standard).
- Label above the input, not placeholder-only (placeholders disappear when typing and confuse non-technical users).
- Inline validation errors in `--color-danger`, shown directly below the field, with clear plain-language text (e.g. "Phone number zaroori hay" style — short and direct, not a generic "Invalid input").

### Navigation
- Mobile: bottom tab bar with icon + label for the core sections (Dashboard, Customers, Payments, Daily Parking, More). Max 5 items — anything else goes under "More"/Settings.
- Desktop/tablet: left sidebar version of the same navigation, same icon set, same labels — keep them visually consistent across breakpoints, this is one app not two designs.

---

## 7. Dark/Light Mode

Not required for v1. Build with the light palette in section 3 only. Do not spend effort on a dark theme unless explicitly requested later.

---

## 8. RTL Support (Urdu & Persian)

Because two of the four required languages (Urdu, Iranian Persian) are RTL:
- Use CSS logical properties (`margin-inline-start`, `padding-inline-end`, etc.) instead of `margin-left`/`margin-right` wherever direction-sensitive spacing is used, so the layout mirrors correctly under `dir="rtl"`.
- Icons that imply direction (e.g. a "back" arrow) must flip automatically based on `dir`.
- Numbers (money amounts, dates) stay in their normal left-to-right numeral order even inside an RTL layout — don't mirror digit order.

---

## 9. Summary Checklist Before Shipping Any Screen

- [ ] No purple/blue gradient anywhere
- [ ] No emoji used as a functional icon
- [ ] Only the defined color palette and spacing/radius scale used (no arbitrary hex values or pixel values scattered in components)
- [ ] One dominant primary action per screen
- [ ] Status always shown as color + icon + text together
- [ ] Money figures are visually the largest, boldest numbers on the screen
- [ ] Works and looks correct in both LTR and RTL
