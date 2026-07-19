# AGENTS.md

You are an AI agent working on **SpaceRun**, a serverless PWA endless-runner
game built with **vanilla HTML/JavaScript** (no frameworks, no bundler, no
backend, and no binary art/audio assets — everything is procedural).

## Before you change anything

Read the documentation in [`docs/`](./docs) first. It defines the product scope,
architecture, and the non-negotiable design premises you must follow:

1. **[docs/PRODUCT_VISION.md](./docs/PRODUCT_VISION.md)** — the macro vision and
   design pillars of the game.
2. **[docs/PRODUCT_FEATURES.md](./docs/PRODUCT_FEATURES.md)** — the full list of
   features already implemented (gameplay, ships, i18n, audio, PWA, etc.).
3. **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** — module layout, the global
   IIFE pattern, the game state machine, the render pipeline, and the rules that
   **must** be respected when evolving the code (vanilla-only, asset-free,
   i18n in 3 languages, single canvas, state transitions, SW caching).
4. **[docs/ROADMAP.md](./docs/ROADMAP.md)** — upcoming features (currently a
   placeholder to be filled in a future iteration).

Keep these documents in sync when you add or change functionality. Update
`PRODUCT_FEATURES.md` and `ARCHITECTURE.md` whenever you introduce a new feature,
screen, ship, setting, or change the architecture.

## Quick orientation

- Source code lives in `src/` (open `src/index.html` and `src/js/*.js`).
- Module load order in `index.html` is fixed and intentional — do not reorder.
- All user-facing strings go through i18n (`pt`/`en`/`es`); add keys to all three.
- Persistence is via `Storage` (localStorage). Progression unlocks are by total
  accumulated meters.
- The game uses a single `<canvas>` with three parallax layers + procedural
  terrain/obstacles/ships, and a `idle → ready → playing → paused → over` state
  machine.

When in doubt, prefer the simplest change that respects the existing patterns
described in `docs/ARCHITECTURE.md`.
