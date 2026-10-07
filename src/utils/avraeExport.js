const SKILL_AVRAE_MAP = {
  athletics: 'athletics',
  acrobatics: 'acrobatics',
  sleight_of_hand: 'sleightOfHand',
  stealth: 'stealth',
  arcana: 'arcana',
  history: 'history',
  investigation: 'investigation',
  nature: 'nature',
  religion: 'religion',
  animal_handling: 'animalHandling',
  insight: 'insight',
  medicine: 'medicine',
  perception: 'perception',
  survival: 'survival',
  deception: 'deception',
  intimidation: 'intimidation',
  performance: 'performance',
  persuasion: 'persuasion'
}

export function buildAvraeJson(char, origin = window.location.origin) {
  if (!char) return {}
  const vtt = char.vtt || {}

  const stats = {
    strength: Number(char.ability_score?.strength || 10),
    dexterity: Number(char.ability_score?.dexterity || 10),
    constitution: Number(char.ability_score?.constitution || 10),
    intelligence: Number(char.ability_score?.intelligence || 10),
    wisdom: Number(char.ability_score?.wisdom || 10),
    charisma: Number(char.ability_score?.charisma || 10)
  }

  const levels = {}
  const classList = Array.isArray(char.class) ? char.class : (char.class ? [char.class] : [])
  let totalLevel = 0
  for (const c of classList) {
    const name = c.name || 'Adventurer'
    const lvl = Number(c.level || char.level || 1)
    levels[name] = lvl
    totalLevel += lvl
  }
  if (totalLevel === 0) {
    const primaryName = classList[0]?.name || 'Adventurer'
    const lvl = Number(char.level || 1)
    levels[primaryName] = lvl
    totalLevel = lvl
  }

  const skills = {}
  const vttSkills = vtt.skills || {}
  for (const [key, avraeKey] of Object.entries(SKILL_AVRAE_MAP)) {
    const s = vttSkills[key]
    let prof = 0
    if (s?.expertise) prof = 2
    else if (s?.proficient) prof = 1
    else if (s?.jack_of_all_trades) prof = 0.5
    skills[avraeKey] = {
      prof,
      bonus: 0
    }
  }

  const saves = {}
  const vttSaves = vtt.saving_throws || {}
  for (const stat of ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']) {
    const sv = vttSaves[stat]
    saves[stat] = {
      prof: sv?.proficient ? 1 : 0,
      bonus: 0
    }
  }

  const attacks = (vtt.attacks || []).map(atk => ({
    name: atk.name,
    attack_bonus: atk.attack_bonus != null ? Number(atk.attack_bonus) : 0,
    damage: atk.damage_roll || '1d6',
    damage_type: atk.damage_type || 'slashing',
    details: atk.mastery?.name ? `Mastery: ${atk.mastery.name}` : ''
  }))

  const tr = char.treasure || {}
  const coinpurse = {
    cp: Number(tr.copper || 0),
    sp: Number(tr.silver || 0),
    ep: Number(tr.electrum || 0),
    gp: Number(tr.gold || 0),
    pp: Number(tr.platinum || 0)
  }

  let chars = char.characteristics
  if (typeof chars === 'string') {
    try { chars = JSON.parse(chars) } catch { chars = {} }
  }
  chars = chars || {}

  const spellbook = {
    spell_slots: {},
    max_slots: {},
    spells: (char.spells || []).map(s => s.name || s),
    spell_attack_bonus: vtt.spellcasting?.spell_attack_bonus || 0,
    spell_save_dc: vtt.spellcasting?.spell_save_dc || 10,
    spellcasting_ability: vtt.spellcasting?.ability || 'intelligence'
  }

  let imgUrl = char.image_url || ''
  if (imgUrl && !imgUrl.startsWith('http') && origin) {
    imgUrl = `${origin}${imgUrl}`
  }

  const raceName = char.race?.name || (typeof char.race === 'string' ? char.race : '') || ''
  const subRaceName = char.sub_race?.name || (typeof char.sub_race === 'string' ? char.sub_race : '') || ''
  const fullRace = subRaceName ? `${raceName} (${subRaceName})` : raceName

  return {
    name: char.name || 'Unnamed Character',
    description: chars.appearance || chars.notes?.backstory || '',
    image: imgUrl,
    upstream: origin ? `${origin}/?character=${char.id}` : '',
    stats,
    levels,
    total_level: totalLevel,
    hp: Number(char.hp != null ? char.hp : (vtt.combat?.hp?.max || 10)),
    max_hp: Number(vtt.combat?.hp?.max || char.max_hp || 10),
    temp_hp: Number(char.temp_hp || 0),
    armor_class: Number(vtt.combat?.armor_class || 10),
    ac: Number(vtt.combat?.armor_class || 10),
    proficiency_bonus: Number(vtt.proficiency_bonus || 2),
    speed: Number(char.speed || vtt.combat?.speed || 30),
    race: fullRace || 'Human',
    background: char.background || '',
    alignment: chars.alignment || char.alignment || '',
    skills,
    saves,
    attacks,
    spellbook,
    coinpurse,
    cvars: {},
    consumables: [],
    death_saves: { successes: 0, failures: 0 }
  }
}

export function buildAvraeAttackMacro(attacks) {
  if (!Array.isArray(attacks) || attacks.length === 0) return ''
  const payload = attacks.map(atk => {
    const dmg = atk.damage_roll || '1d6'
    const dtype = atk.damage_type || 'slashing'
    return {
      name: atk.name,
      automation: [
        {
          type: 'target',
          target: 'all',
          effects: [
            {
              type: 'attack',
              hit: [
                {
                  type: 'damage',
                  damage: `${dmg} [${dtype}]`
                }
              ],
              miss: []
            }
          ]
        }
      ],
      _v: 2
    }
  })
  return `!a import ${JSON.stringify(payload)}`
}
