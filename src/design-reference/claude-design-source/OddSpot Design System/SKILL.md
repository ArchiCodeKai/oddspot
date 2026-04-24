---
name: oddspot-design
description: Use this skill to generate well-branded interfaces and assets for OddSpot, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quickstart

- **Brand in one line**: B-Grade Spot Explorer — Taiwan-focused discovery of weird, unexplainable city corners. Low-volume, terminal-inflected, observant not promotional.
- **Tokens**: `colors_and_type.css` — import it once, then reach for CSS custom properties (`var(--background)`, `var(--accent)`, etc).
- **Logos**: `assets/logos/` — 8 canonical eye-mascot SVGs. Never redraw.
- **Components**: `ui_kits/mobile_app/*.jsx` — ready-to-compose JSX for buttons, cards, tabs, icons.
- **Voice**: see `README.md` → CONTENT FUNDAMENTALS. No emoji, no hype, no "we/our". Chinese first, English heavily tracked.
- **Visuals**: see `README.md` → VISUAL FOUNDATIONS. Dark-default, two corner languages (2px + 16–24px), glass blur for overlays, accent glow for elevation.
- **Icons**: see `README_ICONOGRAPHY.md`. Inline SVG Lucide-style, 1.8–2px stroke, `currentColor`.
