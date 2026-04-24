# OddSpot — Mobile Web App UI Kit

High-fidelity recreation of the OddSpot Next.js mobile web app. All components are based on the production codebase at `oddspot/src/`.

## Open
- `index.html` — clickable prototype with 4 screens: Onboarding · Map · Swipe · Spot Detail
- Tap around using the bottom nav; swipe cards by dragging; tap a map pin to open the popup → tap the popup to open detail.

## Components
| File | Mirrors |
|---|---|
| `EyeMark.jsx` | `OnboardingOverlay.tsx` eye SVG + blink |
| `BottomTabBar.jsx` | `ui/BottomTabBar.tsx` |
| `BrandTag.jsx` | The `sys://oddspot` system-label convention |
| `Button.jsx` | Primary / accent-outline / ghost variants |
| `CategoryBadge.jsx` | `lib/constants/categories.ts` palette |
| `StatusBadge.jsx` | `lib/constants/status.ts` |
| `SpotCard.jsx` | `swipe/SwipeCard.tsx` (drag-to-vote) |
| `SwipeActionBar.jsx` | `swipe/SwipeActionBar.tsx` |
| `MapPopup.jsx` | `map/SpotPopup.tsx` |
| `OnboardingScreen.jsx` | `ui/OnboardingOverlay.tsx` |
| `MapScreen.jsx` | `/map` page |
| `SwipeScreen.jsx` | `swipe/SwipeView.tsx` |
| `DetailScreen.jsx` | `/spots/[id]` page |
| `SAMPLE_SPOTS.js` | Seed spot data |

## Caveats
- No real map provider — the map canvas is a styled grid + pins. Integrating Leaflet / Mapbox is out of scope for a UI kit.
- Drag-to-swipe uses plain pointer events (no framer-motion) — behavior is cosmetic.
- Chinese copy is lifted verbatim from `i18n/messages/zh-TW.json`.
