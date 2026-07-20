# SpaceRun — Product Features

Version **0.2**. All gameplay, art, and audio are procedural; the app is a
serverless PWA (vanilla HTML/JS, no frameworks, no binary assets). Fase 2
(habilidades, skins e upgrades de naves) e Fase 3 (conquistas, estatísticas,
ranking local e compartilhamento) estão implementadas.

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
- **Wide-orientation layout (desktop / tablet & mobile landscape):** the Home
  panel is 50% wider with inline SVG icons on every menu button and the
  secondary actions (Hangar, Achievements, Statistics, Leaderboard, Settings,
  Donate) laid out in a 2-column grid (New Game + Daily span the full width).
  The Hangar also widens 50% and shows ships in a 2-column grid. Portrait
  (mobile/tablet) keeps the original single-column layout.

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

- **20 ships total** (10 base + 10 advanced added in Fase 2), with distinct
  stats and unlock thresholds up to 5,000,000 m.
  - Base: Scout (free), Falcon (500 m), Tank (1,500 m), Phantom (3,500 m),
    Nova (8,000 m).
  - Advanced: Vortex (15,000 m), Quasar (30,000 m), Pulsar (60,000 m),
    Nebula (120,000 m), Singularity (250,000 m).
  - Fase 2: Comet (300k), Aurora (400k), Raptor (550k), Helix (700k),
    Titan (900k), Spectre (1.2M), Ember (1.6M), Zephyr (2.2M),
    Cosmos (3M), Eclipse (5M).
- Ships are **unlocked by total accumulated meters** (across all runs), not per
  run. Each ship has stats: `agility`, `size` (hitbox), `thrust`.
- **Special abilities** (Fase 2) triggered by a **dedicated ability control** —
  `Shift` on desktop or a floating touch button on the right-center (mobile/tablet):
  `dash` (burst of speed), `shield` (absorbs one hit), `slowmo` (bullet-time for
  ~2 s). The button glows when the power is ready and dims while recharging.
- **Procedural ship skins** (Fase 2): the player can repaint any unlocked ship
  (body + accent colors) in the Hangar; the choice is saved in `Storage`.
- **Crystal upgrades** (Fase 2): spend accumulated crystals on permanent
  `+agility` / `+thrust` multipliers (cosmetic feel, not pay-to-win).
- Hangar lets the player preview, customize (skin/upgrades) and select an
  unlocked ship.

## Meta & Social (Fase 3)

- **Achievements:** 13 challenges (distance milestones, crystals per run, combo,
  survival time, full fleet, record streak, daily). Unlocks show a toast + jingle
  and persist in `Storage`. Screen accessible from Home.
- **Detailed statistics:** total runs, total/average distance, average/best time,
  best streak, total crystals, and a recent run history — computed from
  `Storage` and shown in the Statistics screen.
- **Local leaderboard:** Top 10 runs (with optional player name) shown in the
  Ranking screen; auto-recorded on every run.
- **Share score card (serverless):** generate a procedural PNG "score card"
  (`share.js`, canvas only) from the Game Over screen — download or share via
  the Web Share API. No backend involved.
- **Daily Challenge:** implemented in the engine (seeded RNG) but **not yet
  exposed in the UI** — pending deterministic-parity validation (see ROADMAP).

## Screens & navigation

- **Home:** New Game, Hangar, Settings, Donate, Install (when supported). The footer
  also shows **social share icons** (WhatsApp, Telegram, X, Facebook, TikTok,
  Instagram and copy-link) that open a localized share message with the game URL
  (TikTok/Instagram use the native Web Share sheet; copy-link copies to clipboard).
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
- **Service Worker** (`sw.js`) caches the app for full offline play, using a
  **network-first** strategy for navigations and **stale-while-revalidate** for
  assets so a new server version (incl. iPhone/Safari) is always picked up while
  staying offline-capable.

## Meta

- Copyright footer: *© 2025 Insight X Lab Technologies · v0.2*.
- Thematic brand: cyan/magenta neon on deep-space navy.
