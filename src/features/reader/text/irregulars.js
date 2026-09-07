/**
 * irregulars.js
 *
 * WHY PLAIN COMMONJS, NOT TYPESCRIPT/ESM:
 * This file is loaded two different ways by design:
 *   1. `require()`-d directly by Jest/Node during unit testing.
 *   2. `require()`-d directly by native RN code (Metro resolves plain
 *      CommonJS `.js` files natively, no transpile step needed for this
 *      ES5/ES2017-safe syntax) — e.g. `src/features/reader/components/
 *      ReaderPage.tsx`'s native tokenization path.
 *
 * Using `module.exports` keeps this file working untouched under both Jest
 * and Metro. ES5/ES2017-safe syntax only, no TS types.
 */

// Flat surface-form -> lemma map for irregular verbs, irregular plural
// nouns, and irregular comparative/superlative adjectives/adverbs.
// Coverage target: the ~150-200 highest-frequency English irregular verbs,
// covering every common inflected surface form (base, 3rd person -s where
// it's irregular e.g. "has"/"does"/"goes", past, past participle, and
// -ing where spelling is irregular e.g. "lying").
var irregularLemmas = {
  // be
  am: "be", is: "be", are: "be", was: "be", were: "be", been: "be", being: "be",
  // have
  have: "have", has: "have", had: "have", having: "have",
  // do
  do: "do", does: "do", did: "do", done: "do", doing: "do",
  // go
  go: "go", goes: "go", went: "go", gone: "go", going: "go",
  // say
  say: "say", says: "say", said: "say", saying: "say",
  // get
  get: "get", gets: "get", got: "get", gotten: "get", getting: "get",
  // make
  make: "make", makes: "make", made: "make", making: "make",
  // know
  know: "know", knows: "know", knew: "know", known: "know", knowing: "know",
  // think
  think: "think", thinks: "think", thought: "think", thinking: "think",
  // take
  take: "take", takes: "take", took: "take", taken: "take", taking: "take",
  // see
  see: "see", sees: "see", saw: "see", seen: "see", seeing: "see",
  // come
  come: "come", comes: "come", came: "come", coming: "come",
  // want (regular, omit)
  // give
  give: "give", gives: "give", gave: "give", given: "give", giving: "give",
  // find
  find: "find", finds: "find", found: "find", finding: "find",
  // tell
  tell: "tell", tells: "tell", told: "tell", telling: "tell",
  // ask (regular, omit)
  // work (regular, omit)
  // seem (regular, omit)
  // feel
  feel: "feel", feels: "feel", felt: "feel", feeling: "feel",
  // leave
  // NOTE: "leaves" is ambiguous between the verb "leave" (3rd person
  // singular, "he leaves") and the plural noun "leaf" (see the irregular
  // plural nouns section below) — resolved in favor of the noun "leaf"
  // there since it's the less regular/more surprising mapping; the verb
  // sense is a documented limitation for this exact surface form.
  leave: "leave", left: "leave", leaving: "leave",
  // put
  put: "put", puts: "put", putting: "put",
  // mean
  mean: "mean", means: "mean", meant: "mean", meaning: "mean",
  // keep
  keep: "keep", keeps: "keep", kept: "keep", keeping: "keep",
  // let
  let: "let", lets: "let", letting: "let",
  // begin
  begin: "begin", begins: "begin", began: "begin", begun: "begin", beginning: "begin",
  // hear
  hear: "hear", hears: "hear", heard: "hear", hearing: "hear",
  // run
  run: "run", runs: "run", ran: "run", running: "run",
  // bring
  bring: "bring", brings: "bring", brought: "bring", bringing: "bring",
  // write
  write: "write", writes: "write", wrote: "write", written: "write", writing: "write",
  // stand
  stand: "stand", stands: "stand", stood: "stand", standing: "stand",
  // lose
  lose: "lose", loses: "lose", lost: "lose", losing: "lose",
  // pay
  pay: "pay", pays: "pay", paid: "pay", paying: "pay",
  // meet
  meet: "meet", meets: "meet", met: "meet", meeting: "meet",
  // sit
  sit: "sit", sits: "sit", sat: "sit", sitting: "sit",
  // speak
  speak: "speak", speaks: "speak", spoke: "speak", spoken: "speak", speaking: "speak",
  // lie (recline)
  // NOTE: "lay" is ambiguous between the past tense of "lie" (recline) and
  // the base form of the separate verb "lay" (to place, see below) — we
  // resolve the collision in favor of "lay" (base verb) since it's the
  // more frequent surface form in prose; "lie"'s past tense is under-covered
  // as a documented limitation.
  lie: "lie", lies: "lie", lain: "lie", lying: "lie",
  // lead
  lead: "lead", leads: "lead", led: "lead", leading: "lead",
  // read (irregular pronunciation, same spelling for past — include for completeness)
  read: "read", reads: "read", reading: "read",
  // grow
  grow: "grow", grows: "grow", grew: "grow", grown: "grow", growing: "grow",
  // lose already above
  // fall
  fall: "fall", falls: "fall", fell: "fall", fallen: "fall", falling: "fall",
  // send
  send: "send", sends: "send", sent: "send", sending: "send",
  // build (regular-ish but irregular past)
  build: "build", builds: "build", built: "build", building: "build",
  // understand
  understand: "understand", understands: "understand", understood: "understand", understanding: "understand",
  // draw
  draw: "draw", draws: "draw", drew: "draw", drawn: "draw", drawing: "draw",
  // break
  break: "break", breaks: "break", broke: "break", broken: "break", breaking: "break",
  // spend
  spend: "spend", spends: "spend", spent: "spend", spending: "spend",
  // cut
  cut: "cut", cuts: "cut", cutting: "cut",
  // rise
  rise: "rise", rises: "rise", rose: "rise", risen: "rise", rising: "rise",
  // drive
  drive: "drive", drives: "drive", drove: "drive", driven: "drive", driving: "drive",
  // buy
  buy: "buy", buys: "buy", bought: "buy", buying: "buy",
  // wear
  wear: "wear", wears: "wear", wore: "wear", worn: "wear", wearing: "wear",
  // choose
  choose: "choose", chooses: "choose", chose: "choose", chosen: "choose", choosing: "choose",
  // catch
  catch: "catch", catches: "catch", caught: "catch", catching: "catch",
  // fight
  fight: "fight", fights: "fight", fought: "fight", fighting: "fight",
  // teach
  teach: "teach", teaches: "teach", taught: "teach", teaching: "teach",
  // sell
  sell: "sell", sells: "sell", sold: "sell", selling: "sell",
  // forget
  forget: "forget", forgets: "forget", forgot: "forget", forgotten: "forget", forgetting: "forget",
  // hold
  hold: "hold", holds: "hold", held: "hold", holding: "hold",
  // shine
  shine: "shine", shines: "shine", shone: "shine", shining: "shine",
  // shake
  shake: "shake", shakes: "shake", shook: "shake", shaken: "shake", shaking: "shake",
  // throw
  throw: "throw", throws: "throw", threw: "throw", thrown: "throw", throwing: "throw",
  // fly
  fly: "fly", flies: "fly", flew: "fly", flown: "fly", flying: "fly",
  // sing
  sing: "sing", sings: "sing", sang: "sing", sung: "sing", singing: "sing",
  // drink
  drink: "drink", drinks: "drink", drank: "drink", drunk: "drink", drinking: "drink",
  // swim
  swim: "swim", swims: "swim", swam: "swim", swum: "swim", swimming: "swim",
  // ring
  ring: "ring", rings: "ring", rang: "ring", rung: "ring", ringing: "ring",
  // strike
  strike: "strike", strikes: "strike", struck: "strike", striking: "strike",
  // spring
  spring: "spring", springs: "spring", sprang: "spring", sprung: "spring", springing: "spring",
  // bear
  bear: "bear", bears: "bear", bore: "bear", born: "bear", borne: "bear", bearing: "bear",
  // wake
  wake: "wake", wakes: "wake", woke: "wake", woken: "wake", waking: "wake",
  // weep
  weep: "weep", weeps: "weep", wept: "weep", weeping: "weep",
  // sweep
  sweep: "sweep", sweeps: "sweep", swept: "sweep", sweeping: "sweep",
  // creep
  creep: "creep", creeps: "creep", crept: "creep", creeping: "creep",
  // sleep
  sleep: "sleep", sleeps: "sleep", slept: "sleep", sleeping: "sleep",
  // deal
  deal: "deal", deals: "deal", dealt: "deal", dealing: "deal",
  // dream
  dream: "dream", dreams: "dream", dreamt: "dream", dreaming: "dream",
  // burn
  burn: "burn", burns: "burn", burnt: "burn", burning: "burn",
  // learn
  learn: "learn", learns: "learn", learnt: "learn", learning: "learn",
  // smell
  smell: "smell", smells: "smell", smelt: "smell", smelling: "smell",
  // spell
  spell: "spell", spells: "spell", spelt: "spell", spelling: "spell",
  // spoil
  spoil: "spoil", spoils: "spoil", spoilt: "spoil", spoiling: "spoil",
  // freeze
  freeze: "freeze", freezes: "freeze", froze: "freeze", frozen: "freeze", freezing: "freeze",
  // steal
  steal: "steal", steals: "steal", stole: "steal", stolen: "steal", stealing: "steal",
  // swear
  swear: "swear", swears: "swear", swore: "swear", sworn: "swear", swearing: "swear",
  // tear
  tear: "tear", tears: "tear", tore: "tear", torn: "tear", tearing: "tear",
  // wind
  wind: "wind", winds: "wind", wound: "wind", winding: "wind",
  // bind
  bind: "bind", binds: "bind", bound: "bind", binding: "bind",
  // dig
  dig: "dig", digs: "dig", dug: "dig", digging: "dig",
  // hang
  hang: "hang", hangs: "hang", hung: "hang", hanging: "hang",
  // hit
  hit: "hit", hits: "hit", hitting: "hit",
  // hurt
  hurt: "hurt", hurts: "hurt", hurting: "hurt",
  // shut
  shut: "shut", shuts: "shut", shutting: "shut",
  // cast
  cast: "cast", casts: "cast", casting: "cast",
  // cost
  cost: "cost", costs: "cost", costing: "cost",
  // shed
  shed: "shed", sheds: "shed", shedding: "shed",
  // spread
  spread: "spread", spreads: "spread", spreading: "spread",
  // split
  split: "split", splits: "split", splitting: "split",
  // burst
  burst: "burst", bursts: "burst", bursting: "burst",
  // set
  set: "set", sets: "set", setting: "set",
  // bet
  bet: "bet", bets: "bet", betting: "bet",
  // quit
  quit: "quit", quits: "quit", quitting: "quit",
  // shoot
  shoot: "shoot", shoots: "shoot", shot: "shoot", shooting: "shoot",
  // stick
  stick: "stick", sticks: "stick", stuck: "stick", sticking: "stick",
  // sting
  sting: "sting", stings: "sting", stung: "sting", stinging: "sting",
  // swing
  swing: "swing", swings: "swing", swung: "swing", swinging: "swing",
  // slide
  slide: "slide", slides: "slide", slid: "slide", sliding: "slide",
  // ride
  ride: "ride", rides: "ride", rode: "ride", ridden: "ride", riding: "ride",
  // rid
  rid: "rid", rids: "rid", ridding: "rid",
  // bite
  bite: "bite", bites: "bite", bit: "bite", bitten: "bite", biting: "bite",
  // hide
  hide: "hide", hides: "hide", hid: "hide", hidden: "hide", hiding: "hide",
  // shrink
  shrink: "shrink", shrinks: "shrink", shrank: "shrink", shrunk: "shrink", shrinking: "shrink",
  // sink
  sink: "sink", sinks: "sink", sank: "sink", sunk: "sink", sinking: "sink",
  // stink
  stink: "stink", stinks: "stink", stank: "stink", stunk: "stink", stinking: "stink",
  // dive
  dive: "dive", dives: "dive", dove: "dive", diving: "dive",
  // arise
  arise: "arise", arises: "arise", arose: "arise", arisen: "arise", arising: "arise",
  // awake
  awake: "awake", awakes: "awake", awoke: "awake", awoken: "awake", awaking: "awake",
  // become
  become: "become", becomes: "become", became: "become", becoming: "become",
  // forgive
  forgive: "forgive", forgives: "forgive", forgave: "forgive", forgiven: "forgive", forgiving: "forgive",
  // forbid
  forbid: "forbid", forbids: "forbid", forbade: "forbid", forbidden: "forbid", forbidding: "forbid",
  // overcome
  overcome: "overcome", overcomes: "overcome", overcame: "overcome", overcoming: "overcome",
  // withdraw
  withdraw: "withdraw", withdraws: "withdraw", withdrew: "withdraw", withdrawn: "withdraw", withdrawing: "withdraw",
  // undergo
  undergo: "undergo", undergoes: "undergo", underwent: "undergo", undergone: "undergo", undergoing: "undergo",
  // overthrow
  overthrow: "overthrow", overthrows: "overthrow", overthrew: "overthrow", overthrown: "overthrow", overthrowing: "overthrow",
  // mistake
  mistake: "mistake", mistakes: "mistake", mistook: "mistake", mistaken: "mistake", mistaking: "mistake",
  // shine already above
  // lay (place)
  lay: "lay", lays: "lay", laid: "lay", laying: "lay",
  // pay already above
  // flee
  flee: "flee", flees: "flee", fled: "flee", fleeing: "flee",
  // feed
  feed: "feed", feeds: "feed", fed: "feed", feeding: "feed",
  // bleed
  bleed: "bleed", bleeds: "bleed", bled: "bleed", bleeding: "bleed",
  // breed
  breed: "breed", breeds: "breed", bred: "breed", breeding: "breed",
  // speed
  speed: "speed", speeds: "speed", sped: "speed", speeding: "speed",
  // lend
  lend: "lend", lends: "lend", lent: "lend", lending: "lend",
  // bend
  bend: "bend", bends: "bend", bent: "bend", bending: "bend",
  // spend already above
  // strive
  strive: "strive", strives: "strive", strove: "strive", striven: "strive", striving: "strive",
  // thrive
  thrive: "thrive", thrives: "thrive", throve: "thrive", thriven: "thrive", thriving: "thrive",
  // wet, wed
  wed: "wed", weds: "wed", wedded: "wed", wedding: "wed",
  // shave
  shave: "shave", shaves: "shave", shaved: "shave", shaven: "shave", shaving: "shave",
  // saw (cut with a saw) — same spelling irregular past participle "sawn"
  sawn: "saw",
  // knit
  knit: "knit", knits: "knit", knitting: "knit",
  // light
  light: "light", lights: "light", lit: "light", lighting: "light",

  // Irregular plural nouns
  child: "child", children: "child",
  man: "man", men: "man",
  woman: "woman", women: "woman",
  mouse: "mouse", mice: "mouse",
  foot: "foot", feet: "foot",
  tooth: "tooth", teeth: "tooth",
  goose: "goose", geese: "goose",
  person: "person", people: "person",
  ox: "ox", oxen: "ox",
  louse: "louse", lice: "louse",
  die: "die", dice: "die",
  cactus: "cactus", cacti: "cactus",
  focus: "focus", foci: "focus",
  fungus: "fungus", fungi: "fungus",
  nucleus: "nucleus", nuclei: "nucleus",
  syllabus: "syllabus", syllabi: "syllabus",
  analysis: "analysis", analyses: "analysis",
  diagnosis: "diagnosis", diagnoses: "diagnosis",
  crisis: "crisis", crises: "crisis",
  thesis: "thesis", theses: "thesis",
  phenomenon: "phenomenon", phenomena: "phenomenon",
  criterion: "criterion", criteria: "criterion",
  datum: "datum", data: "datum",
  index: "index", indices: "index",
  matrix: "matrix", matrices: "matrix",
  vertex: "vertex", vertices: "vertex",
  axis: "axis", axes: "axis",
  leaf: "leaf", leaves: "leaf",
  loaf: "loaf", loaves: "loaf",
  knife: "knife", knives: "knife",
  wife: "wife", wives: "wife",
  life: "life", lives: "life",
  wolf: "wolf", wolves: "wolf",
  self: "self", selves: "self",
  shelf: "shelf", shelves: "shelf",
  half: "half", halves: "half",
  calf: "calf", calves: "calf",
  elf: "elf", elves: "elf",
  thief: "thief", thieves: "thief",
  sheep: "sheep",
  deer: "deer",
  fish: "fish",
  species: "species",
  series: "series",

  // Irregular comparative/superlative
  better: "good", best: "good",
  worse: "bad", worst: "bad",
  further: "far", furthest: "far",
  farther: "far", farthest: "far",
  more: "many", most: "many",
  less: "little", least: "little",
  elder: "old", eldest: "old",
  older: "old", oldest: "old",
};

// Sentence-boundary abbreviation guard: tokens ending in "." that must NOT
// be treated as a sentence-final period. Matching is case-sensitive against
// the token as it appears in text (i.e. including the trailing period),
// biased toward what actually shows up in 19th-century public-domain prose
// (Frankenstein, Sherlock Holmes, The Wizard of Oz, The Call of the Wild,
// Wilde's stories).
var abbreviations = [
  "Mr.", "Mrs.", "Ms.", "Dr.", "St.", "Prof.", "Rev.", "Gen.", "Col.",
  "Capt.", "Lt.", "Sr.", "Jr.", "vs.", "etc.", "i.e.", "e.g.",
  "a.m.", "p.m.", "Mt.", "Ft.", "Ave.", "No.", "Co.", "Esq.",
  "Messrs.", "Mme.", "Mlle.", "Hon.", "Maj.", "Sgt.", "Cmdr.", "Adm.",
];

module.exports = {
  irregularLemmas: irregularLemmas,
  abbreviations: abbreviations,
};
