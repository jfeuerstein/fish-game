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
node tools/icons.mjs [prefix]                                # render menu icons from the models (into art/icons)
node tools/assets/lofi.mjs [models|icons|ground|title] [id]  # cut art/ down to what the game draws, in public/ (free, ten seconds)
node tools/face-check.mjs out.png [--chars ...] [--face happy] # every character's head from three sides, for placing the drawn eyes
NODE_USE_ENV_PROXY=1 node tools/assets/make-tripo.mjs id ... # Tripo direct: picture -> model -> slimmed GLB + icon (--kinds hat,extra,prop,fish)
NODE_USE_ENV_PROXY=1 node tools/assets/make-ground.mjs       # Tripo: the ground's painted textures, made to repeat
node tools/fit-check.mjs outdir [items] [--chars ...] [--socket]   # every hat/accessory on every character, front and side
NODE_USE_ENV_PROXY=1 node tools/assets/make-models.mjs       # fal: picture -> Tripo 3D -> slimmed GLB (+ rigging)
NODE_USE_ENV_PROXY=1 node tools/assets/make-media.mjs        # fal: textures, title art, icon, sounds, music
tools/blender/run.sh [id ...]                                # Blender (bpy): models fal did not make
```

Run `npm test`, `npm run build` and `node tools/touch-check.mjs` before pushing. The browser tools
need Playwright's Chromium (cloud sessions have it). Every push runs the tests and build and
deploys to GitHub Pages.

## How it is put together

- **three.js with WebGLRenderer**, Vite, TypeScript. The game's look is lo-fi (see The look). Pure logic (island heights, fish, rolls,
  reeling, economy, quests, chests, save, clock) has no three.js and is tested under Vitest.
- **Every state is a URL** (`src/config.ts`): `at` (a name in `PLACES` in `src/world/layout.ts`),
  `time` (dawn/day/dusk/night/hour), `weather` (clear/rain), `hud=0`, `title=0`, `fresh=1` (a new
  save that is not kept), `zoom`, `yaw`, `quality=low`, `mute=1`, `models=0`, `zoo=fish|hat|f-|all`,
  `warp=n` (run time faster, for the tools), `look=smooth` (draw full size with soft light, as before the lo-fi look). `window.__cove` exposes `state()`, `teleport`, `face`,
  `press`/`release` (the big button), `open(sheet, tab)`, `give(coins, tokens)`, `catchNow`.
- **The island** (`src/world/island.ts`, `layout.ts`): heights from a function sampled every metre;
  `Heightfield.heightAt` uses the same triangle split as the terrain mesh. `waterAt` says which
  water is where (ocean, deep, pond, creek). Hand-placed buildings in `PLACED`, scattered trees and
  flowers in `scatter.ts` (seeded, kept off paths and water). Props are instanced per kind
  (`props.ts`); compressed geometry is widened to floats before baking (`toFloat`).
- **Ground and water** have shaders of their own, and the finished picture one more
  (`src/fx/screen.ts`). The ground is pixel art, sixteen pixels to the metre: five 64-pixel
  tiles, and what each ground pixel is (grass, sand, earth, rock, paving) read from the splat
  weights as a texture, so grounds meet along a stair of pixels (`terrain.ts`). The water is flat
  bands of colour by depth over a height texture, with foam, wave marks and glints as hard
  pixels, eight to the metre, moved five times a second (`water.ts`). Each keeps its old smooth
  form for `look=smooth`.
- **Sky** (`sky.ts`): hand-tuned palettes for moments of the day, blended by the hour, greyed by rain.
  A day on the island is 24 minutes (`clock.ts`); Settings can follow the real clock. Rain comes in
  spells chosen from the clock alone.
- **Hats** sit on each character's skull, an ellipsoid in `HEADS` (`src/player/fit.ts`) that
  leaves out ears and the frog's eyes; `socket=1` draws it. Each hat in `HATS` says how it is worn
  (`on`, `ring` or `perch`), how deep, and where its band and opening are, read off a cut through
  the model (`node tools/hat-cut.mjs hat-id ...` prints one). Tripo's models face +x, so hats are turned a
  quarter. Check every change with `tools/fit-check.mjs`.
- **Emotes** include flop, twirl, honk and fish slap (islanders react); Settings › Silly has big heads.
- **Characters** are Tripo-rigged models posed in code: `poses.ts` (pure joint angles: walk, cast,
  reel, sit, wave, dance, cheer, clap, uke, row) and `rig.ts` (turns them into bone rotations about
  the character's own axes, worked out from the skeleton). Hats sit on the head bone; the rod is
  placed from the hand each frame.
- **Fishing** (`src/fishing/`): `fish.ts` (43 kinds of fish, odds and ends, and the treasure chest, as data), `roll.ts` (what bites,
  size, shiny/golden), `reel.ts` (the reeling minigame, fixed-step), `fishing.ts` (cast, bobber,
  line, bite, hook, reel, land). Tune feel with `REEL` and the tests in `fishing.test.ts`.
- **Pearls and the Lucky Gull.** Pearls (the save's `tokens`) are the premium currency: only the
  rarest catches give them (`tokensFor` in `crates.ts`: golden 1, prismatic 3, any legendary 2,
  more the first time), plus a few from errands, treasure and digging. They are spent only at the
  Lucky Gull arcade booth on the plaza, and every game there is the same thing: one pearl in, one
  cosmetic out (`pull` in `src/ui/chests.ts`; `rollPrize` and `ODDS` in `crates.ts`: common 46%,
  uncommon 30%, rare 15%, epic 7%, legendary 2%; what is not owned yet is three times as likely; a
  duplicate gives pearls back). The prize is given the moment the pearl goes in. The games are only
  ways of watching it (`src/game/arcade.ts`, pure and tested; `src/ui/arcade.ts`): the Gull Wheel
  (a CS-style strip of prizes slowing onto yours; `stripReveal`), the Bait Bandit (three reels of
  prizes landing on yours, the last one teasing for an epic or legendary), Flying Fish (a fish
  leaping through bands of rarity and peaking in your prize's), and a scratch card of nine with
  yours three times (`src/ui/scratch.ts`). No bets, no choices, no coins. The prize pool
  (`PRIZES`) holds only things never sold for coins (`prize` in `economy.ts`); a test holds it.
  `showPrize` is the card every game ends on; `src/ui/fanfare.ts` celebrates by rarity. Coins are
  only for Gus's shop.
- **Sounds from patch.gg**: `tools/assets/get-patch-sounds.mjs` fetches Kenney's CC0 casino
  sounds, steel-drum jingles and ticks from Patch's open asset library (public API, no sign-in),
  makes them MP3s in `public/audio/` and writes their credits to `public/audio/credits.json`.
  Patch's models are flat low-poly and do not match the Tripo look; its sounds do fit.
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
- **Luck:** the Lucky Gull's four games (above), treasure chests and coin bags from casts.
- **Secrets:** sea glass, bounce mushrooms and jumping, a metal detector with things buried
  each day (`world/secrets.ts`, `world/finds.ts`).
- **Customization and toys:** characters, hats, accessories (`x-*`, placed by measuring the body),
  titles from achievements (`titles.ts`), a ukulele with every note, six chord slots and a strum.
- **Feel:** music plays a piece, rests a minute or two and comes back (`audio.ts`); a setting for
  chunkier pixels; a daily save backup (`cove.save.backup`); a tip the first time each thing happens.

Generated characters may have their rig's left and right swapped. `Character.faceForward` looks
at the head from both ways (the snout or beak sticks out) and turns the model to face +z.

## Assets

Generated, not drawn in code. `tools/assets/manifest.mjs` holds every prompt.

- **Two folders.** The asset tools write soft, detailed models and pictures into `art/`
  (`art/models`, `art/icons`, `art/textures`, `art/title.webp`). Nothing there is shipped.
  `tools/assets/lofi.mjs` cuts each down to what the game draws, in `public/`: a model to a few
  hundred triangles (`CUT`, by kind) with a 64 to 256 pixel texture in the island's inks; an
  icon to a 48-pixel sprite with a dark line round it; the title picture to 201 pixels across.
  It draws the five ground tiles itself, as pixel art. It costs nothing and takes ten seconds;
  the Tripo and fal tools run it when they finish. Never edit `public/models`, `public/icons` or
  `public/textures` by hand, and change how lo-fi a thing is in `lofi.mjs`, not in its source.
- **The inks** are one list of 54 colours: `tools/assets/palette.mjs` for the tools and
  `src/look/inks.ts` for the game, held together by a test. Every texture and icon is moved to
  them (`inkFor`: nearest by eye, hue before lightness).

- **Tripo, asked directly** (`TRIPO`, `TRIPO_LOOK`; `tools/assets/tripo.mjs`, `make-tripo.mjs`) is
  how the full-detail models are made: its image model paints a picture in one soft chunky toy style, its
  shape model makes a model of that picture. About 40 credits a model, 10 a picture. The account
  runs only a couple of tasks at once; the client waits and retries when told it is busy. Its
  models face +x. Hats, accessories, the arcade, the gull, props and fish are made this way.
- **The ground** was painted by Tripo's `chat_image_2.5_sunburst` model (`GROUND`, `make-ground.mjs`).
  Those paintings are in `art/textures` and are no longer what the game wears: cut down to 64
  pixels they kept only their colour, so the lo-fi tiles are drawn in `lofi.mjs` in their colours.

- Models: a picture through fal (`gpt-image-1.5`), a shape from it (`tripo3d/h3.1/image-to-3d`),
  slimmed with glTF-Transform (WebP textures, meshopt) into `art/models/<id>.glb`. Characters
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

## The look

Lo-fi: cute, retro and a little uncanny. The owner asked for the feel of the best-loved game in
this genre, made the island's own. Six things make it, and anything new must take all six.

- **A small picture, blown up.** The world is drawn at one pixel to two screen points (201 by
  437 on the owner's phone; three points with Settings > Chunkier pixels), with no smoothing,
  into a picture of its own; `Screen` (`src/fx/screen.ts`) puts it on the canvas with each colour
  cut to 31 levels and dithered, and the page blows the canvas up with hard pixels.
  `src/look/look.ts` (pure, tested) holds the numbers.
- **A short palette.** The inks (see Assets). Colour things made in code from `INKS`.
- **Light in steps.** Make every lit material with `lit()` in `src/look/material.ts`, never
  `new MeshLambertMaterial`: it is three.js's toon material with a ramp of three tones. Models
  are given a normal for each face when loaded, so each face is one flat tone. The ground stays
  smoothly lit. Shadows are one hard-edged tone (`BasicShadowMap`), and the shadow's picture is
  moved a whole pixel of itself at a time so its edge does not crawl. No film tone mapping.
- **Pixels meant to be seen.** `pixelled()` gives a texture hard pixels. The sky is bands of
  flat colour with a hard-edged sun.
- **Movement on twos.** A character's pose is changed twelve times a second, and a stride is
  always the same eight frames (`poseDue`), as a toy is moved by hand. Where it stands still
  moves every frame.
- **Drawn eyes.** Each character wears a pair of flat dark eyes on its head (`src/player/face.ts`,
  pure, tested: where they go on each head, the sheet of five expressions, when to blink, which
  expression goes with which action). `Character.drawFace` casts a ray at the head to stand each
  eye just off its surface; `express()` puts on a face for a moment (wide at a bite, squinting
  when slapped). A new character needs a line in `FACES`; tune it with `tools/face-check.mjs`.

The interface (`src/style.css`, top) is the same harbour chart room, drawn the same way: bone
paper and deep ink, brass for what is precious and a red-orange enamel for the button to press,
all of them inks. One pixel typeface (Jersey 15) in its one weight. Everything is flat: a fill, a
two-point ink line and a hard shadow down and to the right; buttons are keys that go down when
pressed. No blur, no glass, no soft shadows, no gradients but hard stripes (a test holds the
first three). Icons are pixel sprites and are never smoothed. Line drawings, never emoji. The
arcade is the same pieces with the inks turned about: pale on night, lined in brass. Use the
variables.

`look=smooth` draws the world full size with soft light, soft shadows and fluid movement, to set
beside the lo-fi look. The models, ground tiles, icons and interface stay lo-fi either way.

Headless Chromium draws the lo-fi picture exactly as the phone will lay it out, but only the
phone shows how it feels in the hand: tell the owner when a change touches the look.

## Conventions

- +x east, +z south, +y up, metres. Sea level y = 0. Yaw 0 faces +z.
- Portrait, one thumb: things to read at the top, things to press in the bottom third, at least
  44 points tall. Everything lives in `#app` (sized by `fillScreen` for the Home Screen).
- Unhurried: losing a fish only means casting again; nothing is timed.
