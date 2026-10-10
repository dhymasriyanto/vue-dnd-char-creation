import { nextTick } from 'vue'
import axios from 'axios'

export function useFormHydration({
  API_URL,
  selectedEdition,
  characterStore,
  currentTab,
  selectedSources,
  characterName,
  alignment,
  classLevel,
  characterBackground,
  imageUrl,
  characteristics,
  userEquipmentList,
  equipmentChoiceMode,
  savedTreasure,
  customStartingGold,
  fetchCompendiumData,
  availableFeats,
  backgrounds,
  selectedBackgroundObj,
  bgLangConfig,
  bgChosenLanguages,
  bgSkillConfig,
  chosenBgSkills,
  bgToolConfig,
  chosenBgTools,
  race,
  characterRace,
  subRace,
  characterSubRace,
  raceLangConfig,
  raceChosenLanguages,
  raceChoiceConfig,
  raceChooseStats,
  classSelected,
  characterClass,
  subClass,
  availableSubClasses,
  onSubClassSelect,
  priorGrantedSkills,
  classSkillConfig,
  chosenClassSkills,
  expertiseConfig,
  chosenExpertiseSkills,
  classToolConfig,
  chosenClassTools,
  detectedFeatSpellSources,
  isSpellcasterClass,
  getEstimatedClassCantrips,
  featChosenSpells,
  chosenSpells,
  selectedSubClassItem,
  multiclasses,
  onMcClassChange,
  onMcSubclassSelect,
  getMcSkillConfig,
  parseBackgroundDetails,
  allUnlockedAsiList,
  asiTierChoices,
  bgEligibleAbilities,
  asi2024Plus2,
  asi2024Plus1,
  scoreMethod,
  baseScores,
  asiBonuses,
  ABILITY_KEYS
}) {
  const loadCharacterForEdit = async (data) => {
    if (!data) return
    const ed = data.edition || '2024'
    selectedEdition.value = ed
    characterStore.edition = ed
    currentTab.value = 'class'

    const defaultSource = ed === '2024' ? 'XPHB' : 'PHB'
    const sourcesToEnable = new Set([defaultSource])
    if (data.race?.source) sourcesToEnable.add(data.race.source.toUpperCase())
    if (data.sub_race?.source) sourcesToEnable.add(data.sub_race.source.toUpperCase())
    const cObj = Array.isArray(data.class) ? data.class[0] : data.class
    if (cObj?.source) sourcesToEnable.add(cObj.source.toUpperCase())
    const scObj = Array.isArray(data.sub_class) ? data.sub_class[0] : data.sub_class
    if (scObj?.source) sourcesToEnable.add(scObj.source.toUpperCase())
    if (Array.isArray(data.feat)) {
      for (const f of data.feat) {
        if (f?.source) sourcesToEnable.add(f.source.toUpperCase())
      }
    }
    selectedSources.value = [...sourcesToEnable]

    characterName.value = data.name || ''
    alignment.value = data.alignment || ''
    classLevel.value = Number(data.level || 1)
    characterBackground.value = data.background || ''
    imageUrl.value = data.image_url || ''

    if (data.characteristics) {
      let ch = data.characteristics
      if (typeof ch === 'string') {
        try { ch = JSON.parse(ch) } catch (e) { ch = {} }
      }
      characteristics.gender = ch.gender || ''
      characteristics.eyes = ch.eyes || ''
      characteristics.size = ch.size || ''
      characteristics.height = ch.height || ''
      characteristics.faith = ch.faith || ''
      characteristics.hair = ch.hair || ''
      characteristics.skin = ch.skin || ''
      characteristics.age = ch.age || ''
      characteristics.weight = ch.weight || ''
      characteristics.lifestyle = ch.lifestyle || 'Modest'
      characteristics.appearance = ch.appearance || ''
      characteristics.personalityTraits = Array.isArray(ch.personalityTraits) ? [...ch.personalityTraits] : (Array.isArray(ch.personality_traits) ? [...ch.personality_traits] : [])
      characteristics.ideals = Array.isArray(ch.ideals) ? [...ch.ideals] : []
      characteristics.bonds = Array.isArray(ch.bonds) ? [...ch.bonds] : []
      characteristics.flaws = Array.isArray(ch.flaws) ? [...ch.flaws] : []
      characteristics.notes = {
        organizations: ch.notes?.organizations || '',
        allies: ch.notes?.allies || '',
        enemies: ch.notes?.enemies || '',
        backstory: ch.notes?.backstory || '',
        other: ch.notes?.other || ''
      }
    } else {
      characteristics.gender = ''
      characteristics.eyes = ''
      characteristics.size = ''
      characteristics.height = ''
      characteristics.faith = ''
      characteristics.hair = ''
      characteristics.skin = ''
      characteristics.age = ''
      characteristics.weight = ''
      characteristics.lifestyle = 'Modest'
      characteristics.appearance = ''
      characteristics.personalityTraits = []
      characteristics.ideals = []
      characteristics.bonds = []
      characteristics.flaws = []
      characteristics.notes = {
        organizations: '',
        allies: '',
        enemies: '',
        backstory: '',
        other: ''
      }
    }

    // Equipment
    const eqList = data.equipment || data.equipments || []
    if (Array.isArray(eqList) && eqList.length > 0) {
      userEquipmentList.value = JSON.parse(JSON.stringify(eqList))
      equipmentChoiceMode.value = 'package'
    }

    // Currency
    const tr = data.treasure || {}
    savedTreasure.pp = Number(tr.pp || 0)
    savedTreasure.gp = Number(tr.gp != null ? tr.gp : 50)
    savedTreasure.ep = Number(tr.ep || 0)
    savedTreasure.sp = Number(tr.sp || 0)
    savedTreasure.cp = Number(tr.cp || 0)
    customStartingGold.value = savedTreasure.gp

    // Fetch compendium lists
    await fetchCompendiumData()

    // ponytail: ensure saved feat sources are loaded so filteredFeats retains them
    const rawFeats = Array.isArray(data.feats) ? data.feats : (Array.isArray(data.feat) ? data.feat : (data.feat ? [data.feat] : (data.feats ? [data.feats] : [])))
    const initialSavedFeats = rawFeats.map(f => (typeof f === 'string' ? f : f?.name)).filter(Boolean)
    for (const sf of initialSavedFeats) {
      const match = availableFeats.value.find(af => af.name?.toLowerCase().trim() === sf.toLowerCase().trim())
      if (match?.source) {
        const s = match.source.toUpperCase()
        if (!selectedSources.value.includes(s)) {
          selectedSources.value.push(s)
        }
      }
    }

    // Match background
    if (data.background) {
      const bgMatch = backgrounds.value.find(b =>
        b.name?.toLowerCase() === data.background.toLowerCase() &&
        (b.source || '').toUpperCase() === defaultSource
      ) || backgrounds.value.find(b =>
        b.name?.toLowerCase() === data.background.toLowerCase() &&
        selectedSources.value.includes((b.source || '').toUpperCase())
      ) || backgrounds.value.find(b => b.name?.toLowerCase() === data.background.toLowerCase())
      if (bgMatch) {
        selectedBackgroundObj.value = bgMatch
        if (bgMatch.source) {
          const s = bgMatch.source.toUpperCase()
          if (!selectedSources.value.includes(s)) selectedSources.value.push(s)
        }
      }
    }

    const savedLanguages = (data.language || []).map(l => (typeof l === 'string' ? l : l.name)).filter(Boolean)
    const savedProfs = (data.proficiency || []).map(p => (typeof p === 'string' ? p : p.name)).filter(Boolean)
    const spRow = data.skill_proficiency || {}
    const profSkillKeys = Object.keys(spRow).filter(k => spRow[k] === true)

    // Populate background choices
    if (bgLangConfig.value.choiceCount > 0) {
      const candidateBgLangs = savedLanguages.filter(l =>
        !bgLangConfig.value.fixed.some(f => f.toLowerCase() === l.toLowerCase())
      )
      bgChosenLanguages.value = candidateBgLangs.slice(0, bgLangConfig.value.choiceCount)
    }

    if (bgSkillConfig.value.count > 0) {
      const matchedBgSkills = (bgSkillConfig.value.options || []).filter(sk => profSkillKeys.includes(sk))
      chosenBgSkills.value = matchedBgSkills.slice(0, bgSkillConfig.value.count)
    }

    if (bgToolConfig.value.count > 0) {
      const matchedBgTools = (bgToolConfig.value.options || []).filter(opt =>
        savedProfs.some(sp => sp.toLowerCase() === opt.toLowerCase())
      )
      chosenBgTools.value = matchedBgTools.slice(0, bgToolConfig.value.count)
    }

    // Match race
    if (data.race?.name) {
      const rList = Array.isArray(race.value) ? race.value : Object.values(race.value || {})
      const rMatch = rList.find(r => r.name?.toLowerCase() === data.race.name.toLowerCase())
      if (rMatch) {
        characterRace.value = rMatch
        try {
          const res = await axios.get(`${API_URL}/sub-race/${rMatch.name}/${rMatch.source}?edition=${selectedEdition.value}`)
          subRace.value = Array.isArray(res.data?.data) ? res.data.data : []
        } catch (err) {
          console.error(err)
          subRace.value = []
        }

        if (data.sub_race?.name) {
          const srMatch = subRace.value.find(sr => sr.name?.toLowerCase() === data.sub_race.name.toLowerCase())
          if (srMatch) {
            const s = (srMatch.source || defaultSource).toUpperCase()
            if (!selectedSources.value.includes(s)) {
              selectedSources.value.push(s)
            }
            characterSubRace.value = srMatch
          }
        }

        if (raceLangConfig.value.choiceCount > 0) {
          const alreadyClaimedLangs = [
            ...bgLangConfig.value.fixed,
            ...bgChosenLanguages.value,
            ...raceLangConfig.value.fixed
          ]
          const remainingLangs = savedLanguages.filter(l =>
            !alreadyClaimedLangs.some(c => c.toLowerCase() === l.toLowerCase())
          )
          raceChosenLanguages.value = remainingLangs.slice(0, raceLangConfig.value.choiceCount)
        }

        if (raceChoiceConfig.value && raceChoiceConfig.value.count > 0) {
          const absData = data.ability_score || {}
          const sortedFrom = [...raceChoiceConfig.value.from].sort((a, b) => (Number(absData[b] || 10)) - (Number(absData[a] || 10)))
          raceChooseStats.value = sortedFrom.slice(0, raceChoiceConfig.value.count)
        }
      }
    }

    // Match class
    if (cObj?.name) {
      const cName = cObj.name.toLowerCase()
      classSelected.value = cName
      try {
        const response = await axios.get(`${API_URL}/class/${cName}?edition=${selectedEdition.value}`)
        if (response.data?.data?.class?.length) {
          characterClass.value.class = response.data.data.class[0]
          characterClass.value.classFeature = response.data.data.classFeature || []
          const directSubclasses = response.data.data.subclass || response.data.data.subClass || []
          if (directSubclasses.length > 0) {
            subClass.value = directSubclasses
            characterStore.subClassLists = directSubclasses
          }
          const c = response.data.data.class[0]
          if (c?.name && c?.source) {
            const scRes = await axios.get(`${API_URL}/sub-class/${c.name.toLowerCase()}/${c.source.toLowerCase()}?edition=${selectedEdition.value}`)
            const scList = scRes.data?.data?.subClass || scRes.data?.data?.subclass || []
            if (scList.length > 0) {
              subClass.value = scList
              characterStore.subClassLists = scList
            }
          }
        }
      } catch (err) {
        console.error('Failed to load class for edit', err)
      }

      // Match subclass
      if (scObj?.name) {
        const scName = scObj.name.toLowerCase()
        const matchSc = availableSubClasses.value.find(s => s.name?.toLowerCase() === scName && (scObj.source ? s.source?.toLowerCase() === scObj.source.toLowerCase() : true)) || availableSubClasses.value.find(s => s.name?.toLowerCase() === scName)
        if (matchSc) {
          const s = (matchSc.source || defaultSource).toUpperCase()
          if (!selectedSources.value.includes(s)) {
            selectedSources.value.push(s)
          }
          await onSubClassSelect(`${matchSc.name}|${matchSc.source}`)
        }
      }

      // Class skills
      const prior = priorGrantedSkills.value
      const availableForClass = (classSkillConfig.value.from || []).filter(k => !prior.includes(k))
      const matchedClassSkills = availableForClass.filter(k => spRow[k] === true)
      chosenClassSkills.value = matchedClassSkills.slice(0, classSkillConfig.value.count)

      // Expertises
      const seRow = data.skill_expertise || {}
      const expSkillKeys = Object.keys(seRow).filter(k => seRow[k] === true)
      if (expertiseConfig.value.count > 0) {
        chosenExpertiseSkills.value = expSkillKeys.slice(0, expertiseConfig.value.count)
      }

      // Class Tools
      if (classToolConfig.value.count > 0) {
        const matchedClassTools = (classToolConfig.value.options || []).filter(opt =>
          savedProfs.some(sp => sp.toLowerCase() === opt.toLowerCase()) &&
          !chosenBgTools.value.some(bt => bt.toLowerCase() === opt.toLowerCase())
        )
        chosenClassTools.value = matchedClassTools.slice(0, classToolConfig.value.count)
      }

      // Spells
      const spList = data.spells || data.character_spells || []
      if (Array.isArray(spList) && spList.length > 0) {
        const normalizedSpList = spList.map(s => ({
          ...s,
          sourceFeat: s.sourceFeat || s.source_feat || null,
          is_feat_spell: Boolean(s.is_feat_spell || s.source_feat || s.sourceFeat)
        }))

        let featSps = normalizedSpList.filter(s => s.sourceFeat || s.is_feat_spell)
        let classSps = normalizedSpList.filter(s => !s.sourceFeat && !s.is_feat_spell)

        // Fallback for legacy saved characters where source_feat was not persisted:
        if (featSps.length === 0 && detectedFeatSpellSources.value.length > 0) {
          const remainingClassSps = [...classSps]
          const recoveredFeatSps = []

          for (const fSrc of detectedFeatSpellSources.value) {
            const cfg = fSrc.config
            if (!cfg) continue

            // 1. Recover fixed spells
            if (Array.isArray(cfg.fixed)) {
              for (const fixedName of cfg.fixed) {
                const idx = remainingClassSps.findIndex(s => s.name && s.name.toLowerCase() === fixedName.toLowerCase())
                if (idx !== -1) {
                  recoveredFeatSps.push({ ...remainingClassSps[idx], sourceFeat: fSrc.featName, is_feat_spell: true })
                  remainingClassSps.splice(idx, 1)
                }
              }
            }

            // 2. Recover cantrips
            const featCantripsNeeded = Number(cfg.cantrips || 0)
            if (featCantripsNeeded > 0) {
              const classMaxCantrips = typeof getEstimatedClassCantrips === 'function'
                ? getEstimatedClassCantrips(classSelected.value, selectedSubClassItem.value?.name, classLevel.value)
                : 0
              const cantripsInList = remainingClassSps.filter(s => Number(s.level) === 0 || s.is_cantrip)
              const excessCantrips = isSpellcasterClass.value ? Math.max(0, cantripsInList.length - classMaxCantrips) : cantripsInList.length
              const countToTake = Math.min(featCantripsNeeded, excessCantrips > 0 ? excessCantrips : (!isSpellcasterClass.value ? featCantripsNeeded : 0))

              let taken = 0
              for (let i = remainingClassSps.length - 1; i >= 0 && taken < countToTake; i--) {
                const s = remainingClassSps[i]
                if (Number(s.level) === 0 || s.is_cantrip) {
                  recoveredFeatSps.push({ ...s, sourceFeat: fSrc.featName, is_feat_spell: true })
                  remainingClassSps.splice(i, 1)
                  taken++
                }
              }
            }

            // 3. Recover 1st-level spells
            const featSpellsNeeded = Number(cfg.spells || 0)
            if (featSpellsNeeded > 0) {
              let taken = 0
              for (let i = remainingClassSps.length - 1; i >= 0 && taken < featSpellsNeeded; i--) {
                const s = remainingClassSps[i]
                if (Number(s.level) === 1 && !s.is_cantrip) {
                  recoveredFeatSps.push({ ...s, sourceFeat: fSrc.featName, is_feat_spell: true })
                  remainingClassSps.splice(i, 1)
                  taken++
                }
              }
            }
          }

          if (recoveredFeatSps.length > 0) {
            featSps = recoveredFeatSps
            classSps = remainingClassSps
          }
        }

        if (featSps.length > 0) {
          featChosenSpells.value = JSON.parse(JSON.stringify(featSps))
          chosenSpells.value = JSON.parse(JSON.stringify(classSps))
        } else if (!isSpellcasterClass.value && spList.length > 0) {
          featChosenSpells.value = JSON.parse(JSON.stringify(spList))
          chosenSpells.value = []
        } else {
          chosenSpells.value = JSON.parse(JSON.stringify(spList))
          featChosenSpells.value = []
        }
      } else {
        chosenSpells.value = []
        featChosenSpells.value = []
      }
    }

    // Handle Multiclass hydration
    const rawClasses = Array.isArray(data.class) ? data.class : (data.class ? [data.class] : [])
    const rawSubClasses = Array.isArray(data.sub_class) ? data.sub_class : (data.sub_class ? [data.sub_class] : [])

    multiclasses.value = []
    if (rawClasses.length > 1) {
      for (let i = 1; i < rawClasses.length; i++) {
        const secClass = rawClasses[i]
        const secSub = rawSubClasses[i]
        const mcItem = {
          id: 'mc_' + Date.now() + '_' + i,
          classSelected: (secClass.name || '').toLowerCase(),
          classLevel: Number(secClass.level) || 1,
          characterClass: { class: null, classFeature: [] },
          subClassLists: [],
          selectedSubClassKey: '',
          selectedSubClassItem: null,
          asiTierChoices: {},
          chosenSpells: [],
          chosenSkills: [],
          classSubTab: 'features',
          isCollapsed: false
        }
        multiclasses.value.push(mcItem)
        if (mcItem.classSelected && typeof onMcClassChange === 'function') {
          await onMcClassChange(mcItem)
          if (secSub?.name && typeof onMcSubclassSelect === 'function') {
            const matchSc = (mcItem.subClassLists || []).find(s => s.name?.toLowerCase() === secSub.name?.toLowerCase())
            if (matchSc) {
              await onMcSubclassSelect(mcItem, `${matchSc.name}|${matchSc.source || ''}`)
            }
          }
          if (typeof getMcSkillConfig === 'function') {
            const mcCfg = getMcSkillConfig(mcItem)
            if (mcCfg?.count > 0) {
              const taken = new Set([...priorGrantedSkills.value, ...chosenClassSkills.value])
              const mcMatched = (mcCfg.from || []).filter(k => spRow[k] === true && !taken.has(k))
              mcItem.chosenSkills = mcMatched.slice(0, mcCfg.count)
            }
          }
        }
      }
    }

    // Feats & ASI Tiers
    await nextTick()
    const savedFeats = (rawFeats || []).map(f => (typeof f === 'string' ? f : f?.name)).filter(Boolean)
    const nonBgFeats = [...savedFeats]
    const bgDetails = typeof parseBackgroundDetails === 'function' ? parseBackgroundDetails(selectedBackgroundObj.value) || {} : {}
    if (bgDetails.featName) {
      const bgFeatIdx = nonBgFeats.findIndex(f => f.toLowerCase().trim() === bgDetails.featName.toLowerCase().trim())
      if (bgFeatIdx >= 0) {
        nonBgFeats.splice(bgFeatIdx, 1)
      }
    }

    let featIdx = 0
    for (const item of allUnlockedAsiList.value) {
      if (featIdx < nonBgFeats.length) {
        const rawName = nonBgFeats[featIdx++]
        const match = availableFeats.value.find(af => af.name?.toLowerCase().trim() === rawName.toLowerCase().trim())
        const exactName = match ? match.name : rawName.trim()
        item.choice.type = 'feat'
        item.choice.featName = exactName
        if (item.classKey === 'primary' && item.tier) {
          if (!asiTierChoices[item.tier]) {
            asiTierChoices[item.tier] = {
              type: 'feat',
              asiMode: '+2',
              plus2Stat: '',
              plus1StatA: '',
              plus1StatB: '',
              featName: exactName,
              featAbility: ''
            }
          } else {
            asiTierChoices[item.tier].type = 'feat'
            asiTierChoices[item.tier].featName = exactName
          }
        }
      } else {
        item.choice.type = ''
        item.choice.plus2Stat = ''
        item.choice.plus1StatA = ''
        item.choice.plus1StatB = ''
        item.choice.featName = ''
      }
    }

    // 2024 ASI from Background
    if (ed === '2024') {
      const absData = data.ability_score || {}
      const eligible = [...bgEligibleAbilities.value]
      if (eligible.length >= 2) {
        eligible.sort((a, b) => (Number(absData[b] || 10)) - (Number(absData[a] || 10)))
        asi2024Plus2.value = eligible[0]
        asi2024Plus1.value = eligible[1]
      }
    }

    // Ability Scores
    const abs = data.ability_score || {}
    scoreMethod.value = 'manual'
    for (const k of ABILITY_KEYS) {
      const savedVal = Number(abs[k] != null ? abs[k] : 10)
      const bonus = asiBonuses.value[k] || 0
      baseScores[k] = Math.max(1, savedVal - bonus)
    }
  }

  return {
    loadCharacterForEdit
  }
}
