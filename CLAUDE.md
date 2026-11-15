# Driftwood Cove

A cozy fishing game for one person, played upright on an iPhone as a Home Screen web app. Walk
round a small island, cast into the sea, the deep water off the pier, the pond and the creek,
fill the journal, sell fish to Gus, do errands from the board, and spend pearls from the rarest
fish at the Lucky Gull's arcade booth, where every go wins something to wear or set down. It is in the genre of social fishing hangouts
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
node tools/touch-check.mjs                                   # emulated-phone taps through every menu, 44 pt buttons, a dragged thumb walks and turns, and a whole cast by thumb
node tools/bench-check.mjs                                   # runs the game's own benchmark end to end (its numbers mean nothing off the phone)
node tools/icons.mjs [prefix]                                # render menu icons from the models (into art/icons)
node tools/assets/lofi.mjs [models|icons|ground|title] [id]  # cut art/ down to what the game draws, in public/ (free, ten seconds)
node tools/face-check.mjs out.png [--chars ...] [--face happy] # every character's head from three sides, to look at the drawn eyes
node tools/assets/eyes.mjs [id ...]                          # say where each character's painted eyes are found (lofi.mjs does this itself)
NODE_USE_ENV_PROXY=1 node tools/assets/make-sprites.mjs [fish|items] [--by tripo|fal] [--sheets 1,2] [--redo n] [--cut-only]   # pixel sprites for the fish and for everything in the menus, a sheet at a time
NODE_USE_ENV_PROXY=1 node tools/assets/make-title.mjs [--redo] [--keep name]   # Tripo: the title picture, as pixel art
NODE_USE_ENV_PROXY=1 node tools/assets/make-tripo.mjs id ... # Tripo direct: picture -> model -> slimmed GLB + icon (--kinds hat,extra,prop,fish)
NODE_USE_ENV_PROXY=1 node tools/assets/make-ground.mjs       # Tripo: the ground's painted textures, made to repeat
node tools/fit-check.mjs outdir [items] [--chars ...] [--socket]   # every hat/accessory on every character, front and side
NODE_USE_ENV_PROXY=1 node tools/assets/make-models.mjs       # fal: picture -> Tripo 3D -> slimmed GLB (+ rigging)
NODE_USE_ENV_PROXY=1 node tools/assets/make-media.mjs        # fal: textures, title art, icon, sounds, music
tools/blender/run.sh [id ...]                                # Blender (bpy): models fal did not make
```

Run `npm test`, `npm run build` and `node tools/touch-check.mjs` before pushing. The browser tools
need Playwright's Chromium (cloud sessions have it). Every push runs the tests and build; the
deploy to GitHub Pages only goes through from a branch the `github-pages` environment allows
(the default branch, unless the owner adds others under Settings > Environments). That rule is
the owner's: do not route a deploy round it.

## How it is put together

- **three.js with WebGLRenderer**, Vite, TypeScript. The game's look is lo-fi (see The look). Pure logic (island heights, fish, rolls,
  reeling, economy, quests, chests, save, clock) has no three.js and is tested under Vitest.
- **Every state is a URL** (`src/config.ts`): `at` (a name in `PLACES` in `src/world/layout.ts`),
  `time` (dawn/day/dusk/night/hour), `weather` (clear/rain), `hud=0`, `title=0`, `fresh=1` (a new
  save that is not kept), `zoom`, `yaw`, `quality=low`, `mute=1`, `models=0`, `zoo=fish|hat|f-|all`,
  `warp=n` (run time faster, for the tools), `coach=0` (no first-minute guide; the picture tools set it), `stats=1` (the frame-rate readout), `bench=1` and `benchsecs=n` (run the benchmark), `look=smooth` (draw full size with soft light, as before the lo-fi look), `eyes=0` (no drawn eyes), `season=spring|summer|fall|winter`, `sky=aurora|bloodmoon|sunrise` (a rare sky, whatever the day). `trader=1` has the trader in (`trader=0`, never). `weather` also takes `fog` and `storm`. `window.__cove` exposes `state()`, `teleport`, `face`,
  `press`/`release` (the big button) and `open(sheet, tab)`; and, only with `fresh=1` (as every tool runs), what changes
  the game: `give(coins, tokens)`, `catchNow`, `emote`, `game`.
- **The island** (`src/world/island.ts`, `layout.ts`): heights from a function sampled every metre;
  `Heightfield.heightAt` uses the same triangle split as the terrain mesh. `waterAt` says which
  water is where (ocean, deep, pond, creek). Hand-placed buildings in `PLACED`, scattered trees and
  flowers in `scatter.ts` (seeded, kept off paths and water). Props are instanced per kind
  (`props.ts`); compressed geometry is widened to floats before baking (`toFloat`).
- **Ground and water** have shaders of their own, and the finished picture one more
  (`src/fx/screen.ts`). The ground is pixel art, sixteen pixels to the metre: eight
  tiles, and what each ground pixel is (grass, sand, earth, rock, paving) read from the splat
  weights as a texture, so grounds meet along a stair of pixels (`terrain.ts`). Grass, sand
  and earth each have a second tile, laid in patches among the first, and rock and paving have
  one tile twice the size, so no stretch of ground is one tile over and over. The water is flat
  bands of colour by depth over a height texture, with foam, wave marks and glints as hard
  pixels, eight to the metre, moved five times a second (`water.ts`). Each keeps its old smooth
  form for `look=smooth`.
- **Night** is moonlit (a strong pale light from one side, deep blue elsewhere) and lit by lamps:
  `World.addLamp` puts a light at every lamp-post, the campfire (which flickers), the counters of
  the shop, the arcade and the fishing hut, and the top of the lighthouse, whose beam goes round.
  In the lo-fi look lamplight does not fade but falls in three flat steps and stops
  (`stepLamplight` changes three.js's own falloff once), so each lamp throws a hard-edged pool.
- **Sky** (`sky.ts`): hand-tuned palettes for moments of the day, blended by the hour, greyed by rain.
  A day on the island is 24 minutes (`clock.ts`); Settings can follow the real clock. Rain comes in
  spells chosen from the clock alone. The moon's light comes from high up, where the camera never
  looks, so the moon itself is drawn lower in the same quarter of the sky (`MOON_SEEN`): a
  crescent, a disc with a bite out of it. Clouds take the night sky's colour after dark.
- **Life in the sky** (`src/look/skylife.ts`, pure, tested; `src/world/skyLife.ts`): three gulls
  wheel over the island by day, flapping in four poses and gliding (fewer in rain, none at
  night); a trawler goes round the island a third of a kilometre out, with a lamp after dark;
  and on a clear night a shooting star falls in about half of every 24 seconds. Each is placed
  from a clock alone: nothing is simulated. They are kept low enough to be seen.
- **Wind** (`Props.blow`, `SWAY` in `props.ts`): trees, bushes, grass, flowers and cattails bend
  in the vertex shader, each to its own time from where it stands, more the higher up, and in
  the lo-fi look in six steps a second. More in rain.
- **Rain** (`src/fx/particles.ts`) is short thick streaks in a box kept round the player, a pale
  pixel where each drop lands (on the ground, or on the water where there is water) that widens
  once and goes, and the ground darkened in two steps (`uWet` in `terrain.ts`).
- **What feet leave** (`Game.tread`, `footfall`, `Effects.print`, `puff`): a print in the sand
  for every short pace, laid to the slope and lit as the ground is, gone after half a minute;
  a ring and a few drops for a step in the shallows; a puff of dust on landing from a jump.
- **Under the water**: a fish's shadow circles the bobber while a cast waits and closes in at
  the bite (`Fishing.lurk`); the water's shader draws rings round the pier's legs. In the lo-fi
  look a caught fish is held up as its sprite on a flat card (`Character.hold`), not as its model.
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
  sale or an errand does), `save.ts` (read defensively, errands included; add a field with a default, never change
  the meaning of one). Saved in `localStorage` (`cove.save`; chalk in `cove.chalk`). A copy is kept
  once a day (`backupFor`: only a save that reads as the game's own, and a blank one never
  replaces a copy with fish in it).
- **Menus** are bottom sheets (`src/ui/`): shop, journal, bag, board, chests, more, fun; plus the
  ukulele pads and the chalk board. The HUD (`hud.ts`) has money and level at the top, the action
  buttons by the right thumb, and Bag/Journal/Fun/More along the bottom. The bottom third is the
  movement stick; anywhere higher turns the camera. A thumb lands on the canvas, not on `#app`
  under it: `Controls.onGame` takes both, and the touch check drags a thumb to hold it to that.
  Which way a push or a drag goes is `src/player/steer.ts` (pure, tested): the stick pushed right
  walks (or rows) to the right of the screen, and a finger dragged right above it turns the
  view to the right. The owner tried the camera both ways and chose this; the touch check
  holds both.
- **Trees are never taken away, and the player is always seen.** The owner did not want trees
  vanishing as the player came near, nor a whole tree thinned: where a tree (or the cliff) comes
  between the camera and the player, a round window is opened in it over the player, clear in
  the middle and dithered toward its rim. `src/look/spotlight.ts` (pure, tested) holds the
  numbers (`SPOT`), the rule and the same rule for the graphics card; `Props.spotlit` puts it
  in the trees' materials and `Props.clearView` says each frame where the player is. Only what
  is nearer the camera than the player is opened, pixel by pixel, so nothing is decided tree
  by tree and nothing pops. Shadows are whole.
- **The first minute** (`src/game/coach.ts`, pure, tested; `src/ui/coach.ts`): someone with no
  fish to their name is walked through it on a card under the clock, a step at a time, each
  done by doing it: drag to walk, drag higher to look round, hold Cast, tap Hook!, hold Reel.
  A drawn thumb shows where the first two are done. A missed bite or a lost fish goes back to
  casting; the first fish ends it; Skip ends it; it is not offered again (`coach` in the
  save's hints). The touch check does every step with a thumb on the glass.
- **Measuring** (`src/debug/bench.ts`, pure, tested): Settings > For testing has a frame-rate
  readout (frames a second and the game's own share of a frame) and Run benchmark, which
  stands in six places for five seconds each, turning slowly, and ends with text to copy:
  for each, frames a second, the usual and the slow gap between frames, the share that
  missed a refresh, the game's own time, draw calls and triangles. Nothing is saved. Only the
  phone's numbers count: headless Chromium draws with software.
- **The camera and buildings.** A building in the way is opened over the player like a tree
  (`WINDOWED` in `props.ts`); the camera comes in closer only if it would otherwise be inside
  one (`CameraRig.roomOf`).
- **Flames** (`World.addFlame`) are their own light: faceted tongues drawn unlit that jump in
  steps. A fire's painted flame is lit like wood and was a dark lump at dusk.
- **The day's bounty** (`src/game/bounty.ts`, pure, tested; `src/ui/bountyCard.ts`): each
  calendar day (the player's own, not the island's 24 minutes) Gus wants one kind of fish. It
  sells for double all day and the first one earns a bounty on top, once. Every fish that can
  be asked for (no odds and ends, no legends, none that want rain) comes round once before
  any repeats. It is shown under the clock, at the top of the shop's Sell tab and on the
  board, with where to look; the owner asked for it as a target for each session. The save
  keeps the day it was last filled (`bounty`).
- **What the islanders say** (`src/npc/talk.ts`, pure, tested): each has a voice (Puddle
  quacks, Birch is dry, Juniper says Mmm, Gus sells). Spoken to, they say the first of these
  not yet said to them today: hello (once ever), a word on a fish just landed, where the
  bounty might be found, the favour they would like (an ordinary fish from their own waters:
  with one in the bag the button reads Give, it pays well over Gus's price, and every third
  comes with a pearl; a golden fish is never taken), their boast (a length they say they
  landed today, to beat with the journal's best), a word on what the player is wearing, the
  rain or the night, and then their own lines in turn. The board lists what each neighbour is
  waiting for. The save keeps who has been met, favours done, what was said today and boasts
  beaten (`met`, `favours`, `talk`, `rivalWins`). The owner likes rare fish being a long
  hunt: nothing here points at one.
- **The campsite** (`src/game/camp.ts`, pure, tested): the shop's Camp tab is a catalogue of
  camp things (`camp` in `FURNITURE`): tent, campfire, bedroll, stump, table, stove, woodpile,
  string lights, washing line, and the chair, cooler, lantern and hammock there already. There
  is no plot: a camp is wherever its things are set down. A placed fire has a flame and
  throws a jumping light, and string lights a steady one, from a few spare lights made at the
  start (`World.borrowLamp`: a light made on the spot would have every material made again).
  A tent with a fire and a seat beside it earns Happy Camper.
- **Islanders** (`src/npc/npcs.ts`): three fishers walk routes between spots and fish; Gus stands by
  the shop. They turn their heads to watch the player go by, keep looking a beat after, and now
  and then glance about, scratch, shift their weight or yawn (`src/player/gaze.ts`, pure, tested;
  `Character.watching` and `fidgets`; the fidgets are poses in `poses.ts`). **Boat** (`src/world/boat.ts`), **placed furniture** (`placed.ts`).
- **Sound** (`src/audio/audio.ts`): MP3s made through fal, played with Web Audio from the first touch.
  In the lo-fi look everything goes through a narrow band with a little tape saturation, the
  effects are cut to a few dozen levels so they crunch, and the music wavers in pitch like a worn
  cassette (`lofi`; `look=smooth` plays it clean).

- **Only what is near is drawn** (`Props` in `props.ts`). Many of a kind (trees, bushes, rocks,
  flowers) are split by where they stand, an instanced mesh to each 20 m square of the island
  (`SQUARE`), so what is behind the camera is culled. Small things are not drawn far off
  (`REACH`), and a tree beyond `FAR_FROM` is drawn from its second, far simpler file
  (`<id>.far.glb`, which `lofi.mjs` cuts for everything in `TREES`). `Props.drawNear` is told
  where the camera is. Draw calls went up and triangles well down; the phone's benchmark is
  what says whether that is a good trade.
- **Seasons** (`src/look/season.ts`, pure, tested): by the real calendar. A season is a repaint:
  the leaves' and grass's colour, the light, frost on the grass, snow in place of rain in
  winter (`SEASON_LOOK`, `World.setSeason`, `Props.tint`). Some fish keep to a season
  (`seasons` on a `Species`); the journal says when.
- **Weather** is clear, rain, fog or a thunderstorm (`weatherAt` in `clock.ts`, from the clock
  alone). Fog is pale and close; a storm is darker rain with lightning (`World.air`,
  `onLightning`, `Audio.thunder`). Four fish bite only in fog or only in a storm (`weather` on
  a `Species`); a storm counts as rain for the fish that want rain.
- **How a fish fights** (`FightStyle` in `reel.ts`: steady, runner, diver, jumper, sulker) is
  its kind's own (`styleOf`), and the reel's card says which. **Tackle**: a line and a hook
  (`LINES`, `HOOKS` in `economy.ts`) are bought beside the rods and change the rod's numbers
  (`rigged`). **Bait can be found**: worms dug where the ground is dark after rain, crickets
  in long grass, crawlers at night (`src/game/forage.ts`, `src/world/forage.ts`). The bait on
  the line is a chip by the Cast key; a tap opens the tackle box (`src/ui/tackle.ts`) to change
  bait, lure, line or hook on the spot. **Sets** (`src/game/sets.ts`): groups of fish that pay
  once when all are in the journal, listed in the journal's Sets tab.
- **Small life** (`src/world/wildlife.ts`): crabs that scuttle off along the sand, frogs on the
  pond's rim that plop in when come upon, butterflies by day, fireflies by night, gulls on two
  of the pier's lamps and the signpost that fly off when anyone comes near and come back when
  they have gone. All made in code from the inks and moved in steps; only what is near the
  player is moved. **Fish rise** (`src/game/rises.ts`, pure, tested): seven places on water
  within a cast of somewhere to stand, new every six minutes, each with rings and now and then
  a jump; a bobber landed within `RISE_REACH` of one gets its bite sooner (`RISE_SOONER`).
- **A gull of your own** (`src/game/gull.ts`, pure, tested): one gull stands at the far corner
  of the pier head and does not fly off. Feed it an ordinary fish (the Feed gull button) on
  three days running and it is tame: it follows the player, flying to catch up, and brings
  coins or bait a couple of times a day. A missed day starts the count again.
- **The islanders keep hours** (`src/npc/hours.ts`, pure, tested): Puddle is asleep at the end
  of the pier round noon, Birch stands by the creek at dawn, Juniper sits at the camp all
  night. They walk their own routes to get there and put the rod away.
- **Poses to idle in** (Fun sheet): lean on a rail, stretch, skip a stone (three rings out over
  the water), warm hands (also offered as a button by any fire).
- **Surf**: every few seconds a wave runs up the sand and slides back, leaving it wet. The
  water's shader draws the line of foam coming in and the ground's shader the run-up, to the
  same beat (`uSurf` is the water's clock).
- **Rare skies** (`src/look/rare.ts`, pure, tested): the northern lights about one clear night
  in seven, a blood moon one in thirteen, and a sunrise that fills the sky one dawn in five,
  each decided by the island's day alone. Drawn in the sky's shader (`uAurora`, `uBlood`,
  `uDawn`) and eased in; said once when they come; the save keeps which have been seen
  (`skies`), and all three earn a title.
- **The title picture moves** (`src/ui/titleArt.ts`, its rules pure and tested): the picture is
  drawn into a canvas of its own size and changed five times a second. Rows of water slide a
  pixel or two, the three painted gulls are painted out and drawn again where they have
  drifted to, and the bobber dips. Where those things are in the picture is written down
  there: set them again if the title is ever repainted.

- **Indoors** (`src/world/indoors.ts`): the shop, the fishing hut and the aquarium (under the
  lighthouse) are rooms of their own, each a model made like a dolls' house (`room-*`: two or
  three walls and a floor, open toward the camera). A room is a scene by itself with its own
  light, drawn in place of the island while the player is in it (mode `inside`); the player's
  place on the island stays at the door. Where the floor may be walked is found from the model,
  by casting down on a grid for what is level with the floor. A room's spots (`ROOMS`) say what
  the button does there: Gus's counter, the hut's tackle bench and stove, the tank. Walking out
  of the open front leaves. `room-cave` was made and is not used.
- **The aquarium** (`src/game/aquarium.ts`, pure, tested): one of every kind of fish, given
  from the bag at the tank; it pays half again Gus's price and a pearl every five kinds, and
  what is given swims behind the glass as its sprite. Only kinds already given are listed.
- **Up the lighthouse** (`Game.climb`, `lookout`; `src/game/lookout.ts`, pure, tested): from
  the gallery the camera goes round the lantern looking out. The telescope narrows the view
  to nine degrees; a thing held in the middle of the glass a moment is picked out and named:
  the trawler (a pearl the first time), the pier, the pond, the camp, and the sea cave, which
  is how the cave gets onto the chart.
- **The sea cave** (`CAVE` in `layout.ts`): a mound of rock with a dark mouth in the north
  cliffs, come at only by boat. The water before the mouth is zone `cave`, with three fish
  found nowhere else.
- **Arranging** (`Game.setDown`, `move`, `carry`): a thing taken from the bag, or one standing
  that is picked up with Move, is carried in front of the player as a see-through ghost until
  it is Set down (Turn turns it an eighth; Put away sends it back to the bag). It counts as in
  the bag while it is carried. A **camp chest** keeps thirty fish out of the bag (`store`,
  `takeOut` in `camp.ts`; however many chests, one store). A **camp sign** is built in code so
  that it can say the camp's name (`campSign` in `placed.ts`, `campName` in the save).
- **The chart** (More > Chart; `src/ui/chart.ts`, `src/game/chart.ts`): the island from above in
  flat inks with the places pinned, the camp by its name, the trader on their days, the cave
  once found, and under it each water with the kinds caught there (`caughtAt` in the save,
  kept as fish are landed). It shows only what has been caught: it never says where to find one.
- **The trader** (`src/game/trader.ts`, pure, tested; `src/npc/trader.ts`): about two days in
  seven, by day, a stall and a second rowboat are on the beach and Tansy beside them (whichever
  character the player is not, in a straw hat and pack). She sells what Gus does not, each once
  a visit: two things to set down, bait by the bundle, and one pearl for coins.

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
A prop that came back facing +x without the index saying it is Tripo's is listed in `FACES_X`
(`src/assets/models.ts`) and turned the same quarter: the bench was one, and stood sideways
with whoever sat on it sitting sideways.

## Assets

Generated, not drawn in code. `tools/assets/manifest.mjs` holds every prompt.

- **Two folders.** The asset tools write soft, detailed models and pictures into `art/`
  (`art/models`, `art/icons`, `art/textures`, `art/title.webp`). Nothing there is shipped.
  `tools/assets/lofi.mjs` cuts each down to what the game draws, in `public/`: a model to a few
  hundred triangles (`CUT`, by kind) with a 64 to 512 pixel texture in the island's inks (the
  four buildings get the finest, since they fill the screen when stood beside; a
  character's painted eyes found and painted out on the way: see The look). **Things people
  have built keep their shape** (`house` and `made` in `CUT`, `MADE`: the buildings, benches,
  tables, lamp-posts, the well, the tent, the furniture set down from the bag): cut to a few
  hundred triangles a plank came out warped, a wall bowed and a stripe smeared, and the owner
  saw the shop and the bench looking odd. They lose a triangle only where that moves nothing
  by more than `error` of their size, and wear a 256 pixel texture. What makes them lo-fi is
  the small picture, the inks and the stepped light, not a bent bench. It costs about 120,000
  triangles at the plaza (some 720,000 in view). An
  icon to a 48-pixel sprite with a dark line round it; the title picture to 256 pixels across
  (it is pixel art already, four of its file's pixels to one of its own, so every fourth is
  taken as it is) and the Home Screen icon to 64.
  It draws the eight ground tiles itself, as pixel art. It costs nothing and takes ten seconds;
  the Tripo and fal tools run it when they finish. Never edit `public/models`, `public/icons` or
  `public/textures` by hand, and change how lo-fi a thing is in `lofi.mjs`, not in its source.
- **The fish's sprites** are drawn for the purpose, not shrunk from the toy pictures their
  models were shaped from: `make-sprites.mjs` asks Tripo's image model for sixteen pixel-art
  sprites to a sheet (three sheets, 10 credits each; the request must be under 1,800
  characters), cuts each sprite out by finding its drawing, and saves it in `art/sprites/`,
  which `lofi.mjs` uses before `art/icons/`. The sheets are kept in `art/sprites/sheets/`. Look
  at a new sheet before keeping it: one left out puts every fish after it under the wrong name.
- **Everything else in the menus** (rods, bait, lures, hats, furniture, accessories, the
  characters, the coin and the rest: 74 things) has a sprite made the same way:
  `make-sprites.mjs items`, from `ITEM_SHEETS` in that file, seven sheets. Sixteen different
  things to a sheet was too many (the model drew twelve, or the wrong hats), so later sheets
  hold nine; a sheet's drawings are taken in reading order, and the tool stops if there are
  too few. A new thing for a menu goes on a new sheet there. The props of the world have no
  sprite: they are never shown in a menu.
- **The title** is a pixel-art painting by Tripo's image model (`TITLE_PIXEL` in the manifest,
  `make-title.mjs`, 10 credits; `--keep name` paints another to choose from). The name over it
  is drawn by the game (`src/ui/logo.ts`, its inking pure and tested): each word set in the
  pixel typeface at a whole multiple of its grid, cut to hard pixels, and inked with a pale top
  edge, two tones, a dark foot, a line all round and a hard shadow.
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
- Textures, the Home Screen icon, sounds and music: `make-media.mjs` (and the title as it first was, a soft poster).
- Keys are never in the repo: the fal key is a network secret on the environment
  (`queue.fal.run`); run the asset tools with `NODE_USE_ENV_PROXY=1`.

## The look

Lo-fi: cute, retro and a little uncanny. The owner asked for the feel of the best-loved game in
this genre, made the island's own. Six things make it, and anything new must take all six.

- **A small picture, blown up.** The world is drawn at one pixel to two screen points (201 by
  437 on the owner's phone; three points with Settings > Chunkier pixels), with no smoothing,
  into a picture of its own; `Screen` (`src/fx/screen.ts`) puts it on the canvas with each colour
  cut to 31 levels and dithered a little (Settings > Grain: none, a little, full; fully
  dithered, every flat colour becomes a cross-hatch), and the page blows the canvas up with hard pixels.
  `src/look/look.ts` (pure, tested) holds the numbers.
- **A short palette.** The inks (see Assets). Colour things made in code from `INKS`.
- **Light in steps.** Make every lit material with `lit()` in `src/look/material.ts`, never
  `new MeshLambertMaterial`: it is three.js's toon material with a ramp of three tones. Models
  are given a normal for each face when loaded, so each face is one flat tone; a building
  (`walls` in its file, from `lofi.mjs`) is lit smoothly across faces that nearly agree and
  sharply at corners, since a flat wall lit face by face breaks into jagged patches. The ground stays
  smoothly lit. Shadows are one hard-edged tone (`BasicShadowMap`), and the shadow's picture is
  moved a whole pixel of itself at a time so its edge does not crawl. No film tone mapping.
- **Pixels meant to be seen.** `pixelled()` gives a texture hard pixels. The sky is bands of
  flat colour with a hard-edged sun.
- **Movement on twos.** A character's pose is changed twelve times a second, and a stride is
  always the same eight frames (`poseDue`), as a toy is moved by hand. Where it stands still
  moves every frame.
- **Drawn eyes.** Every generated character comes with eyes painted on its head; cut down they
  are smudges. So `tools/assets/eyes.mjs` (run by `lofi.mjs` for anything with a rig) finds the
  two painted eyes on the full-detail model (dark, level, a mirror pair either side of the head
  bone's middle), paints them out of the texture before it is made small, and writes where they
  were into the model file (`eyes` in the scene's extras: place, facing and radius in the head
  bone's frame, and how light the fur round them is). `Character.drawFace` draws the game's own
  eyes exactly there: a small grid of mesh for each, pressed onto the head by casting a ray for
  every corner so it follows the surface like paint, and hung on the head's bone. Their shapes
  are not pictures: `src/player/face.ts` (pure, tested) gives each of five expressions as a
  distance, for the tests and, as `eyeShader`, for the graphics card, so an eye is as crisp five
  pixels tall (its size in play) as fifty. Eyes are sized from the painted ones, between
  `EYE_MIN` and `EYE_MAX` of the character's height. On dark fur (the raccoon's mask) the eyes
  are not painted out and show by a bigger glint, with paler lines. They blink, and change with
  what the character is doing (`faceFor`); `express()` puts on a face for a moment (wide at a
  bite, squinting when slapped). A new character needs nothing: if its file has no eyes the
  tool says so and the game guesses (`GUESS`). Look with `tools/face-check.mjs`, and always at
  the size seen in play as well as close up; `eyes=0` in the address draws none.
- **Textures are shrunk counting only the pixels a model uses** (`shrunk` in `lofi.mjs`): a
  generated texture is many small pieces with margins filled from whichever piece is nearest,
  and shrunk the plain way a shirt's margin leaves specks on an ear.

The interface (`src/style.css`, top) is the same harbour chart room, drawn the same way: bone
paper and deep ink, brass for what is precious and a red-orange enamel for the button to press,
all of them inks. One pixel typeface (Jersey 15) in its one weight. Everything is flat: a fill, a
two-point ink line and a hard shadow down and to the right; buttons are keys that go down when
pressed. No blur, no glass, no soft shadows, no gradients but hard stripes (a test holds the
first three). Icons are pixel sprites and are never smoothed. Line drawings, never emoji, and
drawn as pixels (`pixelGlyph` in `src/ui/pixels.ts`). Confetti is big square pixels. The
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
