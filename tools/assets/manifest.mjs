// Every generated asset in the game, as the words it is made from.
//
// A picture of each is painted through fal, a 3D model is made of the picture (Tripo's model,
// served by fal), and tools/assets/make-models.mjs slims it for the phone. Characters are then
// rigged and given animations by Tripo. Nothing here names any other game.

/**
 * Tripo, asked directly: its image model paints the picture, its shape model makes a model of
 * the picture by the picture's own task (nothing is uploaded). A model made this way is about
 * 40 credits. tools/assets/make-tripo.mjs makes them. Every hat and worn thing is made so.
 */
export const TRIPO = { image: 'chat_image_2.5_flare', shape: 'v3.1-20260211' };
export const TRIPO_LOOK = {
  prop: 'as a stylised 3D game asset in a soft chunky toy style: smooth rounded stout shapes, simple forms, muted warm matte colours with gentle shading, no fine detail, the whole thing in view with space round it, seen from the front and a little to one side and above, standing on nothing, on a plain white background, soft even light, no shadow, no text, no lettering',
  hat: 'as a stylised 3D game asset in a soft chunky toy style: smooth rounded stout shapes, muted warm matte colours with gentle shading, no fine detail, a single hat on its own with nobody wearing it, upright with its opening underneath, seen from the front and a little above, the whole thing in view with space round it, on a plain white background, soft even light, no shadow, no text',
  extra: 'as a stylised 3D game asset in a soft chunky toy style: smooth rounded stout shapes, muted warm matte colours with gentle shading, no fine detail, on its own with nobody wearing it, the whole thing in view with space round it, on a plain white background, soft even light, no shadow, no text',
  icon: 'as a stylised 3D game item icon in a soft chunky toy style: smooth rounded stout shapes, muted warm matte colours with gentle shading, no fine detail, the whole thing in view with space round it, seen from the front and a little above, on a plain white background, soft even light, no shadow, no text, no lettering',
  fish: 'as a stylised 3D game asset in a soft chunky toy style: smooth rounded stout shapes, thick simple fins, muted matte colours with gentle shading, a goofy friendly face, seen exactly from the side facing left, the whole thing in view with space round it, on a plain white background, soft even light, no shadow, no text, no water',
};

/** The model that paints the pictures, and the one that makes a shape of a picture (fal). */
export const IMAGE_MODEL = 'fal-ai/gpt-image-1.5';
export const SHAPE_MODEL = 'tripo3d/h3.1/image-to-3d';

/** How each kind of thing is asked for. */
export const LOOK = {
  prop: 'as a cute chunky low poly 3D game asset: simple stout shapes, flat matte soft colours, no fine detail, the whole thing in view with space around it, seen from the front and a little to one side and above, standing on nothing, on a plain white background, soft even light, no shadow, no text, no lettering',
  fish: 'as a cute chunky low poly 3D game asset: simple stout rounded shapes, flat matte colours, fins thick and simple, seen exactly from the side, facing left, the whole thing in view with space around it, on a plain white background, soft even light, no shadow, no text, no water',
  hat: 'as a cute chunky low poly 3D game asset: a single hat on its own with nobody wearing it, simple stout shapes, a thick brim, flat matte colours, seen from the front and a little above, the whole thing in view with space around it, on a plain white background, soft even light, no shadow, no text',
  char: 'as a cute chunky low poly 3D game character: big round head, short stout body, standing upright on two short legs in an A-pose with both arms held straight out to the sides away from the body, hands open, legs slightly apart, facing straight at the viewer, flat matte colours, full body in view with space around it, on a plain white background, soft even light, no shadow, no text, nothing held in the hands',
  icon: 'as a cute chunky low poly 3D game item icon: simple stout shapes, flat matte soft colours, the whole thing in view with space around it, seen from the front and a little above, on a plain white background, soft even light, no shadow, no text, no lettering',
};

/**
 * The 3D models. `h` is how tall (or for fish, how long) it stands in the game in metres, set
 * when it is loaded; `faces` is how many triangles Tripo is asked to keep.
 */
export const MODELS = {
  // --- Characters (rigged and animated by Tripo) ---
  'char-otter': { kind: 'char', what: 'a chubby brown river otter with a cream face and belly, wearing a plain light blue short-sleeved shirt, no hat', h: 1.1, faces: 10000, rig: true },
  'char-frog': { kind: 'char', what: 'a chubby green frog with a pale yellow belly and big friendly eyes, wearing a plain orange short-sleeved shirt, no hat', h: 1.0, faces: 10000, rig: true },
  'char-raccoon': { kind: 'char', what: 'a chubby grey raccoon with a dark eye mask and a striped tail, wearing a plain red short-sleeved shirt, no hat', h: 1.1, faces: 10000, rig: true },
  'npc-duck': { kind: 'char', what: 'a chubby white duck with an orange beak and orange feet, wearing a little green fishing vest with pockets and a tan bucket hat', h: 1.0, faces: 9000, rig: true },
  'npc-beaver': { kind: 'char', what: 'a chubby brown beaver with big front teeth and a flat tail, wearing blue overalls and a yellow knit beanie', h: 1.1, faces: 9000, rig: true },
  'npc-bear': { kind: 'char', what: 'a chubby honey-coloured bear cub wearing a red and black checked flannel shirt and a little straw hat', h: 1.2, faces: 9000, rig: true },
  'npc-pelican': { kind: 'char', what: 'a chubby white pelican shopkeeper with a big yellow beak pouch, wearing a navy apron and a little sailor cap', h: 1.3, faces: 9000, rig: true },

  // --- Buildings and landmarks ---
  'shop': { kind: 'prop', what: 'a small cosy seaside bait and tackle shop: a little wooden hut with pale blue painted planks, a striped red and white awning over an open counter window, a few crates and a barrel by the door, a round fish shaped sign with no writing', h: 6.5, faces: 14000 },
  'lighthouse': { kind: 'prop', what: 'a short chubby lighthouse with red and white stripes, a black lantern room with a little balcony rail, on a round stone base', h: 13, faces: 10000 },
  'notice-board': { kind: 'prop', what: 'a wooden village notice board on two posts with a little shingle roof, with a few blank paper notes pinned to it', h: 2.4, faces: 5000 },
  'fishing-hut': { kind: 'prop', what: 'a tiny weathered wooden fishing shack with a tin roof, nets and a life ring hanging on the wall, a small round window', h: 4.5, faces: 10000 },
  'tent': { kind: 'prop', what: 'a small triangular orange camping tent with the front flap tied open, pegged down with ropes', h: 2.0, faces: 5000 },
  'pier': { kind: 'prop', what: 'a square section of a wooden pier: a flat deck of weathered planks on four thick round posts, seen from above at an angle', h: 2.4, faces: 4000 },
  'bridge': { kind: 'prop', what: 'a small arched wooden footbridge with low chunky rails', h: 1.8, faces: 6000 },
  // (Empty: the game makes the oars, so that they can be rowed with. The first one had a pair lying in it, which nobody could pick up.)
  'rowboat': { kind: 'prop', what: 'a small open wooden rowing boat painted white with a red stripe along its bottom, a pointed bow at one end and a flat square stern at the other, two plain plank seats across it and a flat wooden floor inside, completely empty with nothing in it', h: 1.0, faces: 6000 },
  'buoy': { kind: 'prop', what: 'a round floating sea buoy, red and white, with a little bell on top', h: 1.6, faces: 3000 },

  'arcade': { kind: 'prop', what: 'a small seaside carnival game booth: a wooden stall painted deep teal and cream with a striped red and cream canopy, a row of round light bulbs along the top edge, a big painted seagull sign on the roof, a counter across the open front with a little slot machine on it and a shelf of plush fish prizes behind', h: 5.4, faces: 12000 },
  'gull': { kind: 'prop', what: 'a cheeky fat seagull standing upright on orange feet, wearing a green dealer visor and a little red bow tie, smug grin', h: 1.0, faces: 5000 },

  // --- Nature ---
  'tree-pine': { kind: 'prop', what: 'a tall chunky pine tree made of three stacked cone shaped tiers of dark green foliage on a short brown trunk', h: 9, faces: 3000 , simplify: 0.45 },
  'tree-round': { kind: 'prop', what: 'a round leafy deciduous tree with a big puffy ball of fresh green foliage on a short sturdy brown trunk', h: 7, faces: 3500 , simplify: 0.45 },
  'tree-birch': { kind: 'prop', what: 'a slim birch tree with a white trunk with black marks and a puffy yellow-green crown of leaves', h: 8, faces: 3500 , simplify: 0.45 },
  'tree-palm': { kind: 'prop', what: 'a short leaning palm tree with a curved ringed trunk and a few thick chunky green fronds and three coconuts', h: 6, faces: 4000 , simplify: 0.6 },
  'bush': { kind: 'prop', what: 'a round puffy green bush with a few small pink flowers', h: 1.3, faces: 2500 , simplify: 0.3 },
  'flowers': { kind: 'prop', what: 'a small clump of chunky wildflowers, yellow, white and purple daisies with fat green leaves, growing from a little mound of grass', h: 0.7, faces: 2500 , simplify: 0.2 },
  'grass-tuft': { kind: 'prop', what: 'a small chunky tuft of tall green grass blades growing from a little mound', h: 0.6, faces: 1500 , simplify: 0.15 },
  'cattails': { kind: 'prop', what: 'a clump of chunky cattail reeds with fat brown seed heads and thick green leaves, growing from a little mound', h: 1.6, faces: 2500 , simplify: 0.3 },
  'lilypad': { kind: 'prop', what: 'a flat round green lily pad with a notch and one pink water lily flower sitting on it', h: 0.3, faces: 1500 , simplify: 0.4 },
  'rock-a': { kind: 'prop', what: 'a big rounded grey boulder with a little moss on top', h: 1.8, faces: 1500 , simplify: 0.5 },
  'rock-b': { kind: 'prop', what: 'a cluster of three chunky grey rocks of different sizes', h: 1.2, faces: 1500 , simplify: 0.5 },
  'cliff': { kind: 'prop', what: 'a large craggy grey cliff rock outcrop with flat faces and some green moss patches', h: 6, faces: 3000 },
  'log': { kind: 'prop', what: 'a fallen tree log lying on its side, brown bark with a pale cut end, good to sit on', h: 0.7, faces: 2500 , simplify: 0.5 },
  'driftwood': { kind: 'prop', what: 'a piece of pale bleached driftwood, a twisted branch lying on the sand', h: 0.5, faces: 2000 , simplify: 0.5 },
  'shell': { kind: 'prop', what: 'a big pink and cream spiral seashell lying on its side', h: 0.4, faces: 1500 , simplify: 0.5 },
  'cloud': { kind: 'prop', what: 'a puffy white cartoon cloud made of a few round lumps', h: 6, faces: 1500 , simplify: 0.4 },
  'mushrooms': { kind: 'prop', what: 'a little cluster of three red mushrooms with white spots on a mossy mound', h: 0.6, faces: 2000 , simplify: 0.3 },
  'bounce-shroom': { kind: 'prop', what: 'a big bouncy purple mushroom with a squashy springy round cap with pale spots, like a trampoline', h: 1.4, faces: 3000 },
  'seaglass': { kind: 'prop', what: 'a small smooth frosted piece of pale sea green sea glass, a rounded pebble shape', h: 0.12, faces: 1000 },
  'detector': { kind: 'prop', what: 'a metal detector: a long handle with a grip and a little dial, and a flat round search coil at the bottom, standing upright', h: 1.0, faces: 2500 },

  // --- Village and camp things ---
  'bench': { kind: 'prop', what: 'a chunky wooden park bench with a backrest and green painted iron legs', h: 1.0, faces: 3000 },
  'lamp-post': { kind: 'prop', what: 'an old fashioned village street lamp: a dark green iron post with one glass lantern on top', h: 3.6, faces: 2500 },
  'campfire': { kind: 'prop', what: 'a campfire: a ring of round grey stones around crossed logs with bright orange and yellow flames', h: 1.0, faces: 3000 },
  'crates': { kind: 'prop', what: 'a stack of two wooden crates, the top one full of fish', h: 1.3, faces: 3000 },
  'barrel': { kind: 'prop', what: 'a wooden barrel with dark iron bands', h: 1.0, faces: 2000 },
  'signpost': { kind: 'prop', what: 'a wooden signpost with three blank arrow shaped boards pointing different ways', h: 2.2, faces: 2500 },
  'picnic-table': { kind: 'prop', what: 'a chunky wooden picnic table with benches attached on both sides', h: 0.9, faces: 3000 },
  'mailbox': { kind: 'prop', what: 'a rounded red country mailbox on a wooden post with its little flag up', h: 1.3, faces: 2000 },
  'well': { kind: 'prop', what: 'a round stone wishing well with a little wooden roof and a bucket on a rope', h: 2.6, faces: 5000 },
  'fence': { kind: 'prop', what: 'a short section of a chunky white wooden picket fence', h: 1.0, faces: 1500 },

  // --- Furniture the player can buy and set down ---
  'f-chair': { kind: 'prop', what: 'a folding camping chair with a green canvas seat', h: 1.0, faces: 3000, item: true },
  'f-lantern': { kind: 'prop', what: 'an old camping lantern with a glowing warm yellow glass and a brass handle', h: 0.6, faces: 2500, item: true },
  'f-radio': { kind: 'prop', what: 'a chunky retro portable radio in mint green with a big round speaker and an antenna', h: 0.5, faces: 2500, item: true },
  'f-umbrella': { kind: 'prop', what: 'a beach umbrella with wide red and white stripes on a pole stuck in a little mound of sand', h: 2.6, faces: 3000, item: true },
  'f-flamingo': { kind: 'prop', what: 'a pink plastic flamingo lawn ornament standing on one leg', h: 1.0, faces: 2500, item: true },
  'f-cooler': { kind: 'prop', what: 'a chunky blue and white picnic cooler box with a handle', h: 0.6, faces: 2000, item: true },
  'f-plant': { kind: 'prop', what: 'a leafy green monstera plant in a round terracotta pot', h: 1.0, faces: 3000, item: true },
  'f-gnome': { kind: 'prop', what: 'a garden gnome with a tall red pointed hat and a white beard, holding a tiny fishing rod', h: 0.7, faces: 3000, item: true },
  'f-telescope': { kind: 'prop', what: 'a brass telescope on a wooden tripod', h: 1.5, faces: 3000, item: true },
  'f-hammock': { kind: 'prop', what: 'a striped canvas hammock slung between two short wooden posts', h: 1.4, faces: 3000, item: true },
  'f-snowman': { kind: 'prop', what: 'a small snowman with a carrot nose, coal eyes, a red scarf and a little black top hat', h: 1.2, faces: 3000, item: true },
  'f-tiki': { kind: 'prop', what: 'a tiki torch: a bamboo pole with a woven basket at the top holding an orange flame', h: 1.8, faces: 2500, item: true },

  // --- Camp things: the catalogue the player makes a campsite of their own from ---
  'f-tent': { kind: 'prop', what: 'a small A-frame camping tent of sage green canvas with its two door flaps tied open and a wooden pole at the front', h: 2.1, faces: 3000, item: true },
  'f-firepit': { kind: 'prop', what: 'a campfire: a ring of round grey stones with a few crossed logs and one chunky orange and yellow flame', h: 0.7, faces: 3000, item: true },
  'f-bedroll': { kind: 'prop', what: 'a quilted blue sleeping bag rolled out flat on the ground with a small cream pillow at one end', h: 0.3, faces: 2500, item: true },
  'f-stump': { kind: 'prop', what: 'a short fat tree stump to sit on, with pale rings on its flat top and rough brown bark', h: 0.5, faces: 2000, item: true },
  'f-table': { kind: 'prop', what: 'a small folding wooden camp table with a blue enamel mug and a tin plate on it', h: 0.7, faces: 3000, item: true },
  'f-stove': { kind: 'prop', what: 'a little green two-ring camping stove with a round steel kettle sitting on it', h: 0.6, faces: 3000, item: true },
  'f-woodpile': { kind: 'prop', what: 'a neat stack of split firewood logs held between two short wooden posts', h: 0.8, faces: 3000, item: true },
  'f-lights': { kind: 'prop', what: 'a string of round warm yellow bulb lights hung in a swag between two wooden poles', h: 2.0, faces: 3000, item: true },
  'f-washline': { kind: 'prop', what: 'a clothes line between two wooden posts with a red and white striped towel and two socks pegged on it', h: 1.6, faces: 3000, item: true },

  // --- More to set down: a chest for the camp, and what only the visiting trader sells ---
  'f-chest': { kind: 'prop', what: 'a sturdy wooden camp chest with iron bands and rope handles, its lid shut', h: 0.7, faces: 3000, item: true },
  'f-chime': { kind: 'prop', what: 'a wind chime of sea shells and bits of driftwood hanging from the arm of a short wooden post', h: 1.6, faces: 3000, item: true },
  'f-shipbottle': { kind: 'prop', what: 'a model sailing ship inside a big glass bottle lying on a little wooden stand', h: 0.5, faces: 3000, item: true },
  'stall': { kind: 'prop', what: "a travelling trader's stall: a striped blanket spread on the ground with a few crates, jars and baskets on it, and a lantern hanging from a crooked pole at one corner", h: 1.9, faces: 5000 },
  // Rimefall
  'ice-hut': { kind: 'prop', what: 'a small ice-fishing hut on wooden sled runners: red painted plank walls, snow piled on its roof, a black stovepipe chimney, a door with a round window', h: 3.4, faces: 6000 },
  'seal': { kind: 'prop', what: 'a chubby grey spotted seal lying on its belly with its head up and its flippers out', h: 0.7, faces: 2000 },
  'toy-sled': { kind: 'prop', what: 'a wooden sled with red metal runners and a loop of rope at the front', h: 0.35, faces: 2000, item: true },
  // Mirewood
  'stilt-shack': { kind: 'prop', what: 'a ramshackle swamp shack standing on tall wooden stilts: mossy plank walls, a crooked rusty tin roof, a small porch with a hanging lantern and a short ladder down', h: 6, faces: 8000 },
  'tree-mangrove': { kind: 'prop', what: 'a mangrove tree: a tangle of arching stilt roots holding up a short trunk and a round canopy of dark green leaves with hanging moss', h: 7, faces: 4000 },
  'crab-pot': { kind: 'prop', what: 'a round wicker crab pot trap with a coil of rope and a red and white cork float on top', h: 0.8, faces: 2000 },
  // Glowmere
  'tree-shroom': { kind: 'prop', what: 'a giant mushroom as tall as a tree: a thick pale stalk and a wide domed cap, teal blue with pale round spots', h: 8, faces: 3000 },
  'beacon': { kind: 'prop', what: 'a waist-high pillar of stacked grey stones holding an iron fire basket full of dry logs, not lit', h: 1.9, faces: 2500 },
  'f-glowshroom': { kind: 'prop', what: 'three small mushrooms growing in a clay pot, teal caps with pale spots', h: 0.6, faces: 2000, item: true },
  // Thistledown
  'windmill': { kind: 'prop', what: 'a little old stone windmill: a round whitewashed tower with a red conical cap, a small wooden door, one round window and four big cloth sails on a wooden cross', h: 9, faces: 8000 },
  'tree-dandelion': { kind: 'prop', what: 'a giant dandelion seed head as tall as a tree: a thick pale green stalk with one jagged leaf at its foot and on top a big round white fluffy ball of seeds', h: 8, faces: 3000 },
  // Sandglass Key
  'cactus': { kind: 'prop', what: 'a tall green saguaro cactus with two upturned arms and one small pink flower on top', h: 2.8, faces: 2000 },
  'sundial': { kind: 'prop', what: 'a big old stone sundial: a round sandstone table on a short thick pillar, with a triangular bronze pointer standing on it and hours carved round its rim', h: 1.7, faces: 3000 },
  // Kettle Isle
  'cannery': { kind: 'prop', what: 'a ruined old fish cannery: a long weathered grey timber shed on stone footings, its rusty corrugated iron roof half fallen in, one tall brick chimney at one end, a wide dark open doorway in the middle of its long front wall, and a faded painted fish on the boards beside the door', h: 6.5, faces: 9000 },
  'room-cannery': { kind: 'prop', what: 'a dolls house room with no front wall and no ceiling, seen from its open front: the inside of an abandoned fish cannery, a floor of worn grey planks and three walls of grey boards with broken windows, a long workbench with rusty tins along the back wall, a big rusty iron boiler in the back right corner, an old wooden desk with an open ledger on it against the left wall, a stack of wooden crates against the right wall, the middle of the floor bare', h: 3.6, faces: 9000 },
  'coral': { kind: 'prop', what: 'a clump of coral on a small rock: a branching orange-pink coral, a round purple brain coral and a little yellow fan', h: 0.9, faces: 1800 },
  'wreck': { kind: 'prop', what: 'the wreck of a small wooden fishing boat lying tilted on its side, its curved ribs showing through broken planks, a snapped mast, barnacles along the hull', h: 3, faces: 5000 },
  // Toys: the rarest prizes, which change how the island is got about or fished.
  'toy-skateboard': { kind: 'prop', what: 'a chunky wooden skateboard, a sea-blue deck with one red stripe down it and four fat yellow wheels', h: 0.2, faces: 2500, item: true },
  'toy-pogo': { kind: 'prop', what: 'a red pogo stick standing upright: a big coiled steel spring, two foot pegs, a T handle with black rubber grips and a rubber foot', h: 1.25, faces: 2500, item: true },
  'toy-balloons': { kind: 'prop', what: 'a bunch of five round balloons, red, yellow, blue, pink and green, their strings gathered into one knot at the bottom', h: 1.5, faces: 2500, item: true },
  'toy-bell': { kind: 'prop', what: 'a brass hand bell with a turned wooden handle, the kind rung for dinner', h: 0.32, faces: 2000, item: true },
  'toy-bottle': { kind: 'prop', what: 'a round corked glass bottle with a small dark storm cloud and a little yellow lightning bolt inside it', h: 0.34, faces: 2000, item: true },

  // --- Places to go into: each a room like a dolls' house, open at the front and the top, that the player walks about in ---
  'room-shop': { kind: 'prop', what: 'a dolls house room with no front wall and no ceiling, seen from its open front: the inside of a small bait and tackle shop, a plank floor and three plank walls, shelves of jars and tackle boxes along the back wall, a wooden counter with a brass till against the left wall, fishing rods in a rack against the right wall, a round rug in the middle of the bare floor', h: 3.4, faces: 9000 },
  'room-hut': { kind: 'prop', what: "a dolls house room with no front wall and no ceiling, seen from its open front: the inside of a fisherman's hut, a plank floor and three plank walls, a workbench with tools along the back wall, nets and buoys hung on the left wall, a pot-bellied stove and a stack of crab pots against the right wall, the middle of the floor left bare", h: 3.4, faces: 9000 },
  'room-aquarium': { kind: 'prop', what: 'a dolls house room with no front wall and no ceiling, seen from its open front: a small aquarium, a stone floor and three stone walls, two big glass fish tanks full of plain blue water set into each wall, a wooden bench in the middle of the floor', h: 3.6, faces: 9000 },
  'room-cave': { kind: 'prop', what: 'a sea cave cut open at the front and the top, seen from its open front: a horseshoe of dark grey rock walls with stalactites hanging along their tops, a wide flat rock ledge along the back wall, and in the middle a shallow empty stone basin', h: 4.5, faces: 9000 },
  'cave-mouth': { kind: 'prop', what: 'a tall arch of dark grey sea rock, the mouth of a cave, black inside, with barnacles and seaweed at its foot', h: 5.5, faces: 5000 },

  // --- Things held ---
  'rod-1': { kind: 'prop', what: 'a simple wooden fishing rod made from a stick, with a little reel, as a chunky toy, lying diagonally', h: 1.6, faces: 2000 },
  'rod-2': { kind: 'prop', what: 'a fishing rod with a blue fibreglass pole, a cork handle and a silver reel, as a chunky toy, lying diagonally', h: 1.6, faces: 2000 },
  'rod-3': { kind: 'prop', what: 'a fishing rod with a bright red pole, a black handle and a chunky gold reel, as a chunky toy, lying diagonally', h: 1.6, faces: 2000 },
  'rod-4': { kind: 'prop', what: 'a fancy fishing rod with a deep purple pole, gold rings and a big shiny gold reel, as a chunky toy, lying diagonally', h: 1.6, faces: 2000 },
  'rod-5': { kind: 'prop', what: 'a magical fishing rod with a glowing teal crystal pole, a star on the tip and a pearl reel, as a chunky toy, lying diagonally', h: 1.6, faces: 2500 },
  'bobber': { kind: 'prop', what: 'a round fishing float bobber, red on top and white below, with a little stick on top', h: 0.2, faces: 800 },
  'ukulele': { kind: 'prop', what: 'a small ukulele with a warm honey wood body, a round sound hole and a dark neck', h: 0.6, faces: 2000 },

  // --- Hats (made by Tripo: see TRIPO) ---
  'hat-bucket': { kind: 'hat', what: 'a soft sage green canvas bucket hat with a short drooping brim and stitched rings', h: 0.36, faces: 3000, item: true },
  'hat-straw': { kind: 'hat', what: 'a wide brimmed woven straw sun hat with a faded red ribbon band', h: 0.32, faces: 3000, item: true },
  'hat-beanie': { kind: 'hat', what: 'a chunky ribbed knitted mustard yellow beanie with a turned up cuff and a fat pom pom on top', h: 0.36, faces: 3000, item: true },
  'hat-captain': { kind: 'hat', what: 'a white ship captain hat with a black glossy peak at the front, a gold braid and a gold anchor badge', h: 0.34, faces: 3000, item: true },
  'hat-flowers': { kind: 'hat', what: 'a flower crown: a round ring of chunky pink, white and yellow daisies and green leaves, lying flat', h: 0.2, faces: 3000, item: true },
  'hat-frog': { kind: 'hat', what: 'a soft green frog hood hat with two big round googly eyes on top and a little smile on the front', h: 0.34, faces: 3000, item: true },
  'hat-pirate': { kind: 'hat', what: 'a black pirate tricorn hat with gold trim and a white skull and crossbones badge on the front', h: 0.32, faces: 3000, item: true },
  'hat-top': { kind: 'hat', what: 'a tall black silk top hat with a deep red band', h: 0.42, faces: 3000, item: true },
  'hat-propeller': { kind: 'hat', what: 'a round beanie cap in red, yellow and blue panels with a little red propeller on a stalk on top and a short peak at the front', h: 0.38, faces: 3000, item: true },
  'hat-cowboy': { kind: 'hat', what: 'a tan cowboy hat with a curled brim and a brown leather band', h: 0.32, faces: 3000, item: true },
  'hat-crown': { kind: 'hat', what: 'a small golden king crown with five points and round red and blue gems', h: 0.26, faces: 3000, item: true },
  'hat-mushroom': { kind: 'hat', what: 'a hat that is a big red toadstool mushroom cap with white spots, round and domed', h: 0.3, faces: 3000, item: true },
  'hat-fish': { kind: 'hat', what: 'a silly hat that is a whole fat orange fish with a big goofy eye and open mouth, lying flat as if sitting on a head, its tail sticking out the back', h: 0.3, faces: 3000, item: true },
  'hat-sailor': { kind: 'hat', what: 'a round white sailor hat with a turned up brim all round and a navy blue ribbon', h: 0.26, faces: 3000, item: true },
  'hat-viking': { kind: 'hat', what: 'a round silver viking helmet with a nose guard and two big cream horns curving up from the sides', h: 0.38, faces: 3000, item: true },
  'hat-chef': { kind: 'hat', what: 'a tall puffy white chef toque with a pleated band', h: 0.42, faces: 3000, item: true },
  // Silly ones
  'hat-duck': { kind: 'hat', what: 'a hat that is a big yellow rubber duck with an orange beak sitting on a little round cushion', h: 0.34, faces: 3000, item: true },
  'hat-cone': { kind: 'hat', what: 'an orange traffic cone with two white reflective stripes, worn as a hat, on a square base', h: 0.46, faces: 3000, item: true },
  'hat-cake': { kind: 'hat', what: 'a hat that is a round pink frosted birthday cake with sprinkles, white icing drips and one lit candle on top', h: 0.3, faces: 3000, item: true },
  'hat-wizard': { kind: 'hat', what: 'a tall floppy navy blue wizard hat with a wide brim, gold stars and a bent tip', h: 0.5, faces: 3000, item: true },
  'hat-party': { kind: 'hat', what: 'a cone shaped paper party hat with teal and pink stripes and a fluffy pom pom on the tip', h: 0.4, faces: 3000, item: true },
  'hat-crab': { kind: 'hat', what: 'a hat that is a grumpy red crab sitting on a round cushion with its claws raised up', h: 0.3, faces: 3000, item: true },
  'hat-bread': { kind: 'hat', what: 'a hat that is a whole golden loaf of bread with a split top crust, lying lengthways', h: 0.26, faces: 3000, item: true },
  'hat-lampshade': { kind: 'hat', what: 'a cream fabric lampshade with a frilly fringe at the bottom, worn as a hat, wide end down', h: 0.36, faces: 3000, item: true },
  'hat-shark': { kind: 'hat', what: 'a soft grey shark hood hat with a fin on top, little white teeth around the front opening and two small black eyes', h: 0.38, faces: 3000, item: true },
  // --- Worn things besides hats ---
  'x-glasses': { kind: 'extra', what: 'a pair of round tortoiseshell reading glasses, folded open, seen from the front', h: 0.12, faces: 2500, item: true },
  'x-shades': { kind: 'extra', what: 'a pair of chunky black sunglasses with dark lenses, folded open, seen from the front', h: 0.12, faces: 2500, item: true },
  'x-scarf': { kind: 'extra', what: 'a chunky knitted red and cream striped scarf wound round into a thick closed ring like a doughnut, as if worn round a neck with nobody in it, one short end tucked in at the front, lying flat, seen from the front and above', h: 0.18, faces: 3000, item: true },
  'x-bowtie': { kind: 'extra', what: 'a big red polka dot bow tie', h: 0.12, faces: 2000, item: true },
  'x-backpack': { kind: 'extra', what: 'a small tan canvas hiking backpack with a rolled up green blanket on top and two side pockets, seen from behind', h: 0.4, faces: 3000, item: true },
  'x-flower': { kind: 'extra', what: 'a single big pink hibiscus flower with green leaves', h: 0.14, faces: 2000, item: true },
  'x-mustache': { kind: 'extra', what: 'a big bushy brown handlebar mustache with curled tips, seen from the front', h: 0.08, faces: 2000, item: true },
  'x-snorkel': { kind: 'extra', what: 'a swimming mask with a teal frame and a curved orange snorkel tube on the side, seen from the front', h: 0.3, faces: 2500, item: true },
};

/** Fish (and the odd thing that is not a fish). Each is a model the player holds up, and an icon in the journal. */
export const FISH_ART = {
  // Ocean
  'sardine': 'a small silver-blue sardine',
  'mackerel': 'a mackerel with wavy dark green stripes on its back and a silver belly',
  'flounder': 'a flat sandy-brown flounder with both eyes on one side and soft spots',
  'sea-bass': 'a sturdy grey sea bass with spiky back fins',
  'red-snapper': 'a bright pinky-red snapper with a big eye',
  'pufferfish': 'a round puffed up yellow pufferfish with little blunt spikes and a tiny mouth',
  'crab': 'a red crab with two big claws, seen from the front a little above',
  'squid': 'a pink squid with a pointed head fin and short chunky tentacles, lying sideways',
  'seahorse': 'an orange seahorse with a curled tail, seen from the side',
  'jellyfish': 'a pale lilac jellyfish with a round dome and short chunky tentacles',
  // Deep
  'tuna': 'a big bluefin tuna, dark blue on top and silver below with yellow finlets',
  'swordfish': 'a swordfish with a long pointed bill and a tall blue back fin',
  'anglerfish': 'a dark round anglerfish with big teeth and a glowing yellow lure on a stalk',
  'oarfish': 'a long ribbon-like silver oarfish with a red crest fin, curved in an S shape',
  'coelacanth': 'a chunky ancient coelacanth, deep blue with pale white spots and lobed fins',
  'octopus': 'an orange octopus with chunky curled tentacles',
  // Pond
  'bluegill': 'a small round bluegill sunfish, olive with a blue cheek and orange throat',
  'perch': 'a yellow perch with dark vertical bars and orange fins',
  'carp': 'a big bronze carp with large scales and little whiskers',
  'koi': 'a white koi fish with big bright orange and black patches',
  'catfish': 'a grey catfish with long whiskers and a wide flat head',
  'goldfish': 'a round orange goldfish with a flowing tail',
  'turtle': 'a small green pond turtle with a brown shell, seen from the side',
  'axolotl': 'a pink axolotl with feathery gills, seen from the side',
  // Creek
  'trout': 'a rainbow trout with a pink stripe along its side and little black spots',
  'salmon': 'a silver-pink salmon with a hooked jaw',
  'crayfish': 'a red-brown crayfish with two claws, seen from the side',
  'pike': 'a long green pike with pale spots and a duck-like snout',
  'sturgeon': 'a long grey sturgeon with rows of bony plates and whiskers',
  'golden-trout': 'a golden trout, shining gold with a red stripe and orange fins',
  'eel': 'a long dark olive eel with a little fin along its back, curved in an S shape',
  'minnow': 'a tiny slim silver minnow with a dark stripe',
  // Things that are not fish
  'boot': 'an old soggy brown leather boot with a bit of green weed on it',
  'can': 'a crumpled old tin can with no label',
  'seaweed': 'a clump of chunky green seaweed',
  'bottle': 'a green glass bottle with a rolled paper message inside and a cork',
  'cod': 'a chunky speckled olive-brown cod with a pale belly and a little chin whisker',
  'grayling': 'a silvery grayling with a huge sail-like purple spotted back fin',
  'lobster': 'a red lobster with two big claws and long feelers, seen from the side',
  'shrimp': 'a small curled pink shrimp with long feelers',
  'snail': 'a little pond snail with a brown spiral shell and soft grey body, seen from the side',
  'starfish': 'an orange five-armed starfish with little bumps, seen from above',
  'sunfish': 'a huge round flat grey ocean sunfish, a big disc with tall fins top and bottom and no tail',
  'tadpole': 'a round dark olive tadpole with a wiggly tail',
  'manta': 'a big dark blue manta ray with a white belly and wide wing fins, seen from above at an angle',
  'whale-shark': 'a big blue-grey whale shark covered in white spots with a wide flat mouth',
  'giant-squid': 'a big red giant squid with huge eyes and long curling tentacles, lying sideways',
  'treasure': 'a small wooden treasure chest with gold bands and a gold lock, closed',
  // Fog, storms, the sea cave and the seasons (added last, so they are a sheet of their own)
  'ghost-carp': 'a pale ghostly white carp with long trailing fins and faint grey scales',
  'mist-ray': 'a pale grey stingray with soft white edges to its wings and a long thin tail, seen from above',
  'spark-bass': 'a dark blue bass with bright yellow zigzag lightning stripes down its side',
  'thunder-eel': 'a long fat storm-grey eel with a row of glowing yellow spots along its side',
  'cave-fish': 'a small pale pink cave fish with no eyes and see-through fins',
  'lantern-shrimp': 'a little red shrimp with a glowing yellow lantern-like belly and long feelers',
  'crystal-crab': 'a crab with a shell of pale blue crystal spikes and purple claws, seen from above',
  'frost-char': 'an icy blue char fish with a white belly and pale frosty spots',
  'maple-salmon': 'a salmon coloured like autumn leaves, deep red with orange and gold patches',
  // Kettle Isle: the crater lake
  'ember-newt': 'a small newt, orange as an ember with a yellow belly and black spots, seen from above',
  'steam-pike': 'a long pale grey pike with a white belly and faint wisps of steam coming off its back',
  'door-carp': 'an enormous flat-sided carp as tall as it is long, moss green with big dull bronze scales and a heavy frowning mouth',
  'the-lid': 'a huge round flat fish like a pot lid, dark slate grey with a brass-coloured knob-shaped bump in the middle of its back and two small eyes on top, seen from above',
  // Kettle Isle: the reef
  'parrotfish': 'a parrotfish, turquoise and pink with a beak-like mouth',
  'clownfish': 'a small orange clownfish with three white bands edged in black',
  'reef-moray': 'a moray eel, speckled yellow-green, its mouth a little open, coiled in an S',
  'lionfish': 'a lionfish with red and white stripes and long spiny fanned fins',
  // Kettle Isle: the tide pools
  'hermit-crab': 'a hermit crab peeping out of a spiral whelk shell, orange legs and eye stalks',
  'sea-urchin': 'a round purple sea urchin covered in spines',
  'sea-slug': 'a small sea slug, bright blue with yellow stripes and two feathery orange horns',
  // Rimefall: through the ice
  'ice-smelt': 'a slim silver smelt with a pale blue back',
  'glass-cod': 'a cod so pale it is almost see-through, its bones showing faintly through its side',
  'snow-crab': 'a long-legged white and orange snow crab, seen from above',
  'lampfish': 'a small dark deep-water fish with big eyes and a row of glowing blue dots along its side',
  'old-frostbite': 'a huge pike covered in frost crystals, pale blue-white, with a beard of small icicles under its jaw',
  // Rimefall: the cold sea
  'capelin': 'a small olive-backed silver capelin',
  'halibut': 'a big flat halibut, mottled brown-green, both eyes on top, seen from above',
  'wolffish': 'a grumpy blue-grey wolffish with a big head and crooked teeth showing',
  'pocket-narwhal': 'a chubby little narwhal, grey-white with dark spots and a spiral tusk',
  // Mirewood: the channels
  'mudskipper': 'a mudskipper with bulging eyes on top of its head and a tall spotted fin on its back',
  'bog-gar': 'a long olive spotted gar with a narrow toothy snout',
  'snapper-turtle': 'a snapping turtle with a spiky mossy shell and a hooked beak, seen from above',
  'bog-lantern': 'a round dark green swamp fish with a glowing yellow lure like a firefly dangling over its head',
  'the-log': 'an enormous long gar that looks exactly like a mossy floating log, bark-brown with moss on its back and two small eyes',
  // Mirewood: the crab pots
  'mud-crab': 'a broad dark brown mud crab with big claws, seen from above',
  'blue-crab': 'a blue crab with red-tipped claws, seen from above',
  'whelk': 'a spiral whelk sea snail, cream and brown, with its foot out',
  'pot-octopus': 'a small orange octopus curled up inside a clay pot, two eyes peeping over the rim',
  // Glowmere: the glowing shallows
  'glow-fry': 'a tiny see-through fish with a bright teal glowing belly',
  'comb-jelly': 'a clear comb jelly with rows of rainbow lights down its sides',
  'moon-wrasse': 'a wrasse coloured like the night sky, deep blue with one pale crescent moon shape on its side',
  'star-ray': 'a small ray, midnight blue and dotted with glowing white stars, seen from above',
  'the-comet': 'a long silver fish with a glowing white head and a long streaming tail of pale light, like a comet',
  // Glowmere: the mere
  'lamp-newt': 'a pale newt with glowing yellow spots, seen from above',
  'ghost-koi': 'a koi, white with glowing pale green patches',
  'spore-puffer': 'a round pufferfish that looks like a puffball mushroom, cream with brown warts',
  // Thistledown: the sea of cloud
  'puff-minnow': 'a tiny round white fish like a puff of cloud, with one blue eye',
  'kite-ray': 'a diamond-shaped ray, red and yellow like a kite, with a long ribbon tail tied with bows, seen from above',
  'drizzle-eel': 'a long thin grey-blue eel with rows of pale raindrop spots',
  'sun-dab': 'a round flat golden fish like a little sun, with short pointed rays for fins',
  'thunderhead': 'a grumpy dark grey puffer fish shaped like a storm cloud, with a small yellow lightning bolt on its side',
  'weathercock': 'a fish with a red rooster comb and long curled tail feathers, coppery green like an old weathervane',
  'silver-lining': 'a big cloud-white fish with a bright shining silver edge all the way round it',
  // Thistledown: the Aerie
  'dew-darter': 'a tiny clear round fish like a drop of dew, with a green leaf-shaped tail',
  'halo-carp': 'a white carp with a thin gold ring floating over its head',
  // Sandglass Key: the Sinks
  'dune-dart': 'a small slim sand-coloured fish with darker ripple stripes',
  'scarab-crab': 'a round crab, shiny blue-green like a scarab beetle, seen from above',
  'sidewinder': 'a tan eel with a brown diamond pattern like a snake, curled in an S shape',
  'hourglass-fish': 'a see-through glass fish shaped like an hourglass, with yellow sand inside it',
  'mirage-koi': 'a shimmering pale blue and pink koi, its edges wavy like a heat haze',
  'dust-devil': 'a big fish like a whirling brown tornado of sand, with two bright yellow eyes',
  // Sandglass Key: the oasis
  'date-perch': 'a plump dark brown perch the colour of a date, with a green tail',
  'palm-terrapin': 'a small green terrapin with a palm tree pattern on its shell, seen from above',
  'lotus-carp': 'a pink and white carp with fins like lotus petals',
};

/** Pictures only (no model): icons for things in the shop and the game's own art. */
export const ICONS = {
  'bait-worm': 'a little jar of pink earthworms',
  'bait-cricket': 'a little wooden box with two green crickets on the lid',
  'bait-minnow': 'a small tin bucket with a few tiny silver minnows',
  'bait-glow': 'a little glass jar of glowing blue-green glow worms',
  'bait-lure': 'a shiny spoon fishing lure, silver with a red stripe and a hook',
  'bait-golden': 'a sparkling golden fishing lure shaped like a little fish',
  'coin': 'a single shiny gold coin with a fish engraved on it, seen straight on',
  'bag': 'a blue cooler box for fish, closed',
  'journal': 'a chunky green leather notebook with a fish drawn on the cover',
  'boat-ticket': 'a little paper ticket with a picture of a rowboat',
  'upgrade-cooler': 'a big red and white cooler box with a lid',
  'token': 'a single round lustrous pearl, creamy white with a soft lilac sheen, sitting in a little open clam shell',
  'chest-tide': 'a small weathered wooden treasure chest with rope handles and a little starfish stuck to it, closed',
  'chest-gilded': 'an ornate treasure chest of dark wood with heavy gold bands, gold corners and a big gold lock, closed',
  'ticket-penny': 'a small green scratch card lottery ticket with a wavy edge and a silver scratch panel',
  'ticket-lucky': 'a blue scratch card lottery ticket with a four leaf clover and a silver scratch panel',
  'ticket-splash': 'a red and gold scratch card lottery ticket with a splash of water and a silver scratch panel',
  'lure-none': 'a single plain silver fish hook',
  'lure-big': 'a big chunky orange fishing plug lure shaped like a fat little fish with two hooks',
  'lure-small': 'a tiny fly fishing fly made of feathers on a small hook',
  'lure-sparkle': 'a glittering spinner fishing lure with a shiny star shaped blade',
  'lure-magnet': 'a red horseshoe magnet with silver tips on a fishing line',
  'lure-twin': 'a fishing line with two hooks side by side, each with a little red bead',
  'lure-lucky': 'a green four leaf clover charm on a little fishing hook',
  'lure-rain': 'a little charm shaped like a blue rain cloud with a raindrop on a fishing hook',
  // Line and hooks
  'line-1': 'a small wooden spool of plain white cotton fishing line',
  'line-2': 'a spool of green braided fishing line',
  'line-3': 'a big brass reel spool of dark blue sea fishing line',
  'line-4': 'a silver spool of fine shimmering spider silk thread',
  'hook-1': 'a bent steel pin used as a fishing hook',
  'hook-2': 'a steel fishing hook with a sharp barb',
  'hook-3': 'a round bronze circle fishing hook',
  'hook-4': 'a golden fishing hook with a tiny green clover charm on it',
  'bait-crawler': 'a little tin of fat pink night crawler worms in dark earth',
  // A sign for the camp, the map, the trader, and paint for the rod
  'f-campsign': 'a small wooden signboard on two short posts, a blank cream painted board with a rope trim',
  'icon-map': 'a rolled sea chart partly unrolled, cream paper with a small island drawn on it and a red cross',
  'icon-trader': 'a big travelling backpack with a bedroll on top, pots and a lantern hanging off it',
  'paint-coral': 'a small open tin of red-orange paint with a little brush resting across it',
  'paint-sea': 'a small open tin of sea blue paint with a little brush resting across it',
  'paint-moss': 'a small open tin of moss green paint with a little brush resting across it',
  'paint-brass': 'a small open tin of golden yellow paint with a little brush resting across it',
  'paint-rose': 'a small open tin of pink paint with a little brush resting across it',
  'paint-ink': 'a small open tin of black paint with a little brush resting across it',
  // Won on the far islands: paints, charms and a pair of stilts
  'paint-frost': 'a small open tin of pale icy blue paint with a little brush resting across it, frost on the tin',
  'paint-mire': 'a small open tin of dark swamp green paint with a little brush resting across it',
  'paint-glow': 'a small open tin of glowing teal paint with a little brush resting across it, the paint shining',
  'charm-icicle': 'a small clear icicle on a loop of string',
  'charm-claw': 'a red crab claw on a loop of string',
  'charm-ember': 'a small glowing orange ember in a tiny iron cage on a loop of string',
  'toy-stilts': 'a pair of tall wooden stilts with foot blocks, leaning together',
  // Won on Thistledown and Sandglass Key
  'paint-sky': 'a small open tin of pale sky blue paint with a little brush resting across it, a small white cloud painted on the tin',
  'paint-sand': 'a small open tin of warm sandy yellow paint with a little brush resting across it',
  'charm-seed': 'a single white fluffy dandelion seed on a loop of string',
  'charm-hourglass': 'a tiny brass hourglass with yellow sand in it on a loop of string',
  'toy-cloud': 'a small fat white cloud with a flat bottom, like a cushion, with a tiny blue rope handle',
  'toy-watch': 'a round brass pocket watch on a chain, its lid open, with a sun and a moon on its face',
  // Charms for the rod
  'charm-bell': 'a tiny brass bell on a loop of red string',
  'charm-feather': 'a blue and white feather tied to a loop of string',
  'charm-shell': 'a small pink spiral sea shell on a loop of string',
  'charm-star': 'a little golden star charm on a loop of string',
  'charm-fish': 'a tiny carved wooden fish charm on a loop of string',
  'charm-moon': 'a little silver crescent moon charm on a loop of string',
};

/**
 * The title picture as the game wears it: pixel art, asked for as pixel art, so that cut down to
 * the 256 pixels across the game shows, its pixels are still its own. (The `title` below is the soft poster it
 * was first made as.) Painted by Tripo's image model: tools/assets/make-title.mjs.
 */
export const TITLE_PIXEL = {
  size: '1024x1536',
  prompt:
    'Pixel art, tall portrait poster for a cosy fishing video game, in the style of a 16-bit handheld game title screen: big chunky square pixels, flat colours, hard edges, a short palette of about twenty colours, dark outlines, no gradients, no blur, no anti-aliasing. ' +
    'A small green island cove at golden hour seen from the water. Lower third: calm teal sea in flat bands with a few white pixel glints, and a wooden pier coming in from the left; at the end of the pier sits a small chubby brown otter in a light blue shirt and a straw hat, seen from behind, holding a fishing rod, its red and white bobber floating on the water. Middle: a sandy beach, round green trees and dark pines, a little blue bait shop with a red striped awning, and on a grassy hill to the right a short red and white striped lighthouse. Upper half: a wide empty evening sky in flat bands from warm peach at the horizon to soft blue above, with two small pixel clouds and three tiny gulls. ' +
    'Nothing in the top third but sky. No text, no letters, no logo, no border, no frame, no interface.',
};

/** Flat pictures: the title, the Home Screen icon. */
export const PICTURES = {
  title: { size: '1024x1536', prompt: 'a cosy illustrated poster of a small green island cove at golden hour: a short red and white lighthouse on a grassy hill, a little wooden pier reaching into calm turquoise water with a tiny rowboat, pine trees, a small blue bait shop with a striped awning, a chubby otter in a light blue shirt sitting at the end of the pier with a fishing rod, soft low poly 3D look, pastel colours, warm light, lots of empty sky at the top, no text, no lettering' },
  icon: { size: '1024x1024', prompt: 'an app icon: a chubby cute otter face peeking over a red and white fishing bobber floating on turquoise water, soft low poly 3D look, flat pastel colours, centred, filling the square, no text, no border' },
};

/**
 * Ground textures painted by Tripo's image model and made to repeat by tools/assets/make-ground.mjs.
 * They share one look, so the ground reads as one painted surface under the toy-like models.
 */
export const GROUND_LOOK = 'a seamless tileable square texture seen from directly above, for a stylised cosy 3D game, hand painted with soft broad brush strokes, simple shapes, flat even lighting, no shadows, no perspective, no horizon, low contrast, muted warm natural colours, the same all over with nothing in particular in the middle, no objects, no text';
export const GROUND = {
  grass: 'short soft meadow grass painted as overlapping clumps of rounded leaf shaped brush strokes in a few close greens, sage and fresh green with a hint of yellow',
  sand: 'smooth pale golden beach sand with soft wind ripples and a few tiny scattered pebbles and speckles',
  dirt: 'a packed earth footpath, warm light brown with soft blotches and a few small rounded pebbles',
  rock: 'smooth grey stone with a few soft flat facets and gentle cracks, cool grey with hints of moss green',
  plaza: 'irregular rounded flagstone paving in warm cream and pale grey stones, soft mortar lines between them, each stone gently rounded',
  wood: 'weathered wooden deck planks running left to right, soft warm grey brown, simple grain lines and a few round knots',
};

/** Tiled ground textures, once painted through fal (see GROUND for those painted by Tripo). */
export const TEXTURE_MODEL = 'fal-ai/flux/schnell';
export const TEXTURES = {
  grass: 'seamless tileable texture of a soft lawn seen from directly above, stylised low contrast painterly game texture, gentle small tufts, pale fresh spring green, uniform all over, simple, no flowers, no objects, flat lighting',
  sand: 'seamless tileable texture of soft pale beach sand seen from directly above, stylised hand painted game texture, flat lighting, warm cream colour, faint ripples and a few tiny pebbles, even all over',
  dirt: 'seamless tileable texture of a soft packed earth path seen from directly above, stylised low contrast painterly game texture, warm light tan, a few small round pebbles, uniform all over, no cracks, no objects, flat lighting',
  rock: 'seamless tileable texture of smooth grey stone seen from directly above, stylised low contrast painterly game texture, soft rounded facets, uniform all over, no large cracks, no objects, flat lighting',
  plaza: 'seamless tileable texture of small rounded cream and warm grey cobblestones in a regular pattern seen from directly above, stylised low contrast painterly game texture, uniform all over, nothing else, no objects, no plants, flat lighting',
  wood: 'seamless tileable texture of weathered pale wooden deck planks running left to right seen from directly above, stylised hand painted game texture, flat lighting, even all over',
};

/** Sound effects and music, made through fal. */
export const SFX_MODEL = 'fal-ai/elevenlabs/sound-effects/v2';
export const MUSIC_MODEL = 'fal-ai/elevenlabs/music';
export const SOUNDS = {
  cast: { text: 'a quick whoosh of a fishing rod being cast, with a short fishing reel zip', secs: 1.2 },
  plop: { text: 'a small fishing bobber plopping into calm water, a light splash', secs: 0.8 },
  nibble: { text: 'a tiny soft water blip, a fish nibbling at a float', secs: 0.5 },
  bite: { text: 'a sudden bubbly splash as a fish grabs the bait and pulls the float under', secs: 1.0 },
  reel: { text: 'a fishing reel clicking and ratcheting steadily as line is wound in, loopable', secs: 2.0, loop: true },
  snap: { text: 'a fishing line snapping with a twang', secs: 0.8 },
  splash: { text: 'a fish being pulled out of the water with a big splashy splash and drips', secs: 1.2 },
  catch: { text: 'a short happy cheerful xylophone and ukulele jingle, a little fanfare for catching something, video game reward', secs: 2.2 },
  rare: { text: 'a sparkling magical chime arpeggio with a shimmer, video game rare item found', secs: 2.5 },
  coin: { text: 'a bright cheerful cash register coin jingle, video game shop purchase', secs: 1.0 },
  click: { text: 'a soft wooden button pop click for a cosy game menu', secs: 0.5 },
  open: { text: 'a soft paper page rustle and flip, opening a notebook', secs: 0.7 },
  levelup: { text: 'a cheerful short marimba and bells fanfare, video game level up', secs: 2.5 },
  step: { text: 'a single soft footstep on grass', secs: 0.5 },
  stepwood: { text: 'a single soft footstep on a wooden pier plank', secs: 0.5 },
  waves: { text: 'gentle calm ocean waves lapping on a sandy shore, peaceful ambience, seamless loop', secs: 20, loop: true },
  birds: { text: 'soft daytime birdsong in a quiet seaside meadow, light breeze, peaceful ambience, seamless loop', secs: 20, loop: true },
  night: { text: 'quiet night ambience with crickets chirping and a soft breeze, peaceful, seamless loop', secs: 20, loop: true },
  rain: { text: 'steady gentle rain falling on leaves and water, cosy ambience, seamless loop', secs: 20, loop: true },
  fire: { text: 'a small campfire crackling softly, seamless loop', secs: 10, loop: true },
  uke: { text: 'a single clean plucked ukulele note, middle C, warm and short', secs: 1.5 },
  chalk: { text: 'a piece of chalk scraping on pavement, short stroke', secs: 0.6 },
  splashstep: { text: 'a single soft splashy footstep in shallow water', secs: 0.5 },
  row: { text: 'a wooden oar stroke pulling through calm water', secs: 1.2 },
  quest: { text: 'a cheerful little paper stamp and bell ding, task completed in a cosy game', secs: 1.2 },
  wave: { text: 'a cute short cartoon hello chirp, friendly', secs: 0.6 },
};
export const MUSIC = {
  day: { prompt: 'cosy relaxed lo-fi acoustic instrumental for a peaceful fishing game: gentle ukulele, soft acoustic guitar, light brushed drums, warm bass, sunny seaside afternoon, calm and happy, no vocals, loopable', ms: 120000 },
  night: { prompt: 'calm sleepy instrumental for a cosy fishing game at night: soft electric piano, gentle vibraphone, warm pads, slow lazy beat, starry sky by the sea, no vocals, loopable', ms: 120000 },
  rain: { prompt: 'soft mellow instrumental for a cosy fishing game on a rainy day: gentle piano, muted guitar, warm cello, slow and cosy, no vocals, loopable', ms: 90000 },
};
