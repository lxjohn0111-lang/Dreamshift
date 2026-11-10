# DREAMSHIFT — The Rooms Between

A first-person surreal puzzle adventure in a single HTML file (`dreamshift.html`): Three.js / WebGL 2 / Web Audio.
Every room, texture and sound is generated procedurally at runtime — there are no asset files.

## Play

Open **`dreamshift.html`** in a current desktop Chrome, Edge or Firefox (double-click it, or serve the folder with any static server).
An internet connection is needed once per load, to fetch Three.js r170 from a CDN (jsDelivr, with unpkg and cdnjs as fallbacks).

| Input | Action |
| --- | --- |
| `W A S D` / mouse | move / look |
| `Space`, `Shift` | jump, sprint |
| `E` | interact |
| Left mouse | use the dream ability (grasp / release, or choose a gravity glyph) |
| `Q` / wheel / `1` `2` | switch ability |
| `R` | recall dreamt objects to where you found them |
| `Tab` | show the current hint again |
| `Esc` (or `P`) | pause · `F3` debug overlay (fps, seed, director decisions) |

Progress, choices, fragments, the dream seed and settings are saved to `localStorage` automatically.

## What is in it

* **Six dimensions** – The Endless Hotel (hub; rebuilt differently on every return), Impossible Reality, The Sky Between,
  The Forgotten Mall, The Giant Room and The Final Dream – plus the bedroom where the dream starts and ends.
* **Dream Shifting** – rooms change when unobserved, corridors stretch while watched, a mirror becomes a place, a path assembles itself,
  and every door opens directly onto another world with no loading screen (the far side is real geometry clipped to the doorway).
* **Dream Grasp** – perspective scaling: a held object keeps its apparent size, so where you let go decides how big it really is.
* **Gravity** – glyphs decide which way is down; walls, ceilings and falling sideways across the sky are all legitimate routes.
* **Dream Memory** – choices (the lamp, the kite, the coin, the music box …), the order you visit the dreams and the fragments you find
  change palettes, lighting, hotel events, echoes of earlier dreams inside later ones, and which of the three endings are open.
* **Procedural director** – seeded, weighted, memory-aware decisions (logged in the `F3` overlay). `Dream again` after an ending starts
  a new cycle with a new seed. A seed can be typed in the New Dream dialog or passed as `?seed=1234`.

## QA

`tests/playthrough.mjs` drives a complete run (new game → every dimension → ending → dream again, with a mid-game reload + Continue)
in headless Chromium and fails on any broken step or console error. See the header of that file for how to run it.
URL flags for testing: `?seed=N`, `?quality=low|medium|high|ultra`, `?debug=1`, `?nolock=1` (play without pointer lock).
