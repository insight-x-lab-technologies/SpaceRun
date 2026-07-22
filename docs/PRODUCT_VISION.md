# SpaceRun — Product Vision

## What SpaceRun is

SpaceRun is a **serverless, installable endless runner** set in deep space. The
player pilots a ship that auto-scrolls from left to right through procedurally
generated galaxies. The only control is **thrust**: hold to climb, release to
fall. The challenge is to thread the ship through a twisting tunnel of cosmic
terrain and drifting asteroids for as long as possible, while the universe gets
faster and tighter the further you travel.

It is built as a **Progressive Web App (PWA)** with **vanilla HTML/JavaScript** —
no frameworks, no build step, no backend, and **no gameplay binary art or audio
assets**.
Everything you see and hear (ships, terrain, asteroids, stars, nebulae, sound
effects, and background music) is generated **procedurally at runtime**. This
keeps the project tiny, instantly loadable, fully offline-capable, and trivial
to host on any static file server.

## Target experience

- **Pick up and play in under a second.** One button (or one thumb). Perfect for
  both a 30-second break and a 30-minute grind.
- **Endless variety.** Every run is a fresh stretch of space, generated on the
  fly — no two flights are identical.
- **A sense of progression.** A growing fleet of ships (20 in total) is unlocked
  by total distance flown, rewarding returning players.
- **Feels native everywhere.** Runs identically on desktop widescreen, tablets,
  and phones, in both landscape and portrait, and installs to the home screen
  like a native app on Android, Windows, and (manually) iOS.
- **Speaks the player's language.** English, Portuguese, and Spanish with
  automatic detection.

## Design pillars

1. **Procedural by default.** Gameplay art and sound are drawn/synthesized in
   code. Generated PNG icons are retained only where the PWA platform requires
   them; an optional theme MP3 is supported by the audio layer but none ships
   with the current themes.
2. **Zero friction.** No accounts, no downloads, no paywalls to play. Just open
   and fly.
3. **Accessible controls.** A single unified "thrust" input works for keyboard
   and touch, on every device and orientation.
4. **Calm-to-intense curve.** Starts forgiving (wide gaps, slow speed) and ramps
   into a tense, fast, narrow gauntlet as distance grows.
5. **Community-supported.** A lightweight donation path (Ko-Fi / Buy Me a
   Coffee) lets players fuel future updates.

## Long-term direction (high level)

SpaceRun should evolve into a richer space-runner: more ship variety and
customization, deeper procedural biome variety, scoring/leaderboards, and
additional game modes — while never breaking the core "hold to fly" promise or
the serverless, asset-free architecture that makes it special.

> Current version: **v0.5** — Insight X Lab Technologies.
