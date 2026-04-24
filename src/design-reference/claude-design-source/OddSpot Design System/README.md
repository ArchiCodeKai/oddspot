# OddSpot Design System

> **B 級景點探勘系統** — 發現台灣城市裡那些說不清楚的地方。

This is a self-contained design system extracted from the **OddSpot** product (`ArchiCodeKai/oddspot`). It is meant to be read by human designers _and_ by agents producing mocks, slides, prototypes, and production code under the OddSpot brand.

---

## Product context

**OddSpot** is a Taiwan-focused exploration tool — not a tourism wiki (it's explicitly _not_ Atlas Obscura), not a social platform. Its core loop is one sentence:

> _"附近現在有什麼怪東西值得去一下？"_  
> _"What weird stuff is near me right now that's worth a quick detour?"_

### Target user
- 對城市邊角地景感興趣的台灣使用者
- 想填空閒時間做臨時探索的人
- 對廢墟、奇廟、巨物、荒謬景觀有興趣的人

### Core experience
1. Open app → auto-locate → see weird spots nearby
2. **Map mode** — distribution at a glance, tap for summary
3. **Swipe mode** — Tinder-style card stack; right = save, left = skip
4. **Spot detail** — full info, legend, recommended time
5. One-tap navigate via Google Maps

### 8 奇特分類 (category taxonomy)
詭異廟宇 (weird-temple) · 廢棄場所 (abandoned) · 巨型物體 (giant-object) · 俗豔裝置 (kitsch) · 邊緣建築 (marginal-architecture) · 都市傳說 (urban-legend) · 荒謬景觀 (absurd-landscape) · 奇異店面 (odd-shopfront)

### Product surfaces
| Surface | What it is |
|---|---|
| **Mobile web app** (primary) | Next.js 16, React 19, `/map`, `/spots/[id]`, `/submit` |
| **Brand error / icon pages** | Static HTML — `oddspot-error-landing.html`, `oddspot-icon-preview.html` |

There is **no native app, no marketing website, no docs site** in the attached codebase. The Next.js app _is_ the product; landing is `redirect('/map')`.

---

## Sources used to build this system

All sources are **attached but read-only** — do not assume the reader has access.

- **Codebase** (mounted): `oddspot/` — Next.js 16 / React 19 / Tailwind v4 / Prisma / next-auth / framer-motion / next-intl.
  - Design tokens: [`oddspot/src/app/globals.css`](./)
  - Category / status constants: `oddspot/src/lib/constants/{categories,status}.ts`
  - Visual-design spec: `oddspot/.ai-context/global/visual-design.md`
  - Icon usage guide: `oddspot/docs/oddspot-icon-usage.md`
  - i18n copy: `oddspot/src/lib/i18n/messages/{zh-TW,en}.json`
- **GitHub**: `ArchiCodeKai/oddspot` (same content, `main` branch).
- **Figma**: not provided.

---

## INDEX (what's in this folder)

```
.
├── README.md                 ← you are here
├── SKILL.md                  ← agent-invocable skill wrapper
├── colors_and_type.css       ← CSS custom properties (copy/import)
├── assets/
│   └── logos/                ← 8 canonical brand SVGs (eye family + favicons)
├── preview/                  ← small cards that populate the Design System tab
├── ui_kits/
│   └── mobile_app/           ← high-fidelity recreation of the Next.js app
│       ├── index.html        ← clickable prototype (map · swipe · detail · 404)
│       └── *.jsx             ← individual component sources
└── slides/                   ← (none — no deck templates were provided)
```

### What to read first
- **Branding prototype / mock quickly?** → `SKILL.md` + `colors_and_type.css` + `assets/logos/`
- **Recreating a screen?** → `ui_kits/mobile_app/` (open `index.html`)
- **Picking semantic colors?** → section 3 below + `colors_and_type.css` tokens

---

## CONTENT FUNDAMENTALS

The copy is the brand. OddSpot is written like a **quiet, observant Taiwanese native** — dry, a little wry, never hype. The English localisation is terser and more clinical than the Chinese.

### Voice pillars

1. **Observant, not enthusiastic.** The tagline is `發現台灣城市裡那些說不清楚的地方` / `Discovering the unexplainable corners of Taiwan's cities` — note "說不清楚" ("can't quite explain"). Not "amazing", not "hidden gems", not "must-see". The product points at stuff; it does not sell it.
2. **Low volume.** Very few exclamation marks. No emoji as decoration (📍 appears exactly once, as an address prefix). CTAs are short verbs: `開始探索` · `收藏` · `跳過` · `導航前往`.
3. **Terminal-inflected English.** UI tags read like system output — `sys://oddspot`, `error_code · 404 · not_found`, `B-Grade Spot Explorer`, `OddSpot / Failure Surface`. When bilingual, the English gets heavier tracking and caps; the Chinese stays body-weight.
4. **Emotional honesty about failure.** Error states aren't "Oops!" — they name what happened: _"這個地方 / 不存在"_ ("this place / doesn't exist"), _"The map lost sight of this place."_ Failure is a feeling, not a button.
5. **Status is data, not judgement.** A spot's status is `active / uncertain / disappeared / pending` — `disappeared` isn't a sad emoji, it's just a fact. `可探索` / `狀況不明` / `已消失` / `審核中`.

### Grammar & form

- **Bilingual, Traditional Chinese first.** Default locale `zh-TW`; EN toggle is strictly literal translation, never marketing-rewrite.
- **Pronouns**: second-person `你` ("you") sparingly, mostly in directive copy (_"你找的頁面可能已消失"_). Never `我們` ("we"). The system doesn't speak as a team; it just narrates.
- **Casing**:
  - English headings → `TITLE CASE`, and almost always `UPPERCASE WITH WIDE TRACKING` for labels.
  - Chinese → no special casing; punctuation uses full-width `，。「」` where natural, half-width in terminal-feel contexts.
- **Numbers, codes, counters** use Space Mono (English) — `20 KM`, `404`, `25.0478, 121.5319`. Never the content font for data.
- **No emoji in the UI chrome.** The eye mascot SVG carries that load. (One exception: `📍` as an address pin prefix in spot-detail labels.)

### Examples from the codebase

| Surface | Source string (zh-TW) | English |
|---|---|---|
| Onboarding badge | `B 級景點探勘系統` | `B-Grade Spot Explorer` |
| Tagline | `發現台灣城市裡那些\n說不清楚的地方` | `Discovering the unexplainable\ncorners of Taiwan's cities` |
| 404 headline | `這個地方\n不存在` | `The map lost sight of this place.` |
| 404 body | `你找的頁面可能已消失、被移動，或者從來就不在地圖上。` | — |
| Swipe empty | `附近景點已全部看完` | `All nearby spots explored` |
| Trip limit | `今日行程已達上限（5 個地點）` | `Trip limit reached (5 spots max)` |
| Submit empty | `發現了什麼奇怪的地方？分享給大家！` | — |
| Error meta | — | `Softly catastrophic` |

### Do / don't

- ✅ `狀況不明` (uncertain)
- ❌ `可能找不到喔！` (over-explains, adds emotion)
- ✅ `The map lost sight of this place.`
- ❌ `Oops! Looks like we couldn't find that.`
- ✅ `sys://oddspot`
- ❌ `Welcome to OddSpot!`

---

## VISUAL FOUNDATIONS

OddSpot's visual identity is the intersection of three references: **late-night convenience store**, **late-90s CRT terminal**, and **Taiwan B-grade signage**. It should always feel like you're looking at a slightly un-official instrument.

### Colour

- **Two themes, both native.** Dark is the default and the "true" look — `#040c0a` background, `#c6e8e0` foreground, `#00e5cc` accent. Light theme (`#f0f7f5` / `#0d2e26` / `#00a896`) exists for documentation surfaces and user preference, but _every brand illustration is designed dark-first._
- **Accent = signal.** `#00e5cc` is never decoration. It marks: the active tab, the primary CTA outline, the eye's iris, "active" status, trip-plan glyphs. If nothing in the region should be tapped, it shouldn't be on-screen.
- **Category hues are saturated, not pastel.** Temple orange, kitsch pink, legend violet — read straight off Taiwan street signage. Used at `[color]18` (~10% opacity) as badge backgrounds, `[color]30` as borders, full saturation for map pins + selected state.
- **No gradients except protection overlays.** Hero images get a single `linear-gradient(transparent → panel)` fade at the bottom for text readability. Onboarding background uses radial glows at ~6–16% accent-alpha. No purple-to-blue marketing gradients, ever.

### Type

- **Space Mono everywhere by default**, including Chinese. This is the _terminal posture_ that makes OddSpot feel like an instrument.
- **Noto Sans TC is the escape hatch** — only when Chinese reading comfort beats terminal feel. Applied via `.font-content` class on: spot names, descriptions, filter labels, toast messages, user names in dropdowns.
- **Aggressive tracking on English.** Badges use `0.22em`–`0.4em`. This is non-negotiable — it's what pulls the brand away from generic mono-font dev-tool aesthetic.
- **Display = tight negative tracking.** `OddSpot` wordmark is `letter-spacing: -0.04em` with `text-shadow: 0 0 64px rgb(var(--accent-rgb) / 0.3)`.

### Spacing & layout

- **4pt grid.** Spec targets 8/12/16/20/24 as the common steps.
- **Mobile-first, 44×44 hit targets minimum** (WCAG 2.5.5). Every tap target in the codebase sets `minHeight: 44`.
- **Card anatomy** — image 52–60vh top, content region overlaps upward by −24px with `rounded-t-3xl` (24px), action bar is _always_ fixed bottom with `backdrop-blur`.
- **Fixed elements** are bottom-anchored, not top. Tab bar bottom, action bar bottom, filter sheet rises from bottom. Only the back-button floats top-left (and _only_ on hero-image screens).

### Corners

OddSpot uses two corner languages and it is intentional:
- **`2px` (near-square)** — buttons, badges, icon-squares, tab bar cells, auth button, toggles, swipe action FABs. This is the _terminal / instrument_ feel.
- **`16–24px`** — cards, spot popup (`rounded-2xl`), detail sheet top (`rounded-t-3xl`), bottom sheets. This is the _content container_ feel.

There is almost nothing at `8px`. Don't invent a middle option.

### Shadows & elevation

```
--shadow-glow: 0 0 24px rgb(var(--accent-rgb) / 0.08)
--shadow-lift: 0 16px 48px rgb(var(--background-rgb) / 0.24),
               0 0 32px rgb(var(--accent-rgb) / 0.06)
```

- Glow first, drop-shadow second. Elevation is done with coloured light (accent glow) more than with grey drop.
- Selected / active elements get a stronger glow: `box-shadow: 0 0 8px rgb(var(--accent-rgb) / 0.7)` on tab indicator lines, 16px on heart-flash.
- No inner shadows anywhere.

### Borders & lines

- `1px solid var(--line)` (~10% accent) is the universal hairline — cards, panels, inputs.
- `1px solid var(--line-strong)` (~18% accent) on hover / focus / selected.
- Dividers inside dropdowns are `1px solid var(--line)` with `4px` margin.
- No `border: 2px` solid bars.

### Transparency, blur & glass

Glassmorphism is endorsed by the system and used everywhere a UI surface sits on top of a map or image:

```
background: var(--panel-glass-strong); /* rgb(panel / 0.9) */
backdrop-filter: blur(14px → 20px);
border: 1px solid var(--line);
box-shadow: var(--shadow-glow);
```

Uses: bottom tab bar (`blur(18px)` + top border), control cluster in map top-right corner, spot popup floating over map, swipe action FABs, filter bottom sheet (`blur(20px)`), onboarding full-screen dimmer (`blur(16px)`).

### Backgrounds

- **Solid by default.** `var(--background)` is the canvas.
- **Radial accent glows** on brand moments only — onboarding and error landing:  
  `radial-gradient(circle at 76% 14%, rgba(0, 229, 204, 0.16), transparent 18%)`.
- **CRT scanlines** — a subtle `repeating-linear-gradient` overlay at `~0.7% alpha` is the signature brand texture. Used on onboarding.
- No full-bleed photography chrome. Hero images are _content_, not backgrounds.
- No hand-drawn illustration. No patterns. No grain beyond the scanlines.

### Imagery colour treatment

- Spot cover images run full-width, full-saturation. They're user-submitted Taiwan street photos — _do not_ filter, grade, or desaturate.
- A `linear-gradient(to bottom, transparent 50%, var(--panel) 100%)` protection gradient bleeds the bottom edge into the card surface.
- Placeholder for missing images: solid `var(--panel-light)`, never greyscale photo.

### Motion

- **Library**: `framer-motion` for React, plain CSS keyframes for static HTML.
- **Default easings** (from codebase):
  - Page exit: `cubic-bezier(0.32, 0.72, 0, 1)` over 260ms
  - Button press-out: `cubic-bezier(0.4, 0, 1, 1)` over 180ms
  - Spring for tab-indicator / scale: `stiffness: 400, damping: 25` (or 500/35 for shared-layout)
- **Hover states** — border colour shifts (`var(--line)` → `var(--line-strong)`) and text colour shifts (`var(--muted)` → `var(--accent)` or `var(--foreground)`). _Rarely_ opacity — opacity is reserved for "loading" / "disabled" states.
- **Press states** — `whileTap={{ scale: 0.92 }}` on back buttons. Action FABs use `scale: 1.1` on the active state (trip-add flash).
- **Ambient animation** — the onboarding eye pulses (`filter: drop-shadow`), blinks every 6s, and the loading indicator is three 1.5px dots bouncing at 150ms stagger. Everything else is static.

### Layout rules

- Max content width on mobile surfaces: `max-w-sm` (384px) for cards, `max-w-lg` (512px) for forms.
- Page-level content padding: `px-5` (20px) on mobile.
- Cards in swipe mode: `height: min(520px, 70vh)`.
- Hero image: 52–60vh.
- Action bars: always fixed, never sticky.

### Fine-print signatures (the "B-grade" details)

These are small touches that appear in several places and together signal the brand:

- Leading slash chrome: `OddSpot / 404`, `OddSpot / Failure Surface`
- `sys://` URL-style brand tag
- `tab-indicator` — a 40px × 1px glowing line, not a filled pill
- `tracking-[0.4em]` badges over lowercase muted captions
- Status colours expressed as `text-[color]/15` background + `text-[color]` text

---

## ICONOGRAPHY

See [`README_ICONOGRAPHY.md`](./README_ICONOGRAPHY.md) for the full write-up on iconography, the eye mascot family, and Lucide substitution rules.

**Short version:** there are two parallel icon systems — the **custom eye-mascot family** (brand moments, identity, error states) and an **inline-SVG Lucide-lookalike set** (UI affordances, stroke-based, 1.8–2px, `currentColor`). Emoji are essentially absent. See the iconography doc for specifics.

---

## Caveats / substitutions

- **Fonts**: The production stack uses `next/font/google` to serve Space Mono + Noto Sans TC. This system references them via `@import` from Google Fonts — same family, same weights. No local TTF bundle. If you need offline usage, please ship the TTFs.
- **Figma**: not provided. Everything here comes from code + 4 hand-curated docs (`visual-design.md`, `icon-usage.md`, category/status constants, i18n strings).
- **Photography**: no stock image pack — all spot covers in the real app are user-submitted. UI-kit mocks use `picsum.photos`-style placeholders with colour-matched overlays.

---

## Using this system

- **In this project** — `@import url("./colors_and_type.css");` in an HTML file, copy logos from `assets/logos/`, reuse JSX from `ui_kits/mobile_app/`.
- **As an agent skill** — see `SKILL.md`. Designed to be dropped into `~/.claude/skills/oddspot-design/` and invoked by name.
- **In production Next.js code** — prefer the real tokens in `oddspot/src/app/globals.css` directly; this design system is a _mirror_ of those, not the source of truth.
