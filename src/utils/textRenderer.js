// Utility to parse 5eTools markup annotations into styled interactive HTML elements

export const BUILTIN_RULES = {
  // --- Rules & Resting ---
  long_rest: {
    name: 'Long Rest',
    type: 'Rule',
    badge: 'Resting',
    entries: [
      "A Long Rest is a period of extended downtime, at least 8 hours long, during which a character sleeps for at least 6 hours and performs no more than 2 hours of light activity.",
      "At the end of a Long Rest, a character regains all lost Hit Points and half of their total number of Hit Dice. Spell slots and many abilities recharge."
    ]
  },
  short_rest: {
    name: 'Short Rest',
    type: 'Rule',
    badge: 'Resting',
    entries: [
      "A Short Rest is a period of downtime, at least 1 hour long, during which a character does nothing more strenuous than eating, drinking, reading, and tending to wounds.",
      "A character can spend one or more Hit Dice at the end of a Short Rest to regain Hit Points."
    ]
  },
  resting: {
    name: 'Resting',
    type: 'Rule',
    badge: 'General Rule',
    entries: [
      "Adventurers can take short rests in the midst of an adventuring day and a long rest to end the day.",
      "Short rests last at least 1 hour; long rests last at least 8 hours."
    ]
  },
  optional_class_features: {
    name: 'Optional Class Features',
    type: 'Variant Rule',
    badge: 'Variant Rule',
    entries: [
      "Optional class features are additional or replacement abilities you can gain beyond the standard features in the Player's Handbook, subject to DM approval (Tasha's Cauldron of Everything)."
    ]
  },
  concentration: {
    name: 'Concentration',
    type: 'Rule',
    badge: 'Spellcasting',
    entries: [
      "Some spells require you to maintain concentration in order to keep their magic active.",
      "If you take damage while concentrating, you must make a Constitution saving throw (DC 10 or half the damage taken, whichever is higher). Taking another concentration spell ends the current one."
    ]
  },
  opportunity_attack: {
    name: 'Opportunity Attack',
    type: 'Rule',
    badge: 'Combat Reaction',
    entries: [
      "You can make an opportunity attack when a hostile creature that you can see moves out of your reach.",
      "Uses your reaction to make one melee attack against the provoking creature immediately before it leaves your reach."
    ]
  },
  attunement: {
    name: 'Attunement',
    type: 'Rule',
    badge: 'Magic Items',
    entries: [
      "Some magic items require a creature to form a bond with them before their magical properties can be used.",
      "Attuning requires a creature to spend a short rest focused on only that item. A creature can be attuned to no more than 3 magic items at once."
    ]
  },
  carrying_capacity: {
    name: 'Carrying Capacity',
    type: 'Rule',
    badge: 'Encumbrance',
    entries: [
      "Your carrying capacity is your Strength score multiplied by 15. This is the weight in pounds that you can carry.",
      "Push, Drag, or Lift: You can push, drag, or lift a weight in pounds up to twice your carrying capacity (Strength x 30)."
    ]
  },
  temporary_hit_points: {
    name: 'Temporary Hit Points',
    type: 'Rule',
    badge: 'Health',
    entries: [
      "Temporary hit points serve as a buffer against damage, protecting you from injury.",
      "If you take damage, that damage is subtracted from your temporary hit points first. Leftover damage carries over to normal hit points.",
      "Temporary hit points do not stack; if you receive new temporary hit points, you decide whether to keep the existing amount or take the new amount."
    ]
  },
  heroic_inspiration: {
    name: 'Heroic Inspiration',
    type: 'Rule',
    badge: 'Core Rule',
    entries: [
      "If you have Heroic Inspiration, you can expend it to reroll any one die roll and use the new result. You either have Heroic Inspiration or you do not; you cannot stockpile multiple instances."
    ]
  },
  inspiration: {
    name: 'Inspiration (Heroic Inspiration)',
    type: 'Rule',
    badge: 'Core Rule',
    entries: [
      "If you have Inspiration, you can expend it to reroll any one die roll and use the new result. You either have Inspiration or you do not; you cannot stockpile multiple instances."
    ]
  },
  spell_slot: {
    name: 'Spell Slots',
    type: 'Rule',
    badge: 'Spellcasting',
    entries: [
      "Spell slots represent the magical stamina available to cast spells. Casting a spell expends a slot of that spell's level or higher. Expended slots are regained after finishing a Long Rest (or Short Rest for Warlocks)."
    ]
  },
  spell_slots: {
    name: 'Spell Slots',
    type: 'Rule',
    badge: 'Spellcasting',
    entries: [
      "Spell slots represent the magical stamina available to cast spells. Casting a spell expends a slot of that spell's level or higher. Expended slots are regained after finishing a Long Rest (or Short Rest for Warlocks)."
    ]
  },
  cantrip: {
    name: 'Cantrip',
    type: 'Rule',
    badge: 'Spellcasting',
    entries: [
      "A cantrip is a spell that can be cast at will, without using a spell slot and without being prepared in advance. It represents foundational magical knowledge."
    ]
  },
  cantrips: {
    name: 'Cantrips',
    type: 'Rule',
    badge: 'Spellcasting',
    entries: [
      "A cantrip is a spell that can be cast at will, without using a spell slot and without being prepared in advance. It represents foundational magical knowledge."
    ]
  },
  ritual: {
    name: 'Ritual Casting',
    type: 'Rule',
    badge: 'Spellcasting',
    entries: [
      "Certain spells have the ritual tag. A ritual version takes 10 minutes longer to cast than normal, but does not expend a spell slot."
    ]
  },
  advantage: {
    name: 'Advantage',
    type: 'Rule',
    badge: 'Core Rule',
    entries: [
      "When you have advantage on a d20 roll (attack roll, ability check, or saving throw), roll two d20s and use the higher result."
    ]
  },
  disadvantage: {
    name: 'Disadvantage',
    type: 'Rule',
    badge: 'Core Rule',
    entries: [
      "When you have disadvantage on a d20 roll (attack roll, ability check, or saving throw), roll two d20s and use the lower result."
    ]
  },
  saving_throw: {
    name: 'Saving Throw',
    type: 'Rule',
    badge: 'Core Rule',
    entries: [
      "A saving throw represents an attempt to resist or endure a harmful effect (such as a spell or dragon's breath). Roll a d20, add the ability modifier, and add your proficiency bonus if proficient in that save."
    ]
  },
  saving_throws: {
    name: 'Saving Throws',
    type: 'Rule',
    badge: 'Core Rule',
    entries: [
      "A saving throw represents an attempt to resist or endure a harmful effect (such as a spell or dragon's breath). Roll a d20, add the ability modifier, and add your proficiency bonus if proficient in that save."
    ]
  },
  feat: {
    name: 'Feat',
    type: 'Rule',
    badge: 'Character Feature',
    entries: [
      "A feat represents an area of expertise or special prowess that gives a character capabilities beyond class features. Feats are gained at 1st level (Origin Feats in 2024 / backgrounds) and instead of Ability Score Improvements at certain class levels."
    ]
  },
  feats: {
    name: 'Feats',
    type: 'Rule',
    badge: 'Character Feature',
    entries: [
      "A feat represents an area of expertise or special prowess that gives a character capabilities beyond class features. Feats are gained at 1st level (Origin Feats in 2024 / backgrounds) and instead of Ability Score Improvements at certain class levels."
    ]
  },
  proficiency_bonus: {
    name: 'Proficiency Bonus',
    type: 'Rule',
    badge: 'Core Rule',
    entries: [
      "Your proficiency bonus is based on total character level (+2 at level 1-4, +3 at 5-8, +4 at 9-12, +5 at 13-16, +6 at 17-20). It adds to attacks with proficient weapons, proficient skills, saving throws, and your spell save DC."
    ]
  },
  armor_class: {
    name: 'Armor Class (AC)',
    type: 'Rule',
    badge: 'Combat',
    entries: [
      "Armor Class represents how difficult it is for an attacker to land a harmful blow on you. An attack roll must meet or beat your AC to hit."
    ]
  },
  initiative: {
    name: 'Initiative',
    type: 'Rule',
    badge: 'Combat',
    entries: [
      "Initiative determines the order of turns during combat. Roll a d20 and add your Dexterity modifier when combat begins."
    ]
  },
  hit_dice: {
    name: 'Hit Dice',
    type: 'Rule',
    badge: 'Health',
    entries: [
      "You have a number of Hit Dice equal to your total character level. During a Short Rest, you can spend Hit Dice to regain lost Hit Points. You regain half your total Hit Dice at the end of a Long Rest."
    ]
  },

  // --- Damage Types ---
  acid: {
    name: 'Acid Damage',
    type: 'Damage Type',
    badge: 'Damage',
    entries: [
      "The corrosive spray of a black dragon's breath and the dissolving enzymes secreted by a black pudding deal acid damage."
    ]
  },
  bludgeoning: {
    name: 'Bludgeoning Damage',
    type: 'Damage Type',
    badge: 'Damage',
    entries: [
      "Blunt force attacks—hammers, falling, constriction, and the like—deal bludgeoning damage."
    ]
  },
  cold: {
    name: 'Cold Damage',
    type: 'Damage Type',
    badge: 'Damage',
    entries: [
      "The infernal chill radiating from an ice devil's spear and the frigid blast of a white dragon's breath deal cold damage."
    ]
  },
  fire: {
    name: 'Fire Damage',
    type: 'Damage Type',
    badge: 'Damage',
    entries: [
      "Red dragons breathe fire, and many spells, such as Fireball, conjure flames to deal fire damage."
    ]
  },
  force: {
    name: 'Force Damage',
    type: 'Damage Type',
    badge: 'Damage',
    entries: [
      "Force is pure magical energy focused into a damaging form. Most effects that deal force damage are spells, including Magic Missile and Eldritch Blast. Very few creatures have resistance or immunity to force damage."
    ]
  },
  lightning: {
    name: 'Lightning Damage',
    type: 'Damage Type',
    badge: 'Damage',
    entries: [
      "A lightning bolt spell and a blue dragon's breath deal lightning damage."
    ]
  },
  necrotic: {
    name: 'Necrotic Damage',
    type: 'Damage Type',
    badge: 'Damage',
    entries: [
      "Necrotic damage, dealt by certain undead and spells such as Chill Touch, withers matter and even the soul."
    ]
  },
  piercing: {
    name: 'Piercing Damage',
    type: 'Damage Type',
    badge: 'Damage',
    entries: [
      "Puncturing and impaling attacks, including spears and monsters' bites, deal piercing damage."
    ]
  },
  poison: {
    name: 'Poison Damage',
    type: 'Damage Type',
    badge: 'Damage',
    entries: [
      "Venomous stings and the toxic gas of a green dragon's breath deal poison damage."
    ]
  },
  psychic: {
    name: 'Psychic Damage',
    type: 'Damage Type',
    badge: 'Damage',
    entries: [
      "Mental abilities such as a mind flayer's psionic blast deal psychic damage."
    ]
  },
  radiant: {
    name: 'Radiant Damage',
    type: 'Damage Type',
    badge: 'Damage',
    entries: [
      "Radiant damage, dealt by a cleric's Flame Strike or an angel's smiting weapon, sears the flesh like fire and overloads the spirit with power."
    ]
  },
  slashing: {
    name: 'Slashing Damage',
    type: 'Damage Type',
    badge: 'Damage',
    entries: [
      "Swords, axes, and monsters' claws deal slashing damage."
    ]
  },
  thunder: {
    name: 'Thunder Damage',
    type: 'Damage Type',
    badge: 'Damage',
    entries: [
      "A concussive burst of sound, such as the effect of the Thunderwave spell, deals thunder damage."
    ]
  },

  // --- Class Spell Lists & Features ---
  metamagic: {
    name: 'Metamagic',
    type: 'Class Feature',
    badge: 'Sorcerer',
    entries: [
      "At 3rd level, a sorcerer gains the ability to twist spells to suit their needs using Sorcery Points.",
      "Common Metamagic options include:",
      "• Quickened Spell: Change casting time from 1 action to 1 bonus action (cost 2 sorcery points).",
      "• Twinned Spell: Target a second creature in range with a spell that targets only one creature (cost = spell level, or 1 for cantrip).",
      "• Subtle Spell: Cast without verbal or somatic components (cost 1 sorcery point).",
      "• Heightened Spell: Give one target disadvantage on its first saving throw against the spell (cost 2 or 3 sorcery points).",
      "• Careful Spell: Protect chosen allies from the spell's harmful effects (cost 1 sorcery point).",
      "• Empowered Spell: Reroll damage dice up to your Charisma modifier (cost 1 sorcery point).",
      "• Extended Spell: Double the duration of a spell with a duration of 1 minute or longer (cost 1 sorcery point).",
      "• Distant Spell: Double the range of a spell, or make a touch spell reach 30 feet (cost 1 sorcery point)."
    ]
  },
  metamagic_option: {
    name: 'Metamagic Options',
    type: 'Class Feature',
    badge: 'Sorcerer',
    entries: [
      "Sorcerers customize their spells using Metamagic options powered by Sorcery Points.",
      "Key options include Quickened Spell (cast as bonus action), Twinned Spell (target second creature), Subtle Spell (no verbal or somatic components), Heightened Spell (impose disadvantage on saves), and Empowered Spell (reroll damage dice)."
    ]
  },
  sorcerer_spell_list: {
    name: 'Sorcerer Spell List',
    type: 'Spell List',
    badge: 'Sorcerer Spells',
    entries: [
      "Sorcerers cast arcane spells powered by innate magic, using Charisma as their spellcasting ability modifier.",
      "Their spell list emphasizes raw magical power, evocation, and reality-altering effects such as Chaos Bolt, Fireball, Shield, Invisibility, Haste, Polymorph, and Wish.",
      "Spells can be prepared or selected in the Spells tab and altered with Metamagic."
    ]
  },
  wizard_spell_list: {
    name: 'Wizard Spell List',
    type: 'Spell List',
    badge: 'Wizard Spells',
    entries: [
      "Wizards study arcane magic systematically, using Intelligence as their spellcasting ability modifier.",
      "The most expansive spell list in D&D, featuring ritual casting, defensive abjurations (Shield, Counterspell), battlefield control (Web, Wall of Force), and high evocation (Fireball, Chain Lightning, Meteor Swarm).",
      "Wizards copy spells into a spellbook and prepare them each day."
    ]
  },
  bard_spell_list: {
    name: 'Bard Spell List',
    type: 'Spell List',
    badge: 'Bard Spells',
    entries: [
      "Bards weave music, poetry, and performance into spells, using Charisma as their spellcasting ability modifier.",
      "Specializes in enchantment, illusion, healing, and control (Vicious Mockery, Dissonant Whispers, Healing Word, Hypnotic Pattern, Polymorph, Otto's Irresistible Dance).",
      "Higher-level bards gain Magical Secrets to choose spells from any class list."
    ]
  },
  cleric_spell_list: {
    name: 'Cleric Spell List',
    type: 'Spell List',
    badge: 'Cleric Spells',
    entries: [
      "Clerics channel divine power from deities, using Wisdom as their spellcasting ability modifier.",
      "Specializes in healing, radiant empowerment, restoration, and defensive wards (Bless, Cure Wounds, Spiritual Weapon, Spirit Guardians, Revivify, Heal).",
      "Clerics prepare spells daily from the full cleric list alongside their domain spells."
    ]
  },
  druid_spell_list: {
    name: 'Druid Spell List',
    type: 'Spell List',
    badge: 'Druid Spells',
    entries: [
      "Druids revere nature and harness primal magic, using Wisdom as their spellcasting ability modifier.",
      "Focuses on elemental manipulation, healing, animal summoning, and battlefield control (Entangle, Moonbeam, Spike Growth, Call Lightning, Conjure Animals).",
      "Druids prepare spells daily from the full druid spell list."
    ]
  },
  warlock_spell_list: {
    name: 'Warlock Spell List',
    type: 'Spell List',
    badge: 'Warlock Spells',
    entries: [
      "Warlocks gain magic through pacts with otherworldly patrons, using Charisma as their spellcasting ability modifier.",
      "Features Pact Magic: slots are limited but always cast at the highest spell level and refresh on a Short Rest (Eldritch Blast, Armor of Agathys, Hex, Hunger of Hadar, Synaptic Static).",
      "Augmented by Eldritch Invocations."
    ]
  },
  paladin_spell_list: {
    name: 'Paladin Spell List',
    type: 'Spell List',
    badge: 'Paladin Spells',
    entries: [
      "Paladins manifest magic through holy vows, using Charisma as their spellcasting ability modifier.",
      "Focuses on weapon smites, defensive auras, radiant energy, and support (Divine Smite, Wrathful Smite, Thunderous Smite, Shield of Faith, Aid, Find Steed).",
      "Prepares spells daily starting at paladin level 2."
    ]
  },
  ranger_spell_list: {
    name: 'Ranger Spell List',
    type: 'Spell List',
    badge: 'Ranger Spells',
    entries: [
      "Rangers wield primal magic attuned to wilderness survival and combat, using Wisdom as their spellcasting ability modifier.",
      "Focuses on hunting buffs, mobility, and archery enhancements (Hunter's Mark, Zephyr Strike, Pass Without Trace, Spike Growth, Conjure Volley).",
      "Prepares or learns spells starting at ranger level 2."
    ]
  },
  artificer_spell_list: {
    name: 'Artificer Spell List',
    type: 'Spell List',
    badge: 'Artificer Spells',
    entries: [
      "Artificers channel magic through tools and invention, using Intelligence as their spellcasting ability modifier.",
      "Focuses on utility, tool enhancements, defenses, and infused weaponry (Absorb Elements, Faerie Fire, Sanctuary, Heat Metal, Haste).",
      "Prepares spells daily starting at artificer level 1."
    ]
  },

  // --- Conditions ---
  blinded: {
    name: 'Blinded',
    type: 'Condition',
    badge: 'Condition',
    entries: [
      "A blinded creature can't see and automatically fails any ability check that requires sight.",
      "Attack rolls against the creature have advantage, and the creature's attack rolls have disadvantage."
    ]
  },
  charmed: {
    name: 'Charmed',
    type: 'Condition',
    badge: 'Condition',
    entries: [
      "A charmed creature can't attack the charmer or target the charmer with harmful abilities or magical effects.",
      "The charmer has advantage on any ability check to interact socially with the creature."
    ]
  },
  deafened: {
    name: 'Deafened',
    type: 'Condition',
    badge: 'Condition',
    entries: [
      "A deafened creature can't hear and automatically fails any ability check that requires hearing."
    ]
  },
  frightened: {
    name: 'Frightened',
    type: 'Condition',
    badge: 'Condition',
    entries: [
      "A frightened creature has disadvantage on ability checks and attack rolls while the source of its fear is within line of sight.",
      "The creature can't willingly move closer to the source of its fear."
    ]
  },
  grappled: {
    name: 'Grappled',
    type: 'Condition',
    badge: 'Condition',
    entries: [
      "A grappled creature's speed becomes 0, and it can't benefit from any bonus to its speed.",
      "The condition ends if the grappler is incapacitated or moved away."
    ]
  },
  incapacitated: {
    name: 'Incapacitated',
    type: 'Condition',
    badge: 'Condition',
    entries: [
      "An incapacitated creature can't take actions, bonus actions, or reactions.",
      "Concentration on spells is immediately broken."
    ]
  },
  invisible: {
    name: 'Invisible',
    type: 'Condition',
    badge: 'Condition',
    entries: [
      "An invisible creature is impossible to see without the aid of magic or a special sense.",
      "Attack rolls against the creature have disadvantage, and the creature's attack rolls have advantage."
    ]
  },
  paralyzed: {
    name: 'Paralyzed',
    type: 'Condition',
    badge: 'Condition',
    entries: [
      "A paralyzed creature is incapacitated and can't move or speak.",
      "The creature automatically fails Strength and Dexterity saving throws.",
      "Attack rolls against the creature have advantage. Any attack that hits is a critical hit if the attacker is within 5 feet."
    ]
  },
  petrified: {
    name: 'Petrified',
    type: 'Condition',
    badge: 'Condition',
    entries: [
      "A petrified creature is transformed into a solid inanimate substance (usually stone).",
      "Its weight increases by a factor of ten, and it ceases aging.",
      "The creature is incapacitated, can't move or speak, and has resistance to all damage."
    ]
  },
  poisoned: {
    name: 'Poisoned',
    type: 'Condition',
    badge: 'Condition',
    entries: [
      "A poisoned creature has disadvantage on attack rolls and ability checks."
    ]
  },
  prone: {
    name: 'Prone',
    type: 'Condition',
    badge: 'Condition',
    entries: [
      "A prone creature's only movement option is to crawl, unless it stands up.",
      "The creature has disadvantage on attack rolls.",
      "An attack roll against the creature has advantage if the attacker is within 5 feet; otherwise disadvantage."
    ]
  },
  restrained: {
    name: 'Restrained',
    type: 'Condition',
    badge: 'Condition',
    entries: [
      "A restrained creature's speed becomes 0.",
      "Attack rolls against the creature have advantage, and the creature's attack rolls have disadvantage.",
      "The creature has disadvantage on Dexterity saving throws."
    ]
  },
  stunned: {
    name: 'Stunned',
    type: 'Condition',
    badge: 'Condition',
    entries: [
      "A stunned creature is incapacitated, can't move, and can speak only falteringly.",
      "The creature automatically fails Strength and Dexterity saving throws.",
      "Attack rolls against the creature have advantage."
    ]
  },
  unconscious: {
    name: 'Unconscious',
    type: 'Condition',
    badge: 'Condition',
    entries: [
      "An unconscious creature is incapacitated, can't move or speak, and is unaware of its surroundings.",
      "The creature drops whatever it's holding and falls prone.",
      "Automatically fails Strength and Dexterity saving throws. Attacks within 5 ft are critical hits."
    ]
  },
  exhaustion: {
    name: 'Exhaustion',
    type: 'Condition',
    badge: 'Condition',
    entries: [
      "Exhaustion is measured in six cumulative levels. Level 1: Disadvantage on ability checks; Level 2: Speed halved; Level 3: Disadvantage on attack rolls and saving throws; Level 4: HP max halved; Level 5: Speed 0; Level 6: Death."
    ]
  },

  // --- Skills ---
  athletics: {
    name: 'Athletics',
    type: 'Skill',
    badge: 'Strength Skill',
    entries: [
      "Covers difficult situations encountered while climbing, jumping, or swimming. Also used for grappling or shoving creatures in combat."
    ]
  },
  acrobatics: {
    name: 'Acrobatics',
    type: 'Skill',
    badge: 'Dexterity Skill',
    entries: [
      "Covers staying on your feet in a tricky situation, such as walking across a sheet of ice, balancing on a tightrope, or doing acrobatic stunts."
    ]
  },
  sleight_of_hand: {
    name: 'Sleight of Hand',
    type: 'Skill',
    badge: 'Dexterity Skill',
    entries: [
      "Covers acts of manual trickery, such as planting something on someone else, concealing an object on your person, or pickpocketing."
    ]
  },
  stealth: {
    name: 'Stealth',
    type: 'Skill',
    badge: 'Dexterity Skill',
    entries: [
      "Make a Dexterity (Stealth) check when you attempt to conceal yourself from enemies, slink past guards, or slip away without being seen or heard."
    ]
  },
  arcana: {
    name: 'Arcana',
    type: 'Skill',
    badge: 'Intelligence Skill',
    entries: [
      "Measures your ability to recall lore about spells, magic items, eldritch symbols, magical traditions, the planes of existence, and their inhabitants."
    ]
  },
  history: {
    name: 'History',
    type: 'Skill',
    badge: 'Intelligence Skill',
    entries: [
      "Measures your ability to recall lore about historical events, legendary people, ancient kingdoms, past disputes, and wars."
    ]
  },
  investigation: {
    name: 'Investigation',
    type: 'Skill',
    badge: 'Intelligence Skill',
    entries: [
      "Looking around for clues and making deductions based on those clues. Finding hidden items, deciphering codes, or deducing how an object functions."
    ]
  },
  nature: {
    name: 'Nature',
    type: 'Skill',
    badge: 'Intelligence Skill',
    entries: [
      "Measures your ability to recall lore about terrain, plants and animals, weather, and natural cycles."
    ]
  },
  religion: {
    name: 'Religion',
    type: 'Skill',
    badge: 'Intelligence Skill',
    entries: [
      "Measures your ability to recall lore about deities, rites and prayers, religious hierarchies, holy symbols, and the practices of secret cults."
    ]
  },
  animal_handling: {
    name: 'Animal Handling',
    type: 'Skill',
    badge: 'Wisdom Skill',
    entries: [
      "Used to calm down a domesticated animal, keep a mount from getting spooked, or intuit an animal's intentions."
    ]
  },
  insight: {
    name: 'Insight',
    type: 'Skill',
    badge: 'Wisdom Skill',
    entries: [
      "Determines whether you can determine the true intentions of a creature, such as searching out a lie or predicting someone's next move."
    ]
  },
  medicine: {
    name: 'Medicine',
    type: 'Skill',
    badge: 'Wisdom Skill',
    entries: [
      "Lets you try to stabilize a dying companion or diagnose an illness."
    ]
  },
  perception: {
    name: 'Perception',
    type: 'Skill',
    badge: 'Wisdom Skill',
    entries: [
      "Lets you spot, hear, or otherwise detect the presence of something. Measures your general awareness of your surroundings."
    ]
  },
  survival: {
    name: 'Survival',
    type: 'Skill',
    badge: 'Wisdom Skill',
    entries: [
      "Follow tracks, hunt wild game, guide your group through frozen wastelands, identify signs of owlbears nearby, predict weather, or avoid quicksand."
    ]
  },
  deception: {
    name: 'Deception',
    type: 'Skill',
    badge: 'Charisma Skill',
    entries: [
      "Determines whether you can convincingly hide the truth, either verbally or through your actions (fast-talking, conning, using a disguise)."
    ]
  },
  intimidation: {
    name: 'Intimidation',
    type: 'Skill',
    badge: 'Charisma Skill',
    entries: [
      "Influencing someone through overt threats, hostile actions, and physical presence."
    ]
  },
  performance: {
    name: 'Performance',
    type: 'Skill',
    badge: 'Charisma Skill',
    entries: [
      "Delighting an audience with music, dance, acting, storytelling, or some other form of entertainment."
    ]
  },
  persuasion: {
    name: 'Persuasion',
    type: 'Skill',
    badge: 'Charisma Skill',
    entries: [
      "Influencing someone or a group of people with tact, social graces, or good nature (acting in good faith, fostering friendships, bargaining)."
    ]
  },

  // --- Senses ---
  darkvision: {
    name: 'Darkvision',
    type: 'Sense',
    badge: 'Sense',
    entries: [
      "Within a specified range, you can see in dim light as if it were bright light, and in darkness as if it were dim light (cannot discern color in darkness, only shades of gray)."
    ]
  },
  blindsight: {
    name: 'Blindsight',
    type: 'Sense',
    badge: 'Sense',
    entries: [
      "A creature with blindsight can perceive its surroundings without relying on sight, within a specific radius."
    ]
  },
  tremorsense: {
    name: 'Tremorsense',
    type: 'Sense',
    badge: 'Sense',
    entries: [
      "Detect and pinpoint the origin of vibrations within a specific radius, provided that the creature and the source of vibrations are in contact with the same ground."
    ]
  },
  truesight: {
    name: 'Truesight',
    type: 'Sense',
    badge: 'Sense',
    entries: [
      "A creature with truesight can see in normal and magical darkness, see invisible creatures and objects, automatically detect visual illusions, and perceive the original form of a shapechanger."
    ]
  },

  // --- Actions ---
  dash: {
    name: 'Dash',
    type: 'Action',
    badge: 'Combat Action',
    entries: ["You gain extra movement for the current turn equal to your speed, after applying any modifiers."]
  },
  disengage: {
    name: 'Disengage',
    type: 'Action',
    badge: 'Combat Action',
    entries: ["Your movement doesn't provoke opportunity attacks for the rest of the turn."]
  },
  dodge: {
    name: 'Dodge',
    type: 'Action',
    badge: 'Combat Action',
    entries: [
      "Until the start of your next turn, any attack roll made against you has disadvantage if you can see the attacker, and you make Dexterity saving throws with advantage."
    ]
  },
  help: {
    name: 'Help',
    type: 'Action',
    badge: 'Combat Action',
    entries: [
      "You can lend your aid to another creature in the completion of a task, or feint to distract a target giving an ally advantage on their next attack roll."
    ]
  },
  hide: {
    name: 'Hide',
    type: 'Action',
    badge: 'Combat Action',
    entries: [
      "Make a Dexterity (Stealth) check in an attempt to hide, following the rules for hiding."
    ]
  },
  ready: {
    name: 'Ready',
    type: 'Action',
    badge: 'Combat Action',
    entries: [
      "You decide what perceivable circumstance will trigger your reaction, and the action you will take in response."
    ]
  }
}

const escapeHtml = (str) => {
  if (typeof str !== 'string') return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export const formatRuleKey = (str) => {
  if (typeof str !== 'string') return ''
  return str.toLowerCase().trim().replace(/['"“”]/g, '').replace(/[\s-]+/g, '_')
}

export const findBuiltinRule = (target, display) => {
  if (!target && !display) return null
  const k1 = formatRuleKey(target)
  const k2 = formatRuleKey(display)
  const candidates = [
    k1,
    k2,
    `${k1}_spell_list`,
    `${k2}_spell_list`,
    k1.replace(/_option$/, ''),
    k2.replace(/_option$/, ''),
    k1.replace(/_options$/, ''),
    k2.replace(/_options$/, ''),
    k1.replace(/_damage$/, ''),
    k2.replace(/_damage$/, '')
  ].filter(Boolean)

  for (const key of candidates) {
    if (BUILTIN_RULES[key]) {
      return { key, rule: BUILTIN_RULES[key] }
    }
  }
  return null
}

export const clean5eToolsMarkup = (text) => {
  if (typeof text !== 'string') return ''
  let result = text
  let iterations = 0
  while (/\{@([a-zA-Z0-9_]+)(?: ([^{}]+))?\}/.test(result) && iterations < 15) {
    result = result.replace(/\{@([a-zA-Z0-9_]+)(?: ([^{}]+))?\}/g, (match, tag, content) => {
      if (!content) return ''
      const parts = content.split('|')
      const lowerTag = tag.toLowerCase()
      if (lowerTag === 'filter') return parts[0]
      if (lowerTag === 'b' || lowerTag === 'i' || lowerTag === 'strike' || lowerTag === 's' || lowerTag === 'u') return parts[0]
      if (lowerTag === 'dice' || lowerTag === 'damage' || lowerTag === 'd20') return parts[0]
      if (lowerTag === 'quickref' && parts[4]) return parts[4]
      if (parts.length >= 3 && parts[2]) return parts[2]
      return parts[0]
    })
    iterations++
  }
  return result.replace(/\s+/g, ' ').trim()
}

export const renderAnnotatedText = (text) => {
  if (typeof text !== 'string') return ''
  let result = text
  let iterations = 0

  while (/\{@([a-zA-Z0-9_]+)(?: ([^{}]+))?\}/.test(result) && iterations < 15) {
    result = result.replace(/\{@([a-zA-Z0-9_]+)(?: ([^{}]+))?\}/g, (match, tag, content) => {
      if (!content) return ''
      const parts = content.split('|')
      const lowerTag = tag.toLowerCase()

      if (lowerTag === 'b') return `<b>${parts[0]}</b>`
      if (lowerTag === 'i') return `<i>${parts[0]}</i>`
      if (lowerTag === 'strike' || lowerTag === 's') return `<s>${parts[0]}</s>`
      if (lowerTag === 'u') return `<u>${parts[0]}</u>`
      if (lowerTag === 'dice' || lowerTag === 'damage' || lowerTag === 'd20') {
        return `<span class="text-indigo-600 font-semibold">${parts[0]}</span>`
      }

      let target = parts[0]
      let source = parts[1] || ''
      let displayText = parts[0]

      if (lowerTag === 'quickref' && parts[4]) {
        displayText = parts[4]
      } else if (lowerTag !== 'filter' && parts.length >= 3 && parts[2]) {
        displayText = parts[2]
      }

      if (lowerTag === 'filter') {
        const found = findBuiltinRule(target, displayText)
        if (found) {
          return `<span class="dnd-tag-ref text-blue-600 font-medium underline decoration-blue-300 decoration-dotted hover:text-indigo-700 hover:decoration-indigo-500 cursor-pointer" data-tag="rule" data-target="${escapeHtml(found.key)}" data-source="${escapeHtml(source)}" data-display="${escapeHtml(displayText)}">${displayText}</span>`
        }
        // Generic uninformative filter query: render clean styled text without link/popover
        return `<span class="text-indigo-600 font-medium">${displayText}</span>`
      }

      const refTags = [
        'spell', 'item', 'feat', 'condition', 'skill', 'sense', 'action',
        'race', 'subrace', 'class', 'background',
        'variantrule', 'rule', 'optfeature', 'hazard', 'status', 'deity'
      ]
      if (refTags.includes(lowerTag)) {
        return `<span class="dnd-tag-ref text-blue-600 font-medium underline decoration-blue-300 decoration-dotted hover:text-indigo-700 hover:decoration-indigo-500 cursor-pointer" data-tag="${lowerTag}" data-target="${escapeHtml(target)}" data-source="${escapeHtml(source)}" data-display="${escapeHtml(displayText)}">${displayText}</span>`
      }

      return `<span class="text-blue-600 font-medium">${displayText}</span>`
    })
    iterations++
  }

  return result
}

export const renderTableCell = (cell) => {
  if (cell === null || cell === undefined) return ''
  if (typeof cell === 'string') return renderAnnotatedText(cell)
  if (typeof cell === 'number') return String(cell)
  if (typeof cell === 'object') {
    if (cell.roll) {
      if (cell.roll.exact !== undefined) return String(cell.roll.exact)
      if (cell.roll.min !== undefined && cell.roll.max !== undefined) {
        return cell.roll.min === cell.roll.max ? String(cell.roll.min) : `${cell.roll.min}–${cell.roll.max}`
      }
    }
    if (cell.entry !== undefined) return renderTableCell(cell.entry)
    if (Array.isArray(cell.entries)) return cell.entries.map(renderTableCell).join('<br>')
    if (Array.isArray(cell)) return cell.map(renderTableCell).join(', ')
  }
  return renderAnnotatedText(String(cell))
}
