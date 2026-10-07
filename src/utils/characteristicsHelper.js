import { clean5eToolsMarkup } from './textRenderer'

export const LIFESTYLES = [
  { value: 'Wretched', label: 'Wretched (Free)', cost: '0 cp/day', desc: 'Living in inhumane conditions. You have no shelter, scavenge for scraps, and suffer exposure.' },
  { value: 'Squalid', label: 'Squalid', cost: '1 sp/day', desc: 'Crowded and desolate conditions. You sleep in a leaky stable or shelter in a mud-floored shack.' },
  { value: 'Poor', label: 'Poor', cost: '2 sp/day', desc: 'Simple food and lodging. You stay in a one-room tavern or a flophouse, lacking modern comforts.' },
  { value: 'Modest', label: 'Modest', cost: '1 gp/day', desc: 'Average commoner lifestyle. Clean clothes, decent meals in an inn, keeping equipment in repair.' },
  { value: 'Comfortable', label: 'Comfortable', cost: '2 gp/day', desc: 'Quality meals, private room, fine tailored clothing, able to maintain weapons and armor easily.' },
  { value: 'Wealthy', label: 'Wealthy', cost: '4 gp/day', desc: 'A life of luxury. You have servants, dine on gourmet food, and socialize with town elites.' },
  { value: 'Aristocratic', label: 'Aristocratic', cost: '10+ gp/day', desc: 'Nobility lifestyle. You move in high society circles, wear royal finery, and frequent palaces.' }
]

export const DND_SIZES = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan']

export const FALLBACK_CHARACTERISTICS = {
  personalityTraits: [
    "I idolize a hero of myth and frequently quote their great deeds.",
    "I judge people by their actions, never by their words or titles.",
    "If someone is in trouble, I'm always ready to lend help without hesitation.",
    "I'm always calm, no matter the situation. I never raise my voice or lose my temper.",
    "I have a crude sense of humor and love practical jokes.",
    "I face problems head-on. A simple, direct solution is the best path to success.",
    "I'm always taking notes or sketching things I observe on my journey.",
    "I am slow to trust others, but fiercely loyal once someone earns my friendship."
  ],
  ideals: [
    "Respect. All people deserve to be treated with dignity and fairness. (Good)",
    "Freedom. Tyrants must not be allowed to oppress the innocent. (Chaotic)",
    "Tradition. The ancient stories and traditions must be preserved. (Lawful)",
    "Greater Good. My responsibilities are to all people, not to myself. (Good)",
    "Power. Knowledge and power are the keys to true self-mastery. (Neutral)",
    "Independence. When people follow orders blindly, they embrace corruption. (Chaotic)"
  ],
  bonds: [
    "I would do anything to protect the temple, shrine, or village where I was raised.",
    "I owe my life to the mentor who took me in when I was at my lowest point.",
    "My loyalty to my companions is unwavering; I will never leave a friend behind.",
    "An ancient relic or heirloom of my family was stolen, and I seek to recover it.",
    "Everything I do is to make my hometown and family proud of my achievements.",
    "I strive to right a terrible wrong from my past that haunts my memory."
  ],
  flaws: [
    "I judge others harshly, and myself even more severely.",
    "I have trouble keeping secrets and tend to speak before thinking.",
    "The tyrant who wronged my family still walks free, and my desire for revenge blinds me.",
    "I am easily distracted by the promise of forgotten lore or hidden treasure.",
    "I find it hard to resist boasting about my accomplishments in taverns.",
    "Once I pick a goal, I become obsessed with it to the detriment of everything else."
  ]
}

function cleanRowText(val) {
  if (!val) return ''
  if (Array.isArray(val)) {
    // If it's a 2-col row [ "1", "text" ]
    const textItem = val.length > 1 ? val[1] : val[0]
    return cleanRowText(textItem)
  }
  if (typeof val === 'object') {
    if (val.entries) return clean5eToolsMarkup(val.entries.join(' '))
    if (val.text) return clean5eToolsMarkup(val.text)
    return JSON.stringify(val)
  }
  return clean5eToolsMarkup(String(val)).trim()
}

/**
 * Extracts personality traits, ideals, bonds, and flaws tables from a background object
 */
export function extractBackgroundCharacteristicsTables(bgObj) {
  const result = {
    personalityTraits: [],
    ideals: [],
    bonds: [],
    flaws: []
  }

  if (!bgObj) {
    return {
      personalityTraits: [...FALLBACK_CHARACTERISTICS.personalityTraits],
      ideals: [...FALLBACK_CHARACTERISTICS.ideals],
      bonds: [...FALLBACK_CHARACTERISTICS.bonds],
      flaws: [...FALLBACK_CHARACTERISTICS.flaws]
    }
  }

  function searchEntries(entries) {
    if (!Array.isArray(entries)) return

    for (const entry of entries) {
      if (entry && typeof entry === 'object') {
        if (entry.type === 'table' && Array.isArray(entry.rows)) {
          const caption = (entry.caption || '').toLowerCase()
          const colLabels = Array.isArray(entry.colLabels)
            ? entry.colLabels.map(c => String(c).toLowerCase()).join(' ')
            : ''
          const combinedHeader = caption + ' ' + colLabels

          const rowsTexts = entry.rows.map(cleanRowText).filter(Boolean)

          if (combinedHeader.includes('personality') || combinedHeader.includes('trait')) {
            result.personalityTraits.push(...rowsTexts)
          } else if (combinedHeader.includes('ideal')) {
            result.ideals.push(...rowsTexts)
          } else if (combinedHeader.includes('bond')) {
            result.bonds.push(...rowsTexts)
          } else if (combinedHeader.includes('flaw')) {
            result.flaws.push(...rowsTexts)
          }
        }

        if (Array.isArray(entry.entries)) {
          searchEntries(entry.entries)
        }
      }
    }
  }

  if (Array.isArray(bgObj.entries)) {
    searchEntries(bgObj.entries)
  }

  // Fallback to defaults if specific table was missing
  return {
    personalityTraits: result.personalityTraits.length ? result.personalityTraits : [...FALLBACK_CHARACTERISTICS.personalityTraits],
    ideals: result.ideals.length ? result.ideals : [...FALLBACK_CHARACTERISTICS.ideals],
    bonds: result.bonds.length ? result.bonds : [...FALLBACK_CHARACTERISTICS.bonds],
    flaws: result.flaws.length ? result.flaws : [...FALLBACK_CHARACTERISTICS.flaws]
  }
}

/**
 * Randomly pick one from an array of table options
 */
export function rollFromTable(items) {
  if (!Array.isArray(items) || items.length === 0) return ''
  const index = Math.floor(Math.random() * items.length)
  return items[index]
}
