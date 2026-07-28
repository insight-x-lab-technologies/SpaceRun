# SpaceRun — Architecture

Offline-first PWA endless runner. **Vanilla HTML/JavaScript only** — no frameworks
or bundler. Gameplay visuals/audio are procedural; generated PNG
icons in `assets/` are the platform-required binary exception. The entire game
lives under `src/` and is served as static files.

The optional Supabase Data API is the only remote integration. It is called
through `cloud.js` with a publishable key, anonymous auth and schema-scoped RLS;
the local `Storage` save remains functional when it is unavailable.

## Directory layout

```
SpaceRun/
├── AGENTS.md                 # Instructions for AI agents working on this repo
├── README.md                 # Marketing overview
├── docs/                     # Product + architecture documentation
│   ├── PRODUCT_VISION.md
│   ├── PRODUCT_FEATURES.md
│   ├── ARCHITECTURE.md
│   ├── DEVELOPMENT_GUIDE.md   # Fluxo de implementação e Definition of Done
│   ├── DATA_MODEL.md          # Schema-alvo, validação e migrações do save
│   ├── QUALITY_GATES.md       # Portões de segurança, testes e publicação
│   ├── ROADMAP.md
│   └── decisions/             # ADRs: decisões arquiteturais duráveis
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
        ├── cloud.js          # Supabase Auth anônimo + perfil/placar remoto opcional
        ├── i18n.js           # Translations (pt/en/es) + apply/t/setLang
        ├── ships.js          # Ship definitions (stats, draw fn, unlockAt, ability)
        ├── achievements.js   # Achievement defs + check (Fase 3)
        ├── audio.js          # Audio2: SFX + procedural music + optional MP3 (WebAudio)
        ├── themes.js         # Themes: list + apply/set/init of CSS vars + audio (cosmetic)
        ├── input.js          # Input: unified "thrust" + "ability" (Shift / touch button)
        ├── powerups.js       # PowerUps: declarative F4A pickup types/durations
        ├── missions.js       # F4B: projeção de missões/perfil a partir de Storage
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
storage → cloud → i18n → ships → achievements → audio → themes → input → powerups → missions → game → ui → share → main
```

Load order matters: `Game.init()` registers an `Input` listener. During
`UI.init()`, `I18n.init()` and `I18n.apply()` run first, then `Themes.init()`
applies the saved CSS variables and audio configuration through
`Audio2.setTheme(...)`. **Do not reorder or rely on `import`/`export`.**

### Module responsibilities

| Global   | Responsibility |
|----------|----------------|
| `Storage`| Save/load local progress, including `retention` (login streak, XP and bounded mission progress); validates the eight known mode ids, derives Custom Game unlocks from `totalMeters`, and preserves a Top 10 per `{mode, rulesetId}` category. |
| `Cloud`| Optional Supabase anonymous session, profile synchronization and unverified global leaderboard. Network failures are swallowed. |
| `Missions`| F4B daily/weekly mission projection from validated `Storage` counters. |
| `I18n`   | Dictionaries for `pt/en/es`; `t(key,vars)`, `apply()` (fills `data-i18n`), `setLang`, `init` (auto-detect). |
| `Ships`  | `list` of ship defs (each: `id`, `name`, `unlockAt`, `color`, `accent`, `stats`, `ability`, `draw`); `get(id)`, `getSkin(id)`. |
| `Achievements` | `all()`, `check(ctx)` (unlocks + returns new ids), `isUnlocked(id)`, `getName(id)`, `getDesc(id)`. Definitions live here; persistence via `Storage`. |
| `Audio2` | `uiClick()`, `crash()`, `unlock()`, `pickup()`, `ability()`, `shield()`, `startMusic(type)`, `stopMusic()`, `setTheme(t)`, `setMusicTracks(menuUrl, gameUrl)`, `setEnabled`, `setMusicEnabled`, `ensure`. `startMusic('zen')` uses the calm procedural variation. |
| `Themes` | `list` (defs with `id`, `name`, `vars`, `font`, optional `audio`), `get(id)`, `currentId()`, `apply(id)`, `set(id)` (persists + applies + emits `musicchange`), `init()` (applies saved theme, sets `--font` on `<html>`, sets `data-theme`, wires `Audio2.setTheme`). |
| `Input`  | `init()`, `isThrusting()`, `triggerAbility()`, `on('start'|'end'|'ability', fn)`. Unifies Space + pointer as "thrust"; `Shift` (desktop) and the floating touch button (`#ability-btn`) emit `ability`. |
| `PowerUps` | Declarative F4A pickup definitions (`magnet`, `doubleCrystals`, `shield`), their durations and deterministic type selection. It has no DOM or persistence dependency. |
| `Game`   | Engine: `init(canvas, onOver, onState)`, `start('classic'|'daily'|'zen'|'sprint'|'hardcore')`, `pause`, `resume`, `stop`, `getHud()` (meters, speed, mode objective, crystals, combo, ability and active power-ups), `state`. The Game Over callback receives run context plus bounded power-up use. Zen disables collisions, Sprint has a 60-second completion timer, and Hardcore removes pickups/shields and narrows terrain; every mode uses an explicit ruleset. |
| `UI`     | `init(playCb)`, `show`, `showGameOver` (records every run in the shared local leaderboard + achievements), `showPause/hidePause`, `showReady/hideReady`, `refreshRecords`, `showAchievement`, `showMilestone`. Renders Hangar (skins + upgrades), Achievements, Stats, Leaderboard, Share screens. |
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
- **over** — collision shows explosion + flash; Sprint completion uses the same
  result transition without a crash effect. After a short delay `onOverCb(payload)`
  fires and the Game Over screen is shown.

## Rendering pipeline (`Game.render`, every animation frame)

Single `<canvas>` resized to the viewport with DPR scaling in `resize()`. Resize,
orientation, visual-viewport and observed layout changes schedule a stabilized
second measurement, preventing a stale portrait backing buffer from stretching
on Safari/iOS after rotation.

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
2. **Procedural gameplay by default.** Do not introduce image or audio files
   for gameplay. Keep art/audio procedural (canvas drawing + WebAudio). The
   generated PWA PNG icons in `assets/` are the platform exception. The audio
   API supports an optional theme MP3 (`audio.menuMp3`/`audio.gameMp3`), but no
   current theme uses one and a binary asset must never be required to run.
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
9. **Version persistent data.** Changes to saved state follow `DATA_MODEL.md`,
   including validation, migration, backup and old-save fixtures. Consumers must
   not mutate Storage's internal object.
10. **Treat imported data as hostile.** Player text, localStorage, URLs, files
    and future P2P payloads are validated and rendered with safe DOM APIs.
11. **Version deterministic rules.** Daily runs, comparable scores and replays
    carry `rulesetId` and follow the accepted ADRs under `docs/decisions/`.
12. **Quality gates block release.** Follow `QUALITY_GATES.md`; contract,
    unit and E2E checks run before the Pages deploy. Offline validation on a
    real device, contrast checks, the performance baseline and human playtests
    remain recorded manual gates for project closeout; the v0.5.1 rotation
    retest is approved and the remaining manual records do not block F4A by
    product decision dated 2026-07-25.
13. **External donations remain optional.** The Donate screen uses static,
    localized links with `noopener noreferrer`; it creates no payment state or
    entitlement, and cosmetics stay unlockable through gameplay.

## Structural foundation (v0.5)

The v0.5 structural foundation preceded new gameplay systems. It delivered save
schema/migrations, safe DOM rendering, Daily logical parity, deferred PWA
updates, essential accessibility, CI and architecture contract tests. The code
baseline uses `spacerun.save.v2`, transactional `Storage` writes, safe rendering
for player names, ruleset-tagged results, deferred SW activation, contract tests
and the supported Playwright matrix. Performance measurement, contrast checks
and human playtest records remain final-release gates, not unfinished runtime
architecture or blockers for F4A.

New domain modules remain IIFE-globals. Their dependency and insertion point
must be documented before implementation and mirrored in `index.html`,
`tests/helpers/loadApp.js` and `sw.js`. Likely future boundaries are
`powerups.js`, `missions.js`, `protocol.js` and `ghost.js`; their existence is
not authorized until the roadmap item that needs them begins.

## Testing (dev only — não faz parte do app em produção)

O projeto usa ferramentas de teste **apenas em desenvolvimento**; o app servido
continua 100% vanilla/asset-free, sem build step no navegador.

- **Unitários / por componente** — [`vitest`](https://vitest.dev) + `jsdom`.
  Cobrem `Storage`, `I18n`, `Ships`, `Achievements`, `Audio2`, `Input`, `UI`,
  `Share`, o motor `Game` (máquina de estados, colisão, habilidades e
  determinismo do Daily Run) e o `main` (bootstrap + reload do SW em nova
  versão, com e sem controller prévio). Os módulos IIFE-globals são carregados num único
  escopo isolado via `tests/helpers/loadApp.js`, que injeta o DOM do
   `index.html` e expõe os globais (incl. `Themes`).
   - Rodar: `npm test` (ou `npm run test:unit`).
- **End-to-end** — [`@playwright/test`](https://playwright.dev) com Chromium.
  Um servidor estático mínimo (`tests/e2e/server.mjs`) serve `src/` e os specs
  exercitam o fluxo real: Home → Novo Jogo/Daily → ready → playing → Game Over
   → Share, além de Hangar (20 naves), Conquistas (23), Temas e Configurações.
  - Rodar: `npm run test:e2e` (precisa de `npx playwright install chromium`).
  - Atenção: a configuração atual reutiliza a porta 4173 quando ela já está
    ocupada. Confirme que o servidor existente serve este `src/` antes de tomar
    um resultado como válido; isso é uma limitação conhecida do harness.

### Seams de teste (inofensivos em produção)
- `Game._debug` expõe `world`, `obstacles`, `pickups`, `ship`, `tick(dt)`,
  `hit()`, `recordSpawns(b)` e `getSpawnSig()` para dirigir/inspecionar a
  simulação de forma determinística (as assinaturas de spawn validam a paridade
  do Daily Run).
- `Input._reset()` limpa o estado de empuxo e os ouvintes registrados pelos
  testes (o `init` é idempotente para não duplicar listeners do `window`).

## How to extend

- **Add a ship:** append an entry to `Ships.list` with `unlockAt`,
  `stats`, `color`/`accent`, and a `draw` function. No other code changes needed.
- **Add an i18n string:** add the key to all three language objects in
  `i18n.js`; reference it via `data-i18n` or `I18n.t()`.
- **Add a settings toggle:** extend `Storage` defaults, add the control in
  `index.html` + `ui.js` `renderSettings`, and read it where needed.
- **Add a theme:** append an entry to `Themes.list` with `id`, `name`, `vars`
  (CSS custom properties), `font`, and an optional `audio` (`{ click,
  menuWave, gameWave, menuSeq, gameSeq, menuMp3?, gameMp3? }`). No other code
  changes needed — `Themes.apply` sets the vars on the document root and
  `Themes.set` persists + notifies `Audio2`. Add the theme name key to all
  three i18n dictionaries.
- **Add a screen:** add a `.screen` section in `index.html` with a
  `data-action`, handle it in `UI.handleAction`, and keep `I18n` text external.
- **Tune difficulty:** edit `terrain()` (gap/amp) and `updateGameplay()`
  (speed/spawn interval) in `game.js`. Keep the "easy start, ramping" curve.
- **Add music:** extend the `Audio2` sequencer (`MENU_SEQ` / `GAME_SEQ`) or add
  a new `startMusic(type)`.
