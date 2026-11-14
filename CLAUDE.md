# Driftwood Cove

A cozy fishing game for one person, played upright on an iPhone as a Home Screen web app. Walk
round a small island, cast into the sea, the deep water off the pier, the pond and the creek,
fill the journal, sell fish to Gus, do errands from the board, and spend tokens from shiny and
golden fish on chests that spin a strip of prizes. It is in the genre of social fishing hangouts
but has its own island, characters, art and sound; keep it that way (no names, characters, art
or music from any existing game).

## Commands

```
npm run dev            # local dev server
npm test               # unit tests (Vitest)
npm run build          # type-check and build to dist/
node tools/shot.mjs out.png "at=pier&time=dusk"             # screenshot the built game (upright phone)
node tools/shot.mjs out.png "at=shop" 402 874 1 "window.__cove.open('shop')"   # ...after a script
node tools/play-check.mjs outdir                             # three scripted casts from the pier, with pictures
node tools/touch-check.mjs                                   # emulated-phone taps through every menu, 44 pt buttons
node tools/icons.mjs [prefix]                                # render menu icons from the models
NODE_USE_ENV_PROXY=1 node tools/assets/make-models.mjs       # fal: picture -> Tripo 3D -> slimmed GLB (+ rigging)
NODE_USE_ENV_PROXY=1 node tools/assets/make-media.mjs        # fal: textures, title art, icon, sounds, music
tools/blender/run.sh [id ...]                                # Blender (bpy): models fal did not make
```

Run `npm test`, `npm run build` and `node tools/touch-check.mjs` before pushing. The browser tools
need Playwright's Chromium (cloud sessions have it). Every push runs the tests and build and
deploys to GitHub Pages.

## How it is put together

- **three.js with WebGLRenderer**, Vite, TypeScript. Pure logic (island heights, fish, rolls,
  reeling, economy, quests, chests, save, clock) has no three.js and is tested under Vitest.
- **Every state is a URL** (`src/config.ts`): `at` (a name in `PLACES` in `src/world/layout.ts`),
  `time` (dawn/day/dusk/night/hour), `weather` (clear/rain), `hud=0`, `title=0`, `fresh=1` (a new
  save that is not kept), `zoom`, `yaw`, `quality=low`, `mute=1`, `models=0`, `zoo=fish|hat|f-|all`,
  `warp=n` (run time faster, for the tools). `window.__cove` exposes `state()`, `teleport`, `face`,
  `press`/`release` (the big button), `open(sheet, tab)`, `give(coins, tokens)`, `catchNow`.
- **The island** (`src/world/island.ts`, `layout.ts`): heights from a function sampled every metre;
  `Heightfield.heightAt` uses the same triangle split as the terrain mesh. `waterAt` says which
  water is where (ocean, deep, pond, creek). Hand-placed buildings in `PLACED`, scattered trees and
  flowers in `scatter.ts` (seeded, kept off paths and water). Props are instanced per kind
  (`props.ts`); compressed geometry is widened to floats before baking (`toFloat`).
- **Ground and water** are the only custom shaders: the terrain blends the painted textures by
  splat weights (`terrain.ts`), the water colours by depth over a height texture with foam at the
  shore (`water.ts`).
- **Sky** (`sky.ts`): hand-tuned palettes for moments of the day, blended by the hour, greyed by rain.
  A day on the island is 24 minutes (`clock.ts`); Settings can follow the real clock. Rain comes in
  spells chosen from the clock alone.
- **Characters** are Tripo-rigged models posed in code: `poses.ts` (pure joint angles: walk, cast,
  reel, sit, wave, dance, cheer, clap, uke, row) and `rig.ts` (turns them into bone rotations about
  the character's own axes, worked out from the skeleton). Hats sit on the head bone; the rod is
  placed from the hand each frame.
- **Fishing** (`src/fishing/`): `fish.ts` (36 species and odds and ends, data), `roll.ts` (what bites,
  size, shiny/golden), `reel.ts` (the reeling minigame, fixed-step), `fishing.ts` (cast, bobber,
  line, bite, hook, reel, land). Tune feel with `REEL` and the tests in `fishing.test.ts`.
- **Progress** (`src/game/`): `economy.ts` (rods, bait, coolers, hats, furniture, levels),
  `quests.ts` (the board), `crates.ts` (chests, odds, the strip), `progress.ts` (what a catch, a
  sale or an errand does), `save.ts` (read defensively; add a field with a default, never change
  the meaning of one). Saved in `localStorage` (`cove.save`; chalk in `cove.chalk`).
- **Menus** are bottom sheets (`src/ui/`): shop, journal, bag, board, chests, more, fun; plus the
  ukulele pads and the chalk board. The HUD (`hud.ts`) has money and level at the top, the action
  buttons by the right thumb, and Bag/Journal/Fun/More along the bottom. The bottom third is the
  movement stick; anywhere higher turns the camera.
- **Islanders** (`src/npc/npcs.ts`): three fishers walk routes between spots and fish; Gus stands by
  the shop. **Boat** (`src/world/boat.ts`), **placed furniture** (`placed.ts`).
- **Sound** (`src/audio/audio.ts`): MP3s made through fal, played with Web Audio from the first touch.

## What the game leans into

`docs/what-players-love.md` is research into what players of social fishing games love besides
the other players, and how each point shows up here. Keep to it when adding things:

- **Fishing depth:** five qualities by bait (`Variant` in `fish.ts`: normal, fine, shiny, golden,
  prismatic; odds in `BAITS[].quality`), lures that change which fish bites (`LURES` and
  `rollCatch` in `roll.ts`), treasure chests from casts, coin bags, twin catches, rain clouds
  that follow you after a lucky catch, tiny to giant species, a quip on every catch, and a
  journal tab of what is biting now.
- **Luck:** scratch tickets (`tickets.ts`, `ui/scratch.ts`: the prize is decided at purchase and
  pays back a little under the price on average), chests with a spinning strip (`crates.ts`).
- **Secrets:** sea glass, bounce mushrooms and jumping, a metal detector with things buried
  each day (`world/secrets.ts`, `world/finds.ts`).
- **Customization and toys:** characters, hats, accessories (`x-*`, placed by measuring the body),
  titles from achievements (`titles.ts`), a ukulele with every note, six chord slots and a strum.
- **Feel:** music plays a piece, rests a minute or two and comes back (`audio.ts`); a retro-pixel
  setting; a daily save backup (`cove.save.backup`); a tip the first time each thing happens.

Generated characters may have their rig's left and right swapped. `Character.faceForward` looks
at the head from both ways (the snout or beak sticks out) and turns the model to face +z.

## Assets

Generated, not drawn in code. `tools/assets/manifest.mjs` holds every prompt.

- Models: a picture through fal (`gpt-image-1.5`), a shape from it (`tripo3d/h3.1/image-to-3d`),
  slimmed with glTF-Transform (WebP textures, meshopt) into `public/models/<id>.glb`. Characters
  are rigged through fal (`fal-ai/tripo3d/rig`); the game poses them. `public/models/index.json`
  says each model's height and kind.
- When fal could not be used (its balance ran out part way), the rest were built in Blender:
  `tools/blender/` (fish, hats, rods, bobber, ukulele, furniture, well, mailbox, fence, icons).
  They are marked `source: "blender"` in the index, and `make-models.mjs` replaces them with fal
  ones when it is next run with balance.
- Icons: the fal pictures with the background cut away, or rendered from the model in the game's
  light (`tools/icons.mjs`).
- Textures, the title picture, the Home Screen icon, sounds and music: `make-media.mjs`.
- Keys are never in the repo: the fal key is a network secret on the environment
  (`queue.fal.run`); run the asset tools with `NODE_USE_ENV_PROXY=1`.

## Conventions

- +x east, +z south, +y up, metres. Sea level y = 0. Yaw 0 faces +z.
- Portrait, one thumb: things to read at the top, things to press in the bottom third, at least
  44 points tall. Everything lives in `#app` (sized by `fillScreen` for the Home Screen).
- Unhurried: losing a fish only means casting again; nothing is timed.
