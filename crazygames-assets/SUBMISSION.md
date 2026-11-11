# CrazyGames submission notes — Dreamshift: The Rooms Between

## What to upload
Upload the **contents of the `crazygames/` folder** (keep the structure):

```
crazygames/
  index.html                      the whole game (HTML + CSS + JS)
  lib/three.module.min.js         Three.js r170, bundled (no CDN needed)
  fonts/*.woff2                   Cormorant Garamond + Jost, bundled (no Google Fonts)
  licenses/                       MIT (Three.js) and OFL (fonts) licence texts
```

Total size about 1.3 MB, 13 files. The only outside request is the CrazyGames SDK script
(`https://sdk.crazygames.com/crazygames-sdk-v3.js`).

## SDK integration (HTML5 SDK v3)
- `await CrazyGames.SDK.init()` runs before anything is read or written.
- **Data module:** progress (`dreamshift.save.v1`) and settings (`dreamshift.settings.v1`) are stored only through
  `SDK.data.getItem / setItem / removeItem`. Nothing is written to `localStorage` while the SDK is active.
  In the developer portal, enable progress saving / the Data module for the game.
- **Game module:** `loadingStart` / `loadingStop` around boot, `gameplayStart` / `gameplayStop` whenever play starts,
  pauses, returns to the menu or ends, `happytime` on every collected fragment and on an ending.
- **Mute:** `SDK.game.settings.muteAudio` and its change listener silence the game.
- If the SDK cannot initialise (for example when the build is opened outside CrazyGames) the game still runs and
  falls back to `localStorage`.
- No ads are requested by the game.

## Store page text
**Title:** Dreamshift: The Rooms Between

**Short description:** A first-person dream you solve by changing how big things are and which way is down.

**Description:**
You wake at 3:17 a.m. in a room that is longer than you left it. Behind door 317 is an endless hotel, and behind the
hotel's doors are four dreams: a sky of floating islands, a forgotten mall with a reflection that disagrees, a bedroom
grown to the size of a country, and a stone world where gravity is a decision.

- Grasp objects and let perspective decide their real size: a matchbox staircase, a plank that is secretly a bridge, a moon.
- Choose which way is down and walk on walls and ceilings.
- The dream remembers what you do. Choices change later places, and there are three endings.
- Every room, texture and sound is generated as you play; "Dream again" grows a different dream from a new seed.

**Controls (desktop):** WASD move · mouse look · Space jump · Shift sprint · E interact · left mouse grasp / release /
choose gravity · Q switch ability · R recall objects · Tab hint · Esc pause

**Controls (touch):** left thumb walks · drag on the right to look · round button acts on what you look at · Jump button

**Suggested category / tags:** Puzzle, Adventure · first-person, 3D, surreal, atmospheric, exploration, singleplayer

## Cover images in this folder
- `cover-1920x1080.png` (landscape 16:9)
- `cover-800x1200.png` (portrait 2:3)
- `cover-800x800.png` (square 1:1)

Check the exact sizes the portal asks for when you submit; these are the sizes I believe it uses.

## Before submitting
- Test the upload in the CrazyGames preview / QA tool, on desktop and on a phone.
- The technical limits I could confirm are a 250 MB total size, 1,500 files and a 50 MB initial download
  (20 MB for the mobile homepage); this build is far below all of them.
