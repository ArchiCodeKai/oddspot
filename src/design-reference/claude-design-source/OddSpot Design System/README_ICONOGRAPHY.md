# Iconography

OddSpot ships **two parallel icon systems**. They don't mix visually — if you cross them you'll break the brand.

---

## 1. The eye mascot (brand family)

Eight custom SVGs, 1024×1024, in `assets/logos/`. This _is_ the OddSpot logo — no wordmark lock-up exists without the eye nearby.

| File | State | Use |
|---|---|---|
| `oddspot-icon-dark-open.svg` | Open eye, dark square (`#000`) | **Default brand mark.** App icon, App-/Play-Store listing, hero, social avatar, splash. |
| `oddspot-icon-light-open.svg` | Open eye, light square (`#E4EDE8`) | Same as above for light surfaces — press kit, documentation, light-mode UIs. |
| `oddspot-icon-dark-closed.svg` | Closed eye, dark | **Quiet / sleep / focus / scheduled maintenance.** _Not_ loading — it reads as intentional rest. |
| `oddspot-icon-light-closed.svg` | Closed eye, light | Same, light surfaces. |
| `oddspot-icon-dark-error.svg` | Tearing eye (iris + tear), dark | **Fatal errors only** — API failure, resource deleted, permission blocked, outage. Used on `/not-found` and `oddspot-error-landing.html`. |
| `oddspot-icon-light-error.svg` | Tearing eye, light | Same, light surfaces. |
| `oddspot-favicon-dark.svg` | Simplified open eye, dark | Browser tab icon, PWA, install prompts. Thicker strokes (8px) to survive at 16–32px. |
| `oddspot-favicon-light.svg` | Simplified open eye, light | Light-theme browser tabs and docs. |

### Rules
- **Don't use the tear eye as an empty state.** Zero-data ≠ error. Use the `sys://` brand tag + muted copy instead.
- **Don't draw new eye variants.** The iris + scleral-shape ratios are tuned. Extending the family is a brand decision, not an asset decision.
- **Match the background.** Dark eyes on dark surfaces, light eyes on light — the contrast ratio was set for that pairing only.
- **Size guidance** (from `docs/oddspot-icon-usage.md`): 1024 → App Store, 512 → OG/press, 256 → PWA, 128 → docs, 64 → onboarding lists, 32 → favicon.

### The inline SVG version

On the onboarding screen the eye is drawn inline (not via `<img>`) so the blink animation can be driven by CSS keyframes on `.ob-blink` (transform: scaleY(0.05) at 93–97% of a 6s loop). See `oddspot/src/components/ui/OnboardingOverlay.tsx` for the path definitions — they're lifted into `ui_kits/mobile_app/EyeMark.jsx` here.

---

## 2. UI glyphs (inline-SVG Lucide-family)

Every affordance icon in the codebase is an inline SVG with:

```
viewBox="0 0 24 24"
fill="none"
stroke="currentColor"
stroke-width="1.8" | "2"
stroke-linecap="round"
stroke-linejoin="round"
```

This is effectively **Lucide** (and occasionally **Feather**) at 1.8–2 px strokes, always `currentColor`. The codebase does not depend on a Lucide package; each icon is hand-inlined next to where it's used.

### Inventory from production (`oddspot/src/components/**`)

| Icon | Where | Source |
|---|---|---|
| Map (folded map polygon) | bottom tab bar | `BottomTabBar.tsx` |
| Swipe (card + phone bar) | bottom tab bar | `BottomTabBar.tsx` |
| Plus-in-circle | submit tab | `BottomTabBar.tsx` |
| Close (X) | swipe skip, popup dismiss | `SwipeActionBar.tsx` |
| Plus | add-to-trip FAB | `SwipeActionBar.tsx` |
| Heart (outline + solid) | save | `SwipeActionBar.tsx`, `AuthButton.tsx` |
| Calendar | trip dropdown item | `AuthButton.tsx` |
| Chevron down | dropdown toggle | `AuthButton.tsx` |
| Arrow-right | onboarding CTA | `OnboardingOverlay.tsx` |
| Arrow out of square (diagonal) | random-spot button | `RandomSpotButton.tsx` |
| Logout (door + arrow) | user dropdown | `AuthButton.tsx` |
| Sun / Moon | theme toggle | `ThemeToggle.tsx` |
| Filter (stack of 3 lines, tapered) | swipe filter | `SwipeView.tsx` |
| Chevron-right | trip progress arrow | `SwipeView.tsx` |
| Google G (official colors) | Google sign-in | `AuthButton.tsx` |

All of them sit on `var(--muted)` at rest and shift to `var(--accent)` or `var(--foreground)` on hover/active.

### Substitution policy

When you need an icon **that isn't already in the codebase**, use **Lucide** (or Feather) at:
- `stroke-width: 1.8` for 13–16px UI, `stroke-width: 2` for 18–24px
- Always `stroke="currentColor"`, never hard-coded colour (except the Google G icon)
- Always `stroke-linecap="round"` and `stroke-linejoin="round"`

You can either copy the SVG inline (match the codebase style — every production icon is hand-inlined) **or** load via CDN:

```html
<script type="module">
  import { createIcons, icons } from "https://unpkg.com/lucide@latest/dist/umd/lucide.min.js";
</script>
```

**Flag any substitution** in the file you're building — e.g. a code comment `/* lucide:map-pin (not in OddSpot core set) */`.

---

## 3. Emoji

**Effectively unused.** Searched the whole `src/` tree — emoji appear in exactly two places:

- `📍` as the address-label prefix in `spotDetail.addressPrefix` (both locales). Purely a pin-indicator substituting for an icon.
- `🗺️` in the `submit` success screen — a single moment, and a leftover that the visual-design doc would probably remove given a rewrite.

**Rule**: don't add emoji. If you need a place-marker, use the Lucide `map-pin` inline SVG. If you need a status, use the category colour dot.

---

## 4. Unicode as micro-icon

Three unicode glyphs appear as icons:

- `←` back arrow (Spot detail back button) — in a 40×40 circle, `color: #fff` on `rgba(0,0,0,0.35)`.
- `♥` / `♡` solid / outline heart — older spot-detail action bar (now superseded by inline SVG heart in swipe).
- `✕` close — on the map spot popup.

These are **legacy** in the codebase — new work should prefer inline SVG. If you're recreating 1:1, keep them; if you're designing new, upgrade to SVG.

---

## 5. Quick decision tree

```
Is it the app logo or brand moment?           → eye mascot (assets/logos/*.svg)
Is it an error / failure landing?             → oddspot-icon-*-error.svg
Is it a quiet / sleep state?                  → oddspot-icon-*-closed.svg
Is it a UI affordance (button, toggle, tab)?  → inline SVG, Lucide-style, 1.8–2 stroke, currentColor
Is it a status marker?                        → category colour dot, not an icon
Do I want emoji?                              → no
```
