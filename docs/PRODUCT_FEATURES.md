# SpaceRun — Product Features

Version **0.1**. All gameplay, art, and audio are procedural; the app is a
serverless PWA (vanilla HTML/JS, no frameworks, no binary assets).

## Core gameplay

- **Endless runner, left-to-right scroll.** The world scrolls toward the player;
  the ship stays at a fixed horizontal position and only moves vertically.
- **Single unified "thrust" control.**
  - Desktop: hold **Space** to climb, release to fall.
  - Mobile / tablet: **touch and hold** the screen to climb, lift finger to fall.
- **Increasing difficulty (smooth ramp).** Speed starts at 220 and ramps gently
  with distance (`220 + difficulty * 58`, capped at 700, where `difficulty =
  meters / 1200`). The vertical gap starts wide (`0.78·H`) and tightens slowly to
  a floor of `0.34·H`, so new players get a forgiving opening.
- **"Ready" start state.** Clicking *New Game* enters a paused `ready` state with
  an on-screen prompt (*"Press SPACE or tap the screen to start"*). The ship
  floats and does not fall until the first input.
- **Procedural terrain.** Top and bottom tunnel walls generated from layered
  sine waves; the playable gap starts wide and tightens over distance.
- **Procedural obstacles.** Asteroids spawn ahead and drift left; spawn rate and
  size increase with distance. Circle-vs-ship collision ends the run.
- **Game Over screen.** Shows distance flown, best record, flight time, and any
  newly unlocked ship.

## Visuals (all procedural, single `<canvas>`)

- **Three parallax layers.**
  1. Far background — slow-drifting starfield.
  2. Near background — faster stars + glowing nebulae.
  3. Local space — terrain, obstacles, ship, particles (the play field).
- DPR-aware rendering for crisp visuals on retina/mobile.
- Thruster particle trail and explosion effects (toggleable).
- Procedurally drawn ships (no sprites).

## Game feel & feedback

Polish that makes the core loop satisfying (Fase 0 of the roadmap):

- **Screen shake** on crash/explosion (disabled when "Reduce motion" is on).
- **Hitstop** — a ~70 ms micro-freeze on impact to add weight.
- **Responsive audio:** a thrust blip when the player starts a pulse, and a
  distinct hit layer on collision (in addition to the crash sound).
- **Near-miss sparks:** cyan sparks fly off the tunnel walls when the ship grazes
  them, giving constant proximity feedback.
- **Run stats:** each run records its flight time; `totalRuns` and `bestTime`
  (time of the best-distance run) are tracked in `Storage` and shown on Home/Hangar.

## Progression & collectibles (Fase 1)

- **Crystals (collectibles):** glowing pickups drift through the free space. Flying
  through one grants crystals and a short chime; collecting in a chain builds a
  **combo multiplier** (HUD shows `x{mult} · {combo}`). Crystals are a virtual
  currency accumulated in `Storage` for future cosmetic unlocks — they never grant
  an in-run advantage.
- **Distance milestones:** reaching 1k/2.5k/5k/10k/… meters pops a celebratory
  banner with a jingle, giving immediate progress feedback.
- **New obstacle types** (procedural, appear gradually with distance):
  - *Asteroid field / debris*: a small cluster of asteroids in a spread.
  - *Micro black hole*: a gravity well that pulls the ship toward its event
    horizon (deadly on contact).
  - *Laser gate*: a vertical energy beam with a moving safe gap that toggles on/off.
- **Biomes by distance:** every 5,000 m the star/nebula palette and terrain glow
  shift through 5 procedural themes, keeping runs visually fresh.
- **Daily Run / Seed (pendente):** o modo "Diário" usaria a data como seed para que
  todos recebessem o mesmo layout de obstáculos no dia (fundamento para leaderboards
  na Fase 3). Está **temporariamente desativado** até garantir paridade 100%
  determinística entre partidas no mesmo dia.

## Ships & progression

- **10 ships** in the Hangar: 5 base + 5 advanced.
  - Base: Scout (free), Falcon (500 m), Tank (1,500 m), Phantom (3,500 m),
    Nova (8,000 m).
  - Advanced: Vortex (15,000 m), Quasar (30,000 m), Pulsar (60,000 m),
    Nebula (120,000 m), Singularity (250,000 m).
- Ships are **unlocked by total accumulated meters** (across all runs), not per
  run. Each ship has stats: `agility`, `size` (hitbox), `thrust`.
- Hangar lets the player preview and select an unlocked ship.

## Screens & navigation

- **Home:** New Game, Hangar, Settings, Donate, Install (when supported).
- **Hangar:** ship grid with locked/unlocked/selected states.
- **Settings:** Sound, Music, Particles, **Reduce motion**, **High contrast**,
  Language (pt/en/es), Erase progress.
- **Donate:** Ko-Fi and Buy Me a Coffee external links.
- **Pause:** Resume / Menu (also auto-pauses when the tab is hidden).
- **Game Over:** distance, best, **time**, **crystals collected**,
  unlock notification, replay/menu/hangar.
- **Home / Hangar:** show best distance plus **total runs** and **best time**.

## Internationalization (i18n)

- **3 languages:** Portuguese (pt-BR), English (en), Spanish (es).
- **Auto-detection:** uses the browser language; any unsupported language
  defaults to **English**. Choice is persisted and changeable in Settings.
- All user-facing text flows through `I18n.t()` / `data-i18n` attributes.

## Audio (procedural, WebAudio)

- **Sound effects:** UI click, crash, ship-unlock jingle.
- **Two background music tracks** generated live:
  - Menu music (calm pad + arpeggio).
  - Gameplay music (faster, driving arpeggio + bass).
- Music and SFX are independently toggleable (Settings). Audio unlocks on the
  first user gesture (browser autoplay policy).

## PWA / Installability

- **Web App Manifest** (`manifest.json`) in English with `categories`.
- **Icons** (PNG, generated): `icon-192.png`, `icon-512.png`,
  `icon-maskable-512.png`, `apple-touch-icon.png` (180×180).
- **iOS metadata:** `apple-mobile-web-app-*` tags + apple-touch-icon link.
- **Install button** on Home that appears only when installation is supported
  (`beforeinstallprompt`). On iOS (not supported), a manual-install hint is shown
  instead.
- **Service Worker** (`sw.js`) caches the app for full offline play.

## Meta

- Copyright footer: *© 2025 Insight X Lab Technologies · v0.1*.
- Thematic brand: cyan/magenta neon on deep-space navy.
