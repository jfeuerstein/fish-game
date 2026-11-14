// Every generated asset in the game, as the words it is made from.
//
// A picture of each is painted through fal, a 3D model is made of the picture (Tripo's model,
// served by fal), and tools/assets/make-models.mjs slims it for the phone. Characters are then
// rigged and given animations by Tripo. Nothing here names any other game.

/** The model that paints the pictures, and the one that makes a shape of a picture. */
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
  'rowboat': { kind: 'prop', what: 'a small wooden rowboat painted white with a red stripe, two oars resting inside, empty', h: 1.0, faces: 6000 },
  'buoy': { kind: 'prop', what: 'a round floating sea buoy, red and white, with a little bell on top', h: 1.6, faces: 3000 },

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

  // --- Things held ---
  'rod-1': { kind: 'prop', what: 'a simple wooden fishing rod made from a stick, with a little reel, as a chunky toy, lying diagonally', h: 1.6, faces: 2000 },
  'rod-2': { kind: 'prop', what: 'a fishing rod with a blue fibreglass pole, a cork handle and a silver reel, as a chunky toy, lying diagonally', h: 1.6, faces: 2000 },
  'rod-3': { kind: 'prop', what: 'a fishing rod with a bright red pole, a black handle and a chunky gold reel, as a chunky toy, lying diagonally', h: 1.6, faces: 2000 },
  'rod-4': { kind: 'prop', what: 'a fancy fishing rod with a deep purple pole, gold rings and a big shiny gold reel, as a chunky toy, lying diagonally', h: 1.6, faces: 2000 },
  'rod-5': { kind: 'prop', what: 'a magical fishing rod with a glowing teal crystal pole, a star on the tip and a pearl reel, as a chunky toy, lying diagonally', h: 1.6, faces: 2500 },
  'bobber': { kind: 'prop', what: 'a round fishing float bobber, red on top and white below, with a little stick on top', h: 0.2, faces: 800 },
  'ukulele': { kind: 'prop', what: 'a small ukulele with a warm honey wood body, a round sound hole and a dark neck', h: 0.6, faces: 2000 },

  // --- Hats ---
  'hat-bucket': { kind: 'hat', what: 'a soft green canvas bucket hat', h: 0.36, faces: 2000, item: true },
  'hat-straw': { kind: 'hat', what: 'a wide brimmed woven straw sun hat with a red ribbon band', h: 0.32, faces: 2500, item: true },
  'hat-beanie': { kind: 'hat', what: 'a chunky knitted yellow beanie with a fat pom pom on top', h: 0.36, faces: 2000, item: true },
  'hat-captain': { kind: 'hat', what: 'a white ship captain hat with a black peak and a gold anchor badge', h: 0.34, faces: 2500, item: true },
  'hat-flowers': { kind: 'hat', what: 'a flower crown: a ring of chunky pink, white and yellow flowers and green leaves', h: 0.2, faces: 2500, item: true },
  'hat-frog': { kind: 'hat', what: 'a cute green frog hat with two big round eyes on top', h: 0.34, faces: 2500, item: true },
  'hat-pirate': { kind: 'hat', what: 'a black pirate tricorn hat with gold trim and a white skull badge', h: 0.32, faces: 2500, item: true },
  'hat-top': { kind: 'hat', what: 'a tall black top hat with a red band', h: 0.42, faces: 2000, item: true },
  'hat-propeller': { kind: 'hat', what: 'a colourful beanie cap with a little red propeller on top, in red, yellow and blue panels', h: 0.38, faces: 2500, item: true },
  'hat-cowboy': { kind: 'hat', what: 'a tan cowboy hat with a curled brim and a brown band', h: 0.32, faces: 2500, item: true },
  'hat-crown': { kind: 'hat', what: 'a small golden crown with round red and blue gems', h: 0.26, faces: 2500, item: true },
  'hat-mushroom': { kind: 'hat', what: 'a mushroom cap hat: a big red cap with white spots', h: 0.3, faces: 2000, item: true },
  'hat-fish': { kind: 'hat', what: 'a funny hat shaped like a whole orange fish lying on top of the head', h: 0.3, faces: 2500, item: true },
  'hat-sailor': { kind: 'hat', what: 'a round white sailor hat with a turned up brim and a blue ribbon', h: 0.26, faces: 2000, item: true },
  'hat-viking': { kind: 'hat', what: 'a round silver viking helmet with two chunky cream horns', h: 0.38, faces: 2500, item: true },
  'hat-chef': { kind: 'hat', what: 'a tall puffy white chef hat', h: 0.42, faces: 2000, item: true },
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
};

/** Flat pictures: the title, the Home Screen icon. */
export const PICTURES = {
  title: { size: '1024x1536', prompt: 'a cosy illustrated poster of a small green island cove at golden hour: a short red and white lighthouse on a grassy hill, a little wooden pier reaching into calm turquoise water with a tiny rowboat, pine trees, a small blue bait shop with a striped awning, a chubby otter in a light blue shirt sitting at the end of the pier with a fishing rod, soft low poly 3D look, pastel colours, warm light, lots of empty sky at the top, no text, no lettering' },
  icon: { size: '1024x1024', prompt: 'an app icon: a chubby cute otter face peeking over a red and white fishing bobber floating on turquoise water, soft low poly 3D look, flat pastel colours, centred, filling the square, no text, no border' },
};

/** Tiled ground textures, painted through fal and made seamless by tools/assets/make-textures.mjs. */
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
