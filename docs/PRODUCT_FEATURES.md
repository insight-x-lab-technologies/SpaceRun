# SpaceRun — Product Features

Version **0.1**. All gameplay, art, and audio are procedural; the app is a
serverless PWA (vanilla HTML/JS, no frameworks, no binary assets).

## Core gameplay

- **Endless runner, left-to-right scroll.** The world scrolls toward the player;
  the ship stays at a fixed horizontal position and only moves vertically.
- **Single unified "thrust" control.**
  - Desktop: hold **Space** to climb, release to fall.
  - Mobile / tablet: **touch and hold** the screen to climb, lift finger to fall.
- **Increasing difficulty.** Speed starts at 220 and ramps with distance
  (`220 + difficulty * 70`, capped at 720). The vertical gap narrows and terrain
  variation grows with distance.
- **"Ready" start state.** Clicking *New Game* enters a paused `ready` state with
  an on-screen prompt (*"Press SPACE or tap the screen to start"*). The ship
  floats and does not fall until the first input.
- **Procedural terrain.** Top and bottom tunnel walls generated from layered
  sine waves; the playable gap starts wide and tightens over distance.
- **Procedural obstacles.** Asteroids spawn ahead and drift left; spawn rate and
  size increase with distance. Circle-vs-ship collision ends the run.
- **Game Over screen.** Shows distance flown, best record, and any newly
  unlocked ship.

## Visuals (all procedural, single `<canvas>`)

- **Three parallax layers.**
  1. Far background — slow-drifting starfield.
  2. Near background — faster stars + glowing nebulae.
  3. Local space — terrain, obstacles, ship, particles (the play field).
- DPR-aware rendering for crisp visuals on retina/mobile.
- Thruster particle trail and explosion effects (toggleable).
- Procedurally drawn ships (no sprites).

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
- **Settings:** Sound, Music, Particles, Language (pt/en/es), Erase progress.
- **Donate:** Ko-Fi and Buy Me a Coffee external links.
- **Pause:** Resume / Menu (also auto-pauses when the tab is hidden).
- **Game Over:** distance, best, unlock notification, replay/menu/hangar.

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
