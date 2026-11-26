// Classic roster and editorial draft annotations. See ROSTER_META for scope.
export const ROSTER_META = {
  "targetMap": "v7.07b1",
  "coverage": "112 classic DotA heroes from a 6.83d artwork archive. Exact v7.07b1 roster availability is not verified.",
  "source": "https://dotaone.com/heroes.html",
  "roles": "Suggested positions: 1 carry, 2 mid, 3 offlane, 4 support, 5 hard support. Editorial role suggestions, not map-verified balance data.",
  "tags": "Curated qualitative ability and draft tags; not matchup odds or win predictions.",
  "attackTypes": "Base attack form. Transforming heroes may change attack type in-game."
};

export const HERO_ROSTER = [
  {
    "id": "abaddon",
    "name": "Abaddon",
    "alias": "Lord of Avernus",
    "attackType": "melee",
    "roles": [
      3,
      5
    ],
    "tags": [
      "save",
      "sustain",
      "frontline"
    ],
    "icon": "assets/hero-abaddon.png"
  },
  {
    "id": "alchemist",
    "name": "Alchemist",
    "alias": "Razzil Darkbrew",
    "attackType": "melee",
    "roles": [
      1,
      2
    ],
    "tags": [
      "scaling",
      "farm-heavy",
      "physical-damage",
      "frontline"
    ],
    "icon": "assets/hero-alchemist.png"
  },
  {
    "id": "ancient-apparition",
    "name": "Ancient Apparition",
    "alias": "Kaldr",
    "attackType": "ranged",
    "roles": [
      4,
      5
    ],
    "tags": [
      "magic-damage"
    ],
    "icon": "assets/hero-ancient-apparition.png"
  },
  {
    "id": "anti-mage",
    "name": "Anti-Mage",
    "alias": "Magina",
    "attackType": "melee",
    "roles": [
      1
    ],
    "tags": [
      "physical-damage",
      "scaling",
      "farm-heavy"
    ],
    "icon": "assets/hero-anti-mage.png"
  },
  {
    "id": "arc-warden",
    "name": "Arc Warden",
    "alias": "Zet",
    "attackType": "ranged",
    "roles": [
      1,
      2
    ],
    "tags": [
      "physical-damage",
      "tower-damage",
      "scaling",
      "farm-heavy"
    ],
    "icon": "assets/hero-arc-warden.png"
  },
  {
    "id": "axe",
    "name": "Axe",
    "alias": "Mogul Khan",
    "attackType": "melee",
    "roles": [
      3
    ],
    "tags": [
      "reliable-disable",
      "initiation",
      "frontline",
      "illusion-clear"
    ],
    "icon": "assets/hero-axe.png"
  },
  {
    "id": "bane",
    "name": "Bane",
    "alias": "Atropos",
    "attackType": "ranged",
    "roles": [
      4,
      5
    ],
    "tags": [
      "reliable-disable",
      "save"
    ],
    "icon": "assets/hero-bane.png"
  },
  {
    "id": "batrider",
    "name": "Batrider",
    "alias": "Jinzakk",
    "attackType": "ranged",
    "roles": [
      2,
      3
    ],
    "tags": [
      "reliable-disable",
      "initiation",
      "wave-clear"
    ],
    "icon": "assets/hero-batrider.png"
  },
  {
    "id": "beastmaster",
    "name": "Beastmaster",
    "alias": "Rexxar",
    "attackType": "melee",
    "roles": [
      3
    ],
    "tags": [
      "reliable-disable",
      "initiation",
      "tower-damage"
    ],
    "icon": "assets/hero-beastmaster.png"
  },
  {
    "id": "bloodseeker",
    "name": "Bloodseeker",
    "alias": "Strygwyr",
    "attackType": "melee",
    "roles": [
      1,
      2
    ],
    "tags": [
      "sustain",
      "physical-damage",
      "scaling"
    ],
    "icon": "assets/hero-bloodseeker.png"
  },
  {
    "id": "bounty-hunter",
    "name": "Bounty Hunter",
    "alias": "Gondar",
    "attackType": "melee",
    "roles": [
      4
    ],
    "tags": [
      "physical-damage"
    ],
    "icon": "assets/hero-bounty-hunter.png"
  },
  {
    "id": "brewmaster",
    "name": "Brewmaster",
    "alias": "Mangix",
    "attackType": "melee",
    "roles": [
      3
    ],
    "tags": [
      "initiation",
      "frontline",
      "magic-damage"
    ],
    "icon": "assets/hero-brewmaster.png"
  },
  {
    "id": "bristleback",
    "name": "Bristleback",
    "alias": "Rigwarl",
    "attackType": "melee",
    "roles": [
      1,
      3
    ],
    "tags": [
      "frontline",
      "sustain",
      "physical-damage"
    ],
    "icon": "assets/hero-bristleback.png"
  },
  {
    "id": "broodmother",
    "name": "Broodmother",
    "alias": "Black Arachnia",
    "attackType": "melee",
    "roles": [
      2,
      3
    ],
    "tags": [
      "tower-damage",
      "physical-damage",
      "sustain"
    ],
    "icon": "assets/hero-broodmother.png"
  },
  {
    "id": "centaur",
    "name": "Centaur Warrunner",
    "alias": "Bradwarden",
    "attackType": "melee",
    "roles": [
      3
    ],
    "tags": [
      "initiation",
      "frontline",
      "magic-damage"
    ],
    "icon": "assets/hero-centaur.png"
  },
  {
    "id": "chaos-knight",
    "name": "Chaos Knight",
    "alias": "Nessaj",
    "attackType": "melee",
    "roles": [
      1,
      3
    ],
    "tags": [
      "reliable-disable",
      "physical-damage",
      "illusions",
      "scaling"
    ],
    "icon": "assets/hero-chaos-knight.png"
  },
  {
    "id": "chen",
    "name": "Chen",
    "alias": "Holy Knight",
    "attackType": "ranged",
    "roles": [
      4,
      5
    ],
    "tags": [
      "sustain",
      "tower-damage"
    ],
    "icon": "assets/hero-chen.png"
  },
  {
    "id": "clinkz",
    "name": "Clinkz",
    "alias": "Bone Fletcher",
    "attackType": "ranged",
    "roles": [
      1,
      2
    ],
    "tags": [
      "physical-damage",
      "tower-damage",
      "scaling"
    ],
    "icon": "assets/hero-clinkz.png"
  },
  {
    "id": "clockwerk",
    "name": "Clockwerk",
    "alias": "Rattletrap",
    "attackType": "melee",
    "roles": [
      3,
      4
    ],
    "tags": [
      "initiation",
      "frontline",
      "magic-damage"
    ],
    "icon": "assets/hero-clockwerk.png"
  },
  {
    "id": "crystal-maiden",
    "name": "Crystal Maiden",
    "alias": "Rylai Crestfall",
    "attackType": "ranged",
    "roles": [
      5
    ],
    "tags": [
      "reliable-disable",
      "sustain",
      "magic-damage"
    ],
    "icon": "assets/hero-crystal-maiden.png"
  },
  {
    "id": "dark-seer",
    "name": "Dark Seer",
    "alias": "Ish'kafel",
    "attackType": "melee",
    "roles": [
      3
    ],
    "tags": [
      "initiation",
      "wave-clear",
      "illusion-clear",
      "illusions"
    ],
    "icon": "assets/hero-dark-seer.png"
  },
  {
    "id": "dazzle",
    "name": "Dazzle",
    "alias": "Shadow Priest",
    "attackType": "ranged",
    "roles": [
      5
    ],
    "tags": [
      "save",
      "sustain"
    ],
    "icon": "assets/hero-dazzle.png"
  },
  {
    "id": "death-prophet",
    "name": "Death Prophet",
    "alias": "Krobelus",
    "attackType": "ranged",
    "roles": [
      2
    ],
    "tags": [
      "tower-damage",
      "magic-damage",
      "wave-clear"
    ],
    "icon": "assets/hero-death-prophet.png"
  },
  {
    "id": "disruptor",
    "name": "Disruptor",
    "alias": "Thrall",
    "attackType": "ranged",
    "roles": [
      4,
      5
    ],
    "tags": [
      "reliable-disable",
      "initiation",
      "magic-damage"
    ],
    "icon": "assets/hero-disruptor.png"
  },
  {
    "id": "doom",
    "name": "Doom",
    "alias": "Lucifer",
    "attackType": "melee",
    "roles": [
      3
    ],
    "tags": [
      "initiation",
      "frontline",
      "farm-heavy"
    ],
    "icon": "assets/hero-doom.png"
  },
  {
    "id": "dragon-knight",
    "name": "Dragon Knight",
    "alias": "Knight Davion",
    "attackType": "melee",
    "roles": [
      2,
      3
    ],
    "tags": [
      "reliable-disable",
      "frontline",
      "tower-damage"
    ],
    "icon": "assets/hero-dragon-knight.png"
  },
  {
    "id": "drow",
    "name": "Drow Ranger",
    "alias": "Traxex",
    "attackType": "ranged",
    "roles": [
      1
    ],
    "tags": [
      "physical-damage",
      "tower-damage",
      "scaling",
      "farm-heavy"
    ],
    "icon": "assets/hero-drow.png"
  },
  {
    "id": "earth-spirit",
    "name": "Earth Spirit",
    "alias": "Kaolin",
    "attackType": "melee",
    "roles": [
      4
    ],
    "tags": [
      "initiation",
      "magic-damage",
      "wave-clear"
    ],
    "icon": "assets/hero-earth-spirit.png"
  },
  {
    "id": "earthshaker",
    "name": "Earthshaker",
    "alias": "Raigor Stonehoof",
    "attackType": "melee",
    "roles": [
      3,
      4
    ],
    "tags": [
      "initiation",
      "wave-clear",
      "illusion-clear"
    ],
    "icon": "assets/hero-earthshaker.png"
  },
  {
    "id": "elder-titan",
    "name": "Elder Titan",
    "alias": "Cairne Bloodhoof",
    "attackType": "melee",
    "roles": [
      3,
      4,
      5
    ],
    "tags": [
      "initiation",
      "illusion-clear",
      "physical-damage"
    ],
    "icon": "assets/hero-elder-titan.png"
  },
  {
    "id": "ember-spirit",
    "name": "Ember Spirit",
    "alias": "Xin",
    "attackType": "melee",
    "roles": [
      2
    ],
    "tags": [
      "wave-clear",
      "magic-damage",
      "illusion-clear",
      "scaling"
    ],
    "icon": "assets/hero-ember-spirit.png"
  },
  {
    "id": "enchantress",
    "name": "Enchantress",
    "alias": "Aiushtha",
    "attackType": "ranged",
    "roles": [
      3,
      4,
      5
    ],
    "tags": [
      "sustain",
      "physical-damage"
    ],
    "icon": "assets/hero-enchantress.png"
  },
  {
    "id": "enigma",
    "name": "Enigma",
    "alias": "Darchrow",
    "attackType": "ranged",
    "roles": [
      3,
      4
    ],
    "tags": [
      "initiation",
      "tower-damage",
      "wave-clear"
    ],
    "icon": "assets/hero-enigma.png"
  },
  {
    "id": "faceless-void",
    "name": "Faceless Void",
    "alias": "Darkterror",
    "attackType": "melee",
    "roles": [
      1
    ],
    "tags": [
      "initiation",
      "physical-damage",
      "scaling",
      "farm-heavy"
    ],
    "icon": "assets/hero-faceless-void.png"
  },
  {
    "id": "gyrocopter",
    "name": "Gyrocopter",
    "alias": "Aurel Vlaicu",
    "attackType": "ranged",
    "roles": [
      1
    ],
    "tags": [
      "physical-damage",
      "magic-damage",
      "illusion-clear",
      "scaling",
      "farm-heavy"
    ],
    "icon": "assets/hero-gyrocopter.png"
  },
  {
    "id": "huskar",
    "name": "Huskar",
    "alias": "Sacred Warrior",
    "attackType": "ranged",
    "roles": [
      2
    ],
    "tags": [
      "frontline",
      "sustain",
      "physical-damage"
    ],
    "icon": "assets/hero-huskar.png"
  },
  {
    "id": "invoker",
    "name": "Invoker",
    "alias": "Kael",
    "attackType": "ranged",
    "roles": [
      2
    ],
    "tags": [
      "magic-damage",
      "wave-clear",
      "scaling",
      "farm-heavy"
    ],
    "icon": "assets/hero-invoker.png"
  },
  {
    "id": "io",
    "name": "Io",
    "alias": "Guardian Wisp",
    "attackType": "ranged",
    "roles": [
      4,
      5
    ],
    "tags": [
      "save",
      "sustain"
    ],
    "icon": "assets/hero-io.png"
  },
  {
    "id": "jakiro",
    "name": "Jakiro",
    "alias": "Twin Head Dragon",
    "attackType": "ranged",
    "roles": [
      4,
      5
    ],
    "tags": [
      "wave-clear",
      "tower-damage",
      "magic-damage"
    ],
    "icon": "assets/hero-jakiro.png"
  },
  {
    "id": "juggernaut",
    "name": "Juggernaut",
    "alias": "Yurnero",
    "attackType": "melee",
    "roles": [
      1
    ],
    "tags": [
      "sustain",
      "physical-damage",
      "scaling"
    ],
    "icon": "assets/hero-juggernaut.png"
  },
  {
    "id": "keeper-of-the-light",
    "name": "Keeper of the Light",
    "alias": "Ezalor",
    "attackType": "ranged",
    "roles": [
      4,
      5
    ],
    "tags": [
      "wave-clear",
      "sustain",
      "magic-damage"
    ],
    "icon": "assets/hero-keeper-of-the-light.png"
  },
  {
    "id": "kunkka",
    "name": "Kunkka",
    "alias": "Admiral Proudmoore",
    "attackType": "melee",
    "roles": [
      2,
      3
    ],
    "tags": [
      "initiation",
      "wave-clear",
      "physical-damage"
    ],
    "icon": "assets/hero-kunkka.png"
  },
  {
    "id": "legion-commander",
    "name": "Legion Commander",
    "alias": "Tresdin",
    "attackType": "melee",
    "roles": [
      3
    ],
    "tags": [
      "reliable-disable",
      "initiation",
      "physical-damage",
      "scaling"
    ],
    "icon": "assets/hero-legion-commander.png"
  },
  {
    "id": "leshrac",
    "name": "Leshrac",
    "alias": "Tormented Soul",
    "attackType": "ranged",
    "roles": [
      2,
      3
    ],
    "tags": [
      "wave-clear",
      "tower-damage",
      "magic-damage",
      "illusion-clear"
    ],
    "icon": "assets/hero-leshrac.png"
  },
  {
    "id": "lich",
    "name": "Lich",
    "alias": "Kel'Thuzad",
    "attackType": "ranged",
    "roles": [
      5
    ],
    "tags": [
      "magic-damage",
      "wave-clear"
    ],
    "icon": "assets/hero-lich.png"
  },
  {
    "id": "lifestealer",
    "name": "Lifestealer",
    "alias": "N'aix",
    "attackType": "melee",
    "roles": [
      1
    ],
    "tags": [
      "frontline",
      "sustain",
      "physical-damage",
      "scaling"
    ],
    "icon": "assets/hero-lifestealer.png"
  },
  {
    "id": "lina",
    "name": "Lina",
    "alias": "Lina Inverse",
    "attackType": "ranged",
    "roles": [
      2,
      4
    ],
    "tags": [
      "magic-damage",
      "wave-clear",
      "physical-damage"
    ],
    "icon": "assets/hero-lina.png"
  },
  {
    "id": "lion",
    "name": "Lion",
    "alias": "Demon Witch",
    "attackType": "ranged",
    "roles": [
      4,
      5
    ],
    "tags": [
      "reliable-disable",
      "magic-damage"
    ],
    "icon": "assets/hero-lion.png"
  },
  {
    "id": "lone-druid",
    "name": "Lone Druid",
    "alias": "Syllabear",
    "attackType": "ranged",
    "roles": [
      1,
      2
    ],
    "tags": [
      "tower-damage",
      "physical-damage",
      "scaling"
    ],
    "icon": "assets/hero-lone-druid.png"
  },
  {
    "id": "luna",
    "name": "Luna",
    "alias": "Moon Rider",
    "attackType": "ranged",
    "roles": [
      1
    ],
    "tags": [
      "physical-damage",
      "tower-damage",
      "wave-clear",
      "scaling",
      "farm-heavy"
    ],
    "icon": "assets/hero-luna.png"
  },
  {
    "id": "lycan",
    "name": "Lycan",
    "alias": "Banehallow",
    "attackType": "melee",
    "roles": [
      1,
      3
    ],
    "tags": [
      "tower-damage",
      "physical-damage",
      "scaling"
    ],
    "icon": "assets/hero-lycan.png"
  },
  {
    "id": "magnus",
    "name": "Magnus",
    "alias": "Magnataur",
    "attackType": "melee",
    "roles": [
      2,
      3,
      4
    ],
    "tags": [
      "initiation",
      "wave-clear",
      "illusion-clear"
    ],
    "icon": "assets/hero-magnus.png"
  },
  {
    "id": "medusa",
    "name": "Medusa",
    "alias": "Gorgon",
    "attackType": "ranged",
    "roles": [
      1
    ],
    "tags": [
      "physical-damage",
      "illusion-clear",
      "frontline",
      "scaling",
      "farm-heavy"
    ],
    "icon": "assets/hero-medusa.png"
  },
  {
    "id": "meepo",
    "name": "Meepo",
    "alias": "Geomancer",
    "attackType": "melee",
    "roles": [
      1,
      2
    ],
    "tags": [
      "physical-damage",
      "wave-clear",
      "scaling",
      "farm-heavy"
    ],
    "icon": "assets/hero-meepo.png"
  },
  {
    "id": "mirana",
    "name": "Mirana",
    "alias": "Priestess of the Moon",
    "attackType": "ranged",
    "roles": [
      2,
      4
    ],
    "tags": [
      "magic-damage",
      "wave-clear",
      "save"
    ],
    "icon": "assets/hero-mirana.png"
  },
  {
    "id": "morphling",
    "name": "Morphling",
    "alias": "Morphling",
    "attackType": "ranged",
    "roles": [
      1,
      2
    ],
    "tags": [
      "physical-damage",
      "scaling",
      "farm-heavy"
    ],
    "icon": "assets/hero-morphling.png"
  },
  {
    "id": "naga-siren",
    "name": "Naga Siren",
    "alias": "Slithice",
    "attackType": "melee",
    "roles": [
      1
    ],
    "tags": [
      "illusions",
      "wave-clear",
      "tower-damage",
      "scaling",
      "farm-heavy"
    ],
    "icon": "assets/hero-naga-siren.png"
  },
  {
    "id": "natures-prophet",
    "name": "Nature's Prophet",
    "alias": "Furion",
    "attackType": "ranged",
    "roles": [
      1,
      2,
      3
    ],
    "tags": [
      "tower-damage",
      "physical-damage",
      "scaling"
    ],
    "icon": "assets/hero-natures-prophet.png"
  },
  {
    "id": "necrophos",
    "name": "Necrophos",
    "alias": "Rotund'jere / Necrolyte",
    "attackType": "ranged",
    "roles": [
      2,
      3
    ],
    "tags": [
      "reliable-disable",
      "sustain",
      "magic-damage",
      "frontline"
    ],
    "icon": "assets/hero-necrophos.png"
  },
  {
    "id": "night-stalker",
    "name": "Night Stalker",
    "alias": "Balanar",
    "attackType": "melee",
    "roles": [
      3
    ],
    "tags": [
      "initiation",
      "frontline",
      "physical-damage"
    ],
    "icon": "assets/hero-night-stalker.png"
  },
  {
    "id": "nyx",
    "name": "Nyx Assassin",
    "alias": "Anub'arak",
    "attackType": "melee",
    "roles": [
      4
    ],
    "tags": [
      "initiation",
      "magic-damage"
    ],
    "icon": "assets/hero-nyx.png"
  },
  {
    "id": "ogre-magi",
    "name": "Ogre Magi",
    "alias": "Aggron Stonebreak",
    "attackType": "melee",
    "roles": [
      4,
      5
    ],
    "tags": [
      "reliable-disable",
      "frontline",
      "sustain"
    ],
    "icon": "assets/hero-ogre-magi.png"
  },
  {
    "id": "omniknight",
    "name": "Omniknight",
    "alias": "Purist Thunderwrath",
    "attackType": "melee",
    "roles": [
      3,
      5
    ],
    "tags": [
      "save",
      "sustain",
      "frontline"
    ],
    "icon": "assets/hero-omniknight.png"
  },
  {
    "id": "oracle",
    "name": "Oracle",
    "alias": "Nerif",
    "attackType": "ranged",
    "roles": [
      5
    ],
    "tags": [
      "save",
      "sustain",
      "magic-damage"
    ],
    "icon": "assets/hero-oracle.png"
  },
  {
    "id": "outworld-destroyer",
    "name": "Outworld Destroyer",
    "alias": "Harbinger",
    "attackType": "ranged",
    "roles": [
      2
    ],
    "tags": [
      "save",
      "magic-damage",
      "scaling"
    ],
    "icon": "assets/hero-outworld-destroyer.png"
  },
  {
    "id": "phantom-assassin",
    "name": "Phantom Assassin",
    "alias": "Mortred",
    "attackType": "melee",
    "roles": [
      1
    ],
    "tags": [
      "physical-damage",
      "scaling",
      "farm-heavy"
    ],
    "icon": "assets/hero-phantom-assassin.png"
  },
  {
    "id": "phantom-lancer",
    "name": "Phantom Lancer",
    "alias": "Azwraith",
    "attackType": "melee",
    "roles": [
      1
    ],
    "tags": [
      "illusions",
      "physical-damage",
      "scaling",
      "farm-heavy"
    ],
    "icon": "assets/hero-phantom-lancer.png"
  },
  {
    "id": "phoenix",
    "name": "Phoenix",
    "alias": "Icarus",
    "attackType": "ranged",
    "roles": [
      3,
      4,
      5
    ],
    "tags": [
      "sustain",
      "magic-damage",
      "wave-clear"
    ],
    "icon": "assets/hero-phoenix.png"
  },
  {
    "id": "puck",
    "name": "Puck",
    "alias": "Faerie Dragon",
    "attackType": "ranged",
    "roles": [
      2
    ],
    "tags": [
      "initiation",
      "magic-damage",
      "wave-clear"
    ],
    "icon": "assets/hero-puck.png"
  },
  {
    "id": "pudge",
    "name": "Pudge",
    "alias": "Butcher",
    "attackType": "melee",
    "roles": [
      3,
      4
    ],
    "tags": [
      "reliable-disable",
      "initiation",
      "frontline"
    ],
    "icon": "assets/hero-pudge.png"
  },
  {
    "id": "pugna",
    "name": "Pugna",
    "alias": "Oblivion",
    "attackType": "ranged",
    "roles": [
      2,
      4
    ],
    "tags": [
      "tower-damage",
      "save",
      "sustain",
      "magic-damage"
    ],
    "icon": "assets/hero-pugna.png"
  },
  {
    "id": "queen-of-pain",
    "name": "Queen of Pain",
    "alias": "Akasha",
    "attackType": "ranged",
    "roles": [
      2
    ],
    "tags": [
      "magic-damage",
      "wave-clear"
    ],
    "icon": "assets/hero-queen-of-pain.png"
  },
  {
    "id": "razor",
    "name": "Razor",
    "alias": "Lightning Revenant",
    "attackType": "ranged",
    "roles": [
      1,
      2,
      3
    ],
    "tags": [
      "frontline",
      "physical-damage",
      "wave-clear"
    ],
    "icon": "assets/hero-razor.png"
  },
  {
    "id": "riki",
    "name": "Riki",
    "alias": "Rikimaru",
    "attackType": "melee",
    "roles": [
      1,
      4
    ],
    "tags": [
      "physical-damage",
      "scaling"
    ],
    "icon": "assets/hero-riki.png"
  },
  {
    "id": "rubick",
    "name": "Rubick",
    "alias": "Grand Magus",
    "attackType": "ranged",
    "roles": [
      4
    ],
    "tags": [
      "reliable-disable",
      "magic-damage",
      "wave-clear"
    ],
    "icon": "assets/hero-rubick.png"
  },
  {
    "id": "sand-king",
    "name": "Sand King",
    "alias": "Crixalis",
    "attackType": "melee",
    "roles": [
      3,
      4
    ],
    "tags": [
      "initiation",
      "wave-clear",
      "magic-damage"
    ],
    "icon": "assets/hero-sand-king.png"
  },
  {
    "id": "shadow-demon",
    "name": "Shadow Demon",
    "alias": "Eredar",
    "attackType": "ranged",
    "roles": [
      4,
      5
    ],
    "tags": [
      "save",
      "reliable-disable",
      "magic-damage"
    ],
    "icon": "assets/hero-shadow-demon.png"
  },
  {
    "id": "shadow-fiend",
    "name": "Shadow Fiend",
    "alias": "Nevermore",
    "attackType": "ranged",
    "roles": [
      1,
      2
    ],
    "tags": [
      "magic-damage",
      "physical-damage",
      "wave-clear",
      "scaling"
    ],
    "icon": "assets/hero-shadow-fiend.png"
  },
  {
    "id": "shadow-shaman",
    "name": "Shadow Shaman",
    "alias": "Rhasta",
    "attackType": "ranged",
    "roles": [
      4,
      5
    ],
    "tags": [
      "reliable-disable",
      "tower-damage",
      "magic-damage"
    ],
    "icon": "assets/hero-shadow-shaman.png"
  },
  {
    "id": "silencer",
    "name": "Silencer",
    "alias": "Nortrom",
    "attackType": "ranged",
    "roles": [
      2,
      4,
      5
    ],
    "tags": [
      "physical-damage",
      "scaling"
    ],
    "icon": "assets/hero-silencer.png"
  },
  {
    "id": "skywrath-mage",
    "name": "Skywrath Mage",
    "alias": "Dragonus",
    "attackType": "ranged",
    "roles": [
      4
    ],
    "tags": [
      "magic-damage"
    ],
    "icon": "assets/hero-skywrath-mage.png"
  },
  {
    "id": "slardar",
    "name": "Slardar",
    "alias": "Slithereen Guard",
    "attackType": "melee",
    "roles": [
      3
    ],
    "tags": [
      "initiation",
      "physical-damage",
      "frontline"
    ],
    "icon": "assets/hero-slardar.png"
  },
  {
    "id": "slark",
    "name": "Slark",
    "alias": "Murloc Nightcrawler",
    "attackType": "melee",
    "roles": [
      1
    ],
    "tags": [
      "physical-damage",
      "sustain",
      "scaling"
    ],
    "icon": "assets/hero-slark.png"
  },
  {
    "id": "sniper",
    "name": "Sniper",
    "alias": "Kardel Sharpeye",
    "attackType": "ranged",
    "roles": [
      1,
      2
    ],
    "tags": [
      "physical-damage",
      "tower-damage",
      "scaling",
      "farm-heavy"
    ],
    "icon": "assets/hero-sniper.png"
  },
  {
    "id": "spectre",
    "name": "Spectre",
    "alias": "Mercurial",
    "attackType": "melee",
    "roles": [
      1
    ],
    "tags": [
      "frontline",
      "physical-damage",
      "scaling",
      "farm-heavy"
    ],
    "icon": "assets/hero-spectre.png"
  },
  {
    "id": "spirit-breaker",
    "name": "Spirit Breaker",
    "alias": "Barathrum",
    "attackType": "melee",
    "roles": [
      3,
      4
    ],
    "tags": [
      "reliable-disable",
      "initiation",
      "frontline"
    ],
    "icon": "assets/hero-spirit-breaker.png"
  },
  {
    "id": "storm-spirit",
    "name": "Storm Spirit",
    "alias": "Raijin Thunderkeg",
    "attackType": "ranged",
    "roles": [
      2
    ],
    "tags": [
      "reliable-disable",
      "initiation",
      "magic-damage",
      "scaling",
      "farm-heavy"
    ],
    "icon": "assets/hero-storm-spirit.png"
  },
  {
    "id": "sven",
    "name": "Sven",
    "alias": "Rogue Knight",
    "attackType": "melee",
    "roles": [
      1
    ],
    "tags": [
      "reliable-disable",
      "physical-damage",
      "illusion-clear",
      "scaling",
      "farm-heavy"
    ],
    "icon": "assets/hero-sven.png"
  },
  {
    "id": "techies",
    "name": "Techies",
    "alias": "Squee, Spleen and Spoon",
    "attackType": "ranged",
    "roles": [
      4
    ],
    "tags": [
      "magic-damage",
      "wave-clear"
    ],
    "icon": "assets/hero-techies.png"
  },
  {
    "id": "templar-assassin",
    "name": "Templar Assassin",
    "alias": "Lanaya",
    "attackType": "ranged",
    "roles": [
      2
    ],
    "tags": [
      "physical-damage",
      "tower-damage",
      "scaling",
      "farm-heavy"
    ],
    "icon": "assets/hero-templar-assassin.png"
  },
  {
    "id": "terrorblade",
    "name": "Terrorblade",
    "alias": "Soul Keeper",
    "attackType": "melee",
    "roles": [
      1
    ],
    "tags": [
      "illusions",
      "tower-damage",
      "physical-damage",
      "scaling",
      "farm-heavy"
    ],
    "icon": "assets/hero-terrorblade.png"
  },
  {
    "id": "tidehunter",
    "name": "Tidehunter",
    "alias": "Leviathan",
    "attackType": "melee",
    "roles": [
      3
    ],
    "tags": [
      "initiation",
      "frontline",
      "wave-clear"
    ],
    "icon": "assets/hero-tidehunter.png"
  },
  {
    "id": "timbersaw",
    "name": "Timbersaw",
    "alias": "Rizzrak",
    "attackType": "melee",
    "roles": [
      2,
      3
    ],
    "tags": [
      "frontline",
      "wave-clear",
      "illusion-clear"
    ],
    "icon": "assets/hero-timbersaw.png"
  },
  {
    "id": "tinker",
    "name": "Tinker",
    "alias": "Boush",
    "attackType": "ranged",
    "roles": [
      2
    ],
    "tags": [
      "magic-damage",
      "wave-clear",
      "farm-heavy"
    ],
    "icon": "assets/hero-tinker.png"
  },
  {
    "id": "tiny",
    "name": "Tiny",
    "alias": "Stone Giant",
    "attackType": "melee",
    "roles": [
      2,
      3,
      4
    ],
    "tags": [
      "initiation",
      "wave-clear",
      "physical-damage"
    ],
    "icon": "assets/hero-tiny.png"
  },
  {
    "id": "treant",
    "name": "Treant Protector",
    "alias": "Rooftrellen",
    "attackType": "melee",
    "roles": [
      4,
      5
    ],
    "tags": [
      "initiation",
      "save",
      "sustain"
    ],
    "icon": "assets/hero-treant.png"
  },
  {
    "id": "troll",
    "name": "Troll Warlord",
    "alias": "Jah'rakal",
    "attackType": "ranged",
    "roles": [
      1
    ],
    "tags": [
      "physical-damage",
      "tower-damage",
      "scaling",
      "farm-heavy"
    ],
    "icon": "assets/hero-troll.png"
  },
  {
    "id": "tusk",
    "name": "Tusk",
    "alias": "Ymir",
    "attackType": "melee",
    "roles": [
      3,
      4
    ],
    "tags": [
      "save",
      "initiation",
      "physical-damage"
    ],
    "icon": "assets/hero-tusk.png"
  },
  {
    "id": "underlord",
    "name": "Underlord",
    "alias": "Azgalor / Pit Lord",
    "attackType": "melee",
    "roles": [
      3
    ],
    "tags": [
      "frontline",
      "wave-clear",
      "magic-damage"
    ],
    "icon": "assets/hero-underlord.png"
  },
  {
    "id": "undying",
    "name": "Undying",
    "alias": "Dirge",
    "attackType": "melee",
    "roles": [
      3,
      4,
      5
    ],
    "tags": [
      "frontline",
      "sustain",
      "magic-damage"
    ],
    "icon": "assets/hero-undying.png"
  },
  {
    "id": "ursa",
    "name": "Ursa",
    "alias": "Ulfsaar",
    "attackType": "melee",
    "roles": [
      1
    ],
    "tags": [
      "physical-damage",
      "frontline",
      "scaling"
    ],
    "icon": "assets/hero-ursa.png"
  },
  {
    "id": "vengeful-spirit",
    "name": "Vengeful Spirit",
    "alias": "Shendelzare Silkwood",
    "attackType": "ranged",
    "roles": [
      4,
      5
    ],
    "tags": [
      "reliable-disable",
      "save",
      "initiation"
    ],
    "icon": "assets/hero-vengeful-spirit.png"
  },
  {
    "id": "venomancer",
    "name": "Venomancer",
    "alias": "Lesale Deathbringer",
    "attackType": "ranged",
    "roles": [
      3,
      4,
      5
    ],
    "tags": [
      "magic-damage",
      "wave-clear"
    ],
    "icon": "assets/hero-venomancer.png"
  },
  {
    "id": "viper",
    "name": "Viper",
    "alias": "Netherdrake",
    "attackType": "ranged",
    "roles": [
      2,
      3
    ],
    "tags": [
      "magic-damage",
      "frontline"
    ],
    "icon": "assets/hero-viper.png"
  },
  {
    "id": "visage",
    "name": "Visage",
    "alias": "Necro'lic",
    "attackType": "ranged",
    "roles": [
      2,
      3
    ],
    "tags": [
      "tower-damage",
      "physical-damage",
      "magic-damage"
    ],
    "icon": "assets/hero-visage.png"
  },
  {
    "id": "warlock",
    "name": "Warlock",
    "alias": "Demnok Lannik",
    "attackType": "ranged",
    "roles": [
      5
    ],
    "tags": [
      "initiation",
      "sustain",
      "tower-damage"
    ],
    "icon": "assets/hero-warlock.png"
  },
  {
    "id": "weaver",
    "name": "Weaver",
    "alias": "Anub'seran",
    "attackType": "ranged",
    "roles": [
      1,
      3
    ],
    "tags": [
      "physical-damage",
      "scaling"
    ],
    "icon": "assets/hero-weaver.png"
  },
  {
    "id": "windrunner",
    "name": "Windrunner",
    "alias": "Alleria",
    "attackType": "ranged",
    "roles": [
      2,
      3,
      4
    ],
    "tags": [
      "physical-damage",
      "magic-damage",
      "wave-clear"
    ],
    "icon": "assets/hero-windrunner.png"
  },
  {
    "id": "winter-wyvern",
    "name": "Winter Wyvern",
    "alias": "Auroth",
    "attackType": "ranged",
    "roles": [
      4,
      5
    ],
    "tags": [
      "reliable-disable",
      "save",
      "sustain",
      "wave-clear"
    ],
    "icon": "assets/hero-winter-wyvern.png"
  },
  {
    "id": "witch-doctor",
    "name": "Witch Doctor",
    "alias": "Vol'jin",
    "attackType": "ranged",
    "roles": [
      4,
      5
    ],
    "tags": [
      "reliable-disable",
      "sustain",
      "magic-damage"
    ],
    "icon": "assets/hero-witch-doctor.png"
  },
  {
    "id": "wraith-king",
    "name": "Wraith King",
    "alias": "Leoric / Skeleton King",
    "attackType": "melee",
    "roles": [
      1,
      3
    ],
    "tags": [
      "reliable-disable",
      "frontline",
      "physical-damage",
      "scaling"
    ],
    "icon": "assets/hero-wraith-king.png"
  },
  {
    "id": "zeus",
    "name": "Zeus",
    "alias": "Lord of Olympia",
    "attackType": "ranged",
    "roles": [
      2
    ],
    "tags": [
      "magic-damage",
      "wave-clear"
    ],
    "icon": "assets/hero-zeus.png"
  }
];
