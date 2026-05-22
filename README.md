# OddSpot

A map-first discovery app for the kind of places that don't make it into guidebooks — weird temples, abandoned buildings, oversized roadside statues, and other oddities scattered around Taiwan.

This is a personal project. Source of truth for visual language is a custom Acid / Y2K theme system layered on top of Mapbox GL. Active development, see the roadmap at the bottom.

## Stack

- Framework — Next.js 16 (App Router), React 19, TypeScript
- Data — Prisma 7 with PostgreSQL (Neon) in production, SQLite for local dev
- Auth — NextAuth v5, Google and LINE OAuth
- Map — Mapbox GL, react-map-gl, four custom themes (terminal / blueprint / caution / midnight)
- 3D — Three.js and @react-three/fiber for marker and UI accents
- State — Zustand for UI state, TanStack Query for server state
- Animation — Framer Motion for page transitions and gestures, GSAP for sequenced effects
- i18n — next-intl (zh-TW now, en planned)
- Hosting — Vercel

## A few things worth pointing out

- **Guest-mode-first.** Saved spots live in localStorage until the user signs in, at which point they sync to the database. The sync is idempotent and merges by spot ID, so reopening the app on a different device doesn't drop anything.
- **Four-theme Mapbox style system.** Each theme ships as a JSON style file plus a CSS variable set, both swapped at runtime. Markers and overlay UI read the same CSS variables, so changing theme repaints the whole map in one go.
- **Design handoff workflow.** High-fidelity references are produced in Claude Design, iterated as HTML variants via a custom skill, then translated into React. The references live alongside the code under `src/design-reference/` so the gap between design and implementation is small.
- **Cursor trail and click effects** are implemented as a layer above the map, not as Mapbox layers, so they don't trigger map repaints when animating.

## Project structure

```text
src/
  app/                  Next.js App Router pages and route handlers
  components/
    map/                MapView, SpotMarker, RouteSheet, ExternalNavSheet, ...
    spots/              SpotDetailShell, SpotCard, ...
    providers/          PageTransition, ThemeProvider, QueryProvider
  lib/
    mapbox/             Directions API wrapper, deep-link generators
    mapbox-styles/      Four Mapbox style JSON files
    constants/          Category definitions, theme tokens
  store/                Zustand stores (map, route planner, theme)
  design-reference/     HTML/CSS references, not imported by app code
prisma/
  schema.prisma
  seed.ts               Seed spots used for local dev
docs/                   Project planning, API design, component specs (zh-TW)
.ai-context/            Module-level technical notes (zh-TW)
```

## Getting started

```bash
git clone https://github.com/<you>/oddspot.git
cd oddspot
npm install
cp .env.example .env.local
```

Fill in the values in `.env.local`:

```env
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ...
DATABASE_URL=file:./dev.db          # or a Postgres URL
AUTH_SECRET=                        # openssl rand -base64 32
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_LINE_ID=
AUTH_LINE_SECRET=
```

Then run migrations, seed, and build:

```bash
npx prisma migrate dev
npx prisma db seed
npm run build
```

For full deployment notes (Vercel, Neon, OAuth callback URLs), see `DEPLOYMENT.md`.

## Roadmap

- [x] Spot schema, seed data, category system (8 categories)
- [x] Map view with custom markers and four themes
- [x] Page transitions, cursor trail, click effects
- [x] NextAuth v5 with Google and LINE OAuth, guest-to-account sync
- [x] Mapbox Directions integration with multi-stop route planning
- [ ] Spot detail page — shell and animations done, content layout in progress
- [ ] Acid / Y2K design language v2 rollout
- [ ] Swipe-to-discover mode
- [ ] User-uploaded spots and Cloudinary image hosting
- [ ] English localization

## A note on documentation

Internal docs under `docs/` and `.ai-context/` are written in Traditional Chinese — this started as a solo project and bilingual upkeep wasn't worth the friction. The structure is consistent enough that file names alone give you a reasonable map. Open an issue if you want a specific section translated.

## License

MIT
