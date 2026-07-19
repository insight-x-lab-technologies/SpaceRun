# SpaceRun — Architecture

Serverless PWA endless runner. **Vanilla HTML/JavaScript only** — no frameworks,
no bundler, no backend, and **no binary art/audio assets** (everything is
procedural). The entire game lives under `src/` and is served as static files.

## Directory layout

```
SpaceRun/
├── AGENTS.md                 # Instructions for AI agents working on this repo
├── README.md                 # Marketing overview
├── docs/                     # Product + architecture documentation
│   ├── PRODUCT_VISION.md
│   ├── PRODUCT_FEATURES.md
│   ├── ARCHITECTURE.md
│   └── ROADMAP.md
└── src/
    ├── index.html            # Single page; screens + canvas + script order
    ├── manifest.json         # PWA manifest (English)
    ├── sw.js                 # Service worker (offline cache)
    ├── icon.svg              # Favicon (procedural SVG)
    ├── assets/               # Generated PWA PNG icons (platform requirement)
    │   ├── icon-192.png
    │   ├── icon-512.png
    │   ├── icon-maskable-512.png
    │   └── apple-touch-icon.png
    ├── css/
    │   └── style.css
    └── js/
        ├── storage.js        # localStorage persistence (progress, settings)
        ├── i18n.js           # Translations (pt/en/es) + apply/t/setLang
        ├── ships.js          # Ship definitions (stats, draw fn, unlockAt, ability)
        ├── achievements.js   # Achievement defs + check (Fase 3)
        ├── audio.js          # Audio2: SFX + procedural music (WebAudio)
        ├── input.js          # Input: unified "thrust" + "ability" (double-tap)
        ├── game.js           # Game: engine, state machine, render, physics
        ├── ui.js             # UI: screen routing, hangar, settings, gameover
        ├── share.js          # Share: procedural score-card canvas (Fase 3)
        └── main.js           # Bootstrap: wires modules, HUD, music, PWA
```

## Module model

Each `js/*.js` file is an **IIFE that exposes a single global object**. There is
**no ES module system and no bundler** — files communicate only through these
globals and are loaded in a fixed `<script>` order in `index.html`:

```
storage → i18n → ships → achievements → audio → input → game → ui → share → main
```

Load order matters: `i18n.init()` reads `Storage`, `Game.init()` registers an
`Input` listener, and `UI.init()` calls `I18n.init()`/`I18n.apply()` before
building screens. **Do not reorder or rely on `import`/`export`.**

### Module responsibilities

| Global   | Responsibility |
|----------|----------------|
| `Storage`| Save/load progress (`best`, `totalMeters`, `totalRuns`, `bestTime`, `crystals`, `unlocked`, `settings`, `achievements`, `history`, `streak`/`maxStreak`, `leaderboard`, `playerName`, `shipSkins`, `upgrades`); `recordRun(m, time, crystals)`, `recordLeaderboard`, skin/upgrade helpers, `reset()`. |
| `I18n`   | Dictionaries for `pt/en/es`; `t(key,vars)`, `apply()` (fills `data-i18n`), `setLang`, `init` (auto-detect). |
| `Ships`  | `list` of ship defs (each: `id`, `name`, `unlockAt`, `color`, `accent`, `stats`, `ability`, `draw`); `get(id)`, `getSkin(id)`. |
| `Achievements` | `all()`, `check(ctx)` (unlocks + returns new ids), `isUnlocked(id)`, `getName(id)`, `getDesc(id)`. Definitions live here; persistence via `Storage`. |
| `Audio2` | `uiClick()`, `crash()`, `unlock()`, `pickup()`, `ability()`, `shield()`, `startMusic(type)`, `stopMusic()`, `setEnabled`, `setMusicEnabled`, `ensure`. |
| `Input`  | `init()`, `isThrusting()`, `on('start'|'end'|'ability', fn)`. Unifies Space + pointer as "thrust"; double-tap emits `ability`. |
| `Game`   | Engine: `init(canvas, onOver, onState)`, `start(mode)`, `pause`, `resume`, `stop`, `getHud()` (meters, speed, crystals, combo, ability, abilityCd, shield, dash, slowmo), `state`. Handles ship abilities, shield/invuln, dash/slowmo world factors, crystal upgrades, achievement checks. |
| `UI`     | `init(playCb)`, `show`, `showGameOver` (records run + leaderboard + achievements), `showPause/hidePause`, `showReady/hideReady`, `refreshRecords`, `showAchievement`, `showMilestone`. Renders Hangar (skins + upgrades), Achievements, Stats, Leaderboard, Share screens. |
| `Share`  | `render(canvas, payload)` draws a procedural PNG "score card" onto a canvas (no assets). |
| `main`   | Bootstraps everything; HUD loop (incl. ability status); music switching; install (`beforeinstallprompt`); SW registration. |

## Game state machine

`Game` exposes a small state machine. Always transition through `setState(s)`
so the `onState` callback (wired in `main.js`) can keep UI/HUD/music in sync.

```
        start()
 idle ──────────► ready ──(first thrust input)──► playing
                     ▲                                │   ▲
                     │                                │   │ pause()/resume()
                     │                                ▼   │
                     └──────────── stop() ──────────┘  paused
                                                  playing ──(collision)──► over
                                                                        │
                                                          (700ms)         ▼
                                                                     onOver(meters)
```

- **idle** — menu/background only; ship not built.
- **ready** — world built, ship floats, **no physics/falling**; shows the start
  prompt overlay; waits for the first `Input` "start" event.
- **playing** — full gameplay (physics, spawning, collisions, HUD, game music).
- **paused** — frozen; pause overlay; music continues.
- **over** — explosion + flash; after a short delay `onOverCb(meters)` fires and
  the Game Over screen is shown.

## Rendering pipeline (`Game.render`, every animation frame)

Single `<canvas>` resized to the viewport with DPR scaling in `resize()`.

1. `drawSpaceBg` — base gradient.
2. `drawNebulae` — parallax layer 2 (slow).
3. `drawStars` — parallax layer 1 (slowest).
4. `drawNearStars` — parallax layer 2 (faster stars).
5. `drawTerrain` — local top/bottom walls (`terrain(wx)` sine model).
6. `drawObstacles` — asteroids (only when in `ready`+ states).
7. `drawShip` — selected ship (procedural), with thruster flame while thrusting.
8. `drawParticles` — thruster trail / explosion.
9. `drawFlash` — crash flash (over state only).

Parallax scroll speed = `world.speed` while playing, slow (60) otherwise. All
entity positions are derived from `world.scroll` + screen X, so the world is
effectively infinite and resolution-independent.

## Design premises (MUST be followed for future evolution)

1. **Vanilla only.** No frameworks, no bundlers, no `import`/`export`, no
   transpilers. Keep the IIFE-global pattern and the script load order.
2. **Asset-free by default.** Do not introduce `.jpg/.png` (except the required
   PWA icons) or audio files for gameplay. Keep all art/audio procedural
   (canvas drawing + WebAudio). The PWA PNG icons in `assets/` are generated,
   not hand-edited.
3. **i18n for every user-facing string.** Add new keys to **all three**
   dictionaries (`pt`, `en`, `es`) in `i18n.js`. Use `data-i18n` in HTML and
   `I18n.t()` in JS. Never hardcode UI text.
4. **Responsive by design.** Works in landscape + portrait, desktop + mobile.
   Rely on `resize()` + CSS; never assume a fixed viewport.
5. **Single source of truth for progress.** All persistence goes through
   `Storage`. Do not hardcode unlocks/records.
6. **State transitions via `setState`.** New gameplay states must update
   `render()` and `update()` guards and notify `onState`.
7. **Unified input.** New control schemes must flow through `Input` as the
   "thrust" abstraction (or extend it explicitly) so desktop/touch stay in sync.
8. **Cache new static assets.** Any new file referenced by the app must be added
   to the `ASSETS` array in `sw.js` (or it will not work offline).

## How to extend

- **Add a ship:** append an entry to `Ships.list` with `unlockAt`,
  `stats`, `color`/`accent`, and a `draw` function. No other code changes needed.
- **Add an i18n string:** add the key to all three language objects in
  `i18n.js`; reference it via `data-i18n` or `I18n.t()`.
- **Add a settings toggle:** extend `Storage` defaults, add the control in
  `index.html` + `ui.js` `renderSettings`, and read it where needed.
- **Add a screen:** add a `.screen` section in `index.html` with a
  `data-action`, handle it in `UI.handleAction`, and keep `I18n` text external.
- **Tune difficulty:** edit `terrain()` (gap/amp) and `updateGameplay()`
  (speed/spawn interval) in `game.js`. Keep the "easy start, ramping" curve.
- **Add music:** extend the `Audio2` sequencer (`MENU_SEQ` / `GAME_SEQ`) or add
  a new `startMusic(type)`.
