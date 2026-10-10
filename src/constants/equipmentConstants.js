export const CLASS_STARTING_GOLD = {
  barbarian: 50,
  bard: 125,
  cleric: 125,
  druid: 50,
  fighter: 125,
  monk: 12,
  paladin: 125,
  ranger: 125,
  rogue: 100,
  sorcerer: 75,
  warlock: 100,
  wizard: 100,
  artificer: 125
}

export const CLASS_DEFAULT_EQUIPMENT = {
  barbarian: [
    { name: 'Greataxe', weight: '7', amount: 1, status: 'equipped', is_armor: false },
    { name: 'Handaxe', weight: '2', amount: 2, status: 'equipped', is_armor: false },
    { name: "Explorer's Pack", weight: '59', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Javelin', weight: '2', amount: 4, status: 'inventory', is_armor: false }
  ],
  bard: [
    { name: 'Rapier', weight: '2', amount: 1, status: 'equipped', is_armor: false },
    { name: "Diplomat's Pack", weight: '36', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Leather Armor', weight: '10', amount: 1, status: 'equipped', is_armor: true },
    { name: 'Dagger', weight: '1', amount: 1, status: 'equipped', is_armor: false }
  ],
  cleric: [
    { name: 'Mace', weight: '4', amount: 1, status: 'equipped', is_armor: false },
    { name: 'Scale Mail', weight: '45', amount: 1, status: 'equipped', is_armor: true },
    { name: 'Light Crossbow', weight: '5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Crossbow Bolts (20)', weight: '1.5', amount: 1, status: 'inventory', is_armor: false },
    { name: "Priest's Pack", weight: '25', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Shield', weight: '6', amount: 1, status: 'equipped', is_armor: true },
    { name: 'Holy Symbol', weight: '1', amount: 1, status: 'inventory', is_armor: false }
  ],
  druid: [
    { name: 'Wooden Shield', weight: '6', amount: 1, status: 'equipped', is_armor: true },
    { name: 'Scimitar', weight: '3', amount: 1, status: 'equipped', is_armor: false },
    { name: 'Leather Armor', weight: '10', amount: 1, status: 'equipped', is_armor: true },
    { name: "Explorer's Pack", weight: '59', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Druidic Focus', weight: '1', amount: 1, status: 'inventory', is_armor: false }
  ],
  fighter: [
    { name: 'Chain Mail', weight: '55', amount: 1, status: 'equipped', is_armor: true },
    { name: 'Longsword', weight: '3', amount: 1, status: 'equipped', is_armor: false },
    { name: 'Shield', weight: '6', amount: 1, status: 'equipped', is_armor: true },
    { name: 'Light Crossbow', weight: '5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Crossbow Bolts (20)', weight: '1.5', amount: 1, status: 'inventory', is_armor: false },
    { name: "Dungeoneer's Pack", weight: '61.5', amount: 1, status: 'inventory', is_armor: false }
  ],
  monk: [
    { name: 'Shortsword', weight: '2', amount: 1, status: 'equipped', is_armor: false },
    { name: "Dungeoneer's Pack", weight: '61.5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Dart', weight: '0.25', amount: 10, status: 'inventory', is_armor: false }
  ],
  paladin: [
    { name: 'Longsword', weight: '3', amount: 1, status: 'equipped', is_armor: false },
    { name: 'Shield', weight: '6', amount: 1, status: 'equipped', is_armor: true },
    { name: 'Javelin', weight: '2', amount: 5, status: 'inventory', is_armor: false },
    { name: "Priest's Pack", weight: '25', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Chain Mail', weight: '55', amount: 1, status: 'equipped', is_armor: true },
    { name: 'Holy Symbol', weight: '1', amount: 1, status: 'inventory', is_armor: false }
  ],
  ranger: [
    { name: 'Scale Mail', weight: '45', amount: 1, status: 'equipped', is_armor: true },
    { name: 'Shortsword', weight: '2', amount: 2, status: 'equipped', is_armor: false },
    { name: "Dungeoneer's Pack", weight: '61.5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Longbow', weight: '2', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Arrows (20)', weight: '2.5', amount: 1, status: 'inventory', is_armor: false }
  ],
  rogue: [
    { name: 'Rapier', weight: '2', amount: 1, status: 'equipped', is_armor: false },
    { name: 'Shortbow', weight: '2', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Arrows (20)', weight: '2.5', amount: 1, status: 'inventory', is_armor: false },
    { name: "Burglar's Pack", weight: '47.5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Leather Armor', weight: '10', amount: 1, status: 'equipped', is_armor: true },
    { name: 'Dagger', weight: '1', amount: 2, status: 'equipped', is_armor: false },
    { name: "Thieves' Tools", weight: '1', amount: 1, status: 'inventory', is_armor: false }
  ],
  sorcerer: [
    { name: 'Light Crossbow', weight: '5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Crossbow Bolts (20)', weight: '1.5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Arcane Focus', weight: '1', amount: 1, status: 'inventory', is_armor: false },
    { name: "Dungeoneer's Pack", weight: '61.5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Dagger', weight: '1', amount: 2, status: 'equipped', is_armor: false }
  ],
  warlock: [
    { name: 'Light Crossbow', weight: '5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Crossbow Bolts (20)', weight: '1.5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Arcane Focus', weight: '1', amount: 1, status: 'inventory', is_armor: false },
    { name: "Scholar's Pack", weight: '11', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Leather Armor', weight: '10', amount: 1, status: 'equipped', is_armor: true },
    { name: 'Dagger', weight: '1', amount: 2, status: 'equipped', is_armor: false }
  ],
  wizard: [
    { name: 'Quarterstaff', weight: '4', amount: 1, status: 'equipped', is_armor: false },
    { name: 'Arcane Focus', weight: '1', amount: 1, status: 'inventory', is_armor: false },
    { name: "Scholar's Pack", weight: '11', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Spellbook', weight: '3', amount: 1, status: 'inventory', is_armor: false }
  ],
  artificer: [
    { name: 'Light Crossbow', weight: '5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Crossbow Bolts (20)', weight: '1.5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Studded Leather Armor', weight: '13', amount: 1, status: 'equipped', is_armor: true },
    { name: "Thieves' Tools", weight: '1', amount: 1, status: 'inventory', is_armor: false },
    { name: "Dungeoneer's Pack", weight: '61.5', amount: 1, status: 'inventory', is_armor: false }
  ]
}

export const ITEM_WEIGHT_MAP = {
  greataxe: 7, greatsword: 6, flail: 2, scimitar: 3, shortsword: 2,
  longsword: 3, longbow: 2, 'light crossbow': 5, 'heavy crossbow': 18,
  'hand crossbow': 3, dagger: 1, handaxe: 2, javelin: 2, mace: 4,
  warhammer: 2, quarterstaff: 4, spear: 3, dart: 0.25, rapier: 2,
  halberd: 6, glaive: 6, pike: 18, trident: 4, morningstar: 4,
  'war pick': 2, whip: 3, club: 2, greatclub: 10, 'light hammer': 2,
  sickle: 2, sling: 0, shortbow: 2,
  'chain mail': 55, 'leather armor': 10, 'studded leather armor': 13,
  'scale mail': 45, 'plate armor': 65, breastplate: 20, 'half plate': 40,
  'hide armor': 12, 'padded armor': 8, 'ring mail': 40, 'splint armor': 60,
  shield: 6, 'wooden shield': 6, robe: 4,
  'clothes, common': 3, 'clothes, costume': 4, 'clothes, fine': 6, "clothes, traveler's": 4,
  "explorer's pack": 59, "dungeoneer's pack": 61.5, "priest's pack": 25,
  "scholar's pack": 11, "burglar's pack": 47.5, "diplomat's pack": 36, "entertainer's pack": 38,
  pouch: 1, backpack: 5, quiver: 1, spellbook: 3, 'component pouch': 2,
  'holy symbol': 1, 'arcane focus': 1, 'druidic focus': 1, "thieves' tools": 1,
  'herbalism kit': 3, 'arrows (20)': 1, 'crossbow bolts (20)': 1.5,
  bedroll: 7, 'mess kit': 1, tinderbox: 1, torch: 1, torches: 1,
  'rations (1 day)': 2, rations: 2, waterskin: 5, 'hempen rope (50 feet)': 10,
  'hempen rope': 10, crowbar: 5, hammer: 3, pitons: 0.25, piton: 0.25,
  'ball bearings (bag of 1,000)': 2, 'string (10 feet)': 0, bell: 0,
  candle: 0, candles: 0, 'hooded lantern': 2, 'oil (flask)': 1,
  blanket: 3, 'alms box': 1, censer: 1, vestments: 4, 'book of lore': 5,
  'ink (1 ounce bottle)': 0, 'ink pen': 0, 'parchment (sheet)': 0,
  'little bag of sand': 1, 'small knife': 0.5, chest: 25,
  'map/scroll case': 1, lamp: 1, 'paper (sheet)': 0, 'perfume (vial)': 0,
  'sealing wax': 0, soap: 0, 'disguise kit': 3, 'wooden stakes': 1,
  'holy water (flask)': 1, manacles: 6, 'steel mirror': 0.5
}

export const EQUIPMENT_PACK_CONTENTS = {
  "explorer's pack": [
    { name: 'Backpack', weight: '5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Bedroll', weight: '7', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Mess Kit', weight: '1', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Tinderbox', weight: '1', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Torches', weight: '1', amount: 10, status: 'inventory', is_armor: false },
    { name: 'Rations (1 day)', weight: '2', amount: 10, status: 'inventory', is_armor: false },
    { name: 'Waterskin', weight: '5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Hempen Rope (50 feet)', weight: '10', amount: 1, status: 'inventory', is_armor: false }
  ],
  "dungeoneer's pack": [
    { name: 'Backpack', weight: '5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Crowbar', weight: '5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Hammer', weight: '3', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Pitons', weight: '0.25', amount: 10, status: 'inventory', is_armor: false },
    { name: 'Torches', weight: '1', amount: 10, status: 'inventory', is_armor: false },
    { name: 'Tinderbox', weight: '1', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Rations (1 day)', weight: '2', amount: 10, status: 'inventory', is_armor: false },
    { name: 'Waterskin', weight: '5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Hempen Rope (50 feet)', weight: '10', amount: 1, status: 'inventory', is_armor: false }
  ],
  "burglar's pack": [
    { name: 'Backpack', weight: '5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Ball Bearings (bag of 1,000)', weight: '2', amount: 1, status: 'inventory', is_armor: false },
    { name: 'String (10 feet)', weight: '0', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Bell', weight: '0', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Candles', weight: '0', amount: 5, status: 'inventory', is_armor: false },
    { name: 'Crowbar', weight: '5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Hammer', weight: '3', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Pitons', weight: '0.25', amount: 10, status: 'inventory', is_armor: false },
    { name: 'Hooded Lantern', weight: '2', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Oil (flask)', weight: '1', amount: 2, status: 'inventory', is_armor: false },
    { name: 'Rations (1 day)', weight: '2', amount: 5, status: 'inventory', is_armor: false },
    { name: 'Tinderbox', weight: '1', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Waterskin', weight: '5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Hempen Rope (50 feet)', weight: '10', amount: 1, status: 'inventory', is_armor: false }
  ],
  "priest's pack": [
    { name: 'Backpack', weight: '5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Blanket', weight: '3', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Candles', weight: '0', amount: 10, status: 'inventory', is_armor: false },
    { name: 'Tinderbox', weight: '1', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Alms Box', weight: '1', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Censer', weight: '1', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Vestments', weight: '4', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Rations (1 day)', weight: '2', amount: 2, status: 'inventory', is_armor: false },
    { name: 'Waterskin', weight: '5', amount: 1, status: 'inventory', is_armor: false }
  ],
  "scholar's pack": [
    { name: 'Backpack', weight: '5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Book of Lore', weight: '5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Ink (1 ounce bottle)', weight: '0', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Ink Pen', weight: '0', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Parchment (sheet)', weight: '0', amount: 10, status: 'inventory', is_armor: false },
    { name: 'Little Bag of Sand', weight: '1', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Small Knife', weight: '0.5', amount: 1, status: 'inventory', is_armor: false }
  ],
  "diplomat's pack": [
    { name: 'Chest', weight: '25', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Map/Scroll Case', weight: '1', amount: 2, status: 'inventory', is_armor: false },
    { name: 'Clothes, Fine', weight: '6', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Ink (1 ounce bottle)', weight: '0', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Ink Pen', weight: '0', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Lamp', weight: '1', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Oil (flask)', weight: '1', amount: 2, status: 'inventory', is_armor: false },
    { name: 'Paper (sheet)', weight: '0', amount: 5, status: 'inventory', is_armor: false },
    { name: 'Perfume (vial)', weight: '0', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Sealing Wax', weight: '0', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Soap', weight: '0', amount: 1, status: 'inventory', is_armor: false }
  ],
  "entertainer's pack": [
    { name: 'Backpack', weight: '5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Bedroll', weight: '7', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Clothes, Costume', weight: '4', amount: 2, status: 'inventory', is_armor: false },
    { name: 'Candles', weight: '0', amount: 5, status: 'inventory', is_armor: false },
    { name: 'Rations (1 day)', weight: '2', amount: 5, status: 'inventory', is_armor: false },
    { name: 'Waterskin', weight: '5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Disguise Kit', weight: '3', amount: 1, status: 'inventory', is_armor: false }
  ],
  "monster hunter's pack": [
    { name: 'Chest', weight: '25', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Crowbar', weight: '5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Hammer', weight: '3', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Wooden Stakes', weight: '1', amount: 3, status: 'inventory', is_armor: false },
    { name: 'Holy Symbol', weight: '1', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Holy Water (flask)', weight: '1', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Manacles', weight: '6', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Steel Mirror', weight: '0.5', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Oil (flask)', weight: '1', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Tinderbox', weight: '1', amount: 1, status: 'inventory', is_armor: false },
    { name: 'Torches', weight: '1', amount: 3, status: 'inventory', is_armor: false }
  ]
}
