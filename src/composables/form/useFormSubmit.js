import { ref } from 'vue'
import axios from 'axios'

export function useFormSubmit({
  API_URL,
  props,
  emit,
  characterName,
  activeSteps,
  currentTab,
  validateStep,
  scrollToFirstError,
  errors,
  selectedBackgroundObj,
  parseBackgroundDetails,
  ALL_SKILLS,
  allProficientSkills,
  chosenExpertiseSkills,
  allUnlockedAsiList,
  characterClass,
  classSelected,
  classLevel,
  selectedSubClassItem,
  characterSubClass,
  characterStore,
  chosenSpells,
  multiclasses,
  featChosenSpells,
  selectedEdition,
  imageUrl,
  alignment,
  characteristics,
  characterBackground,
  totalCharacterLevel,
  computedProficiencyBonus,
  characterRace,
  characterSubRace,
  strength,
  dexterity,
  constitution,
  intelligence,
  wisdom,
  charisma,
  allLanguagesList,
  allProficienciesList,
  userEquipmentList,
  computedTreasures,
  isEditMode
}) {
  const isSubmitting = ref(false)

  const submitForm = async () => {
    if (!characterName.value.trim()) {
      errors.characterName = 'Please enter character name'
      scrollToFirstError()
      return
    }

    // Validate all steps
    for (const step of activeSteps.value) {
      if (!validateStep(step.id, false)) {
        currentTab.value = step.id
        scrollToFirstError()
        return
      }
    }

    isSubmitting.value = true

    try {
      const bgDetails = parseBackgroundDetails(selectedBackgroundObj.value) || {}

      const skillObj = {}
      for (const sk of ALL_SKILLS) {
        skillObj[sk.key] = allProficientSkills.value.includes(sk.key)
      }

      const expertiseObj = {}
      for (const sk of ALL_SKILLS) {
        expertiseObj[sk.key] = chosenExpertiseSkills.value.includes(sk.key)
      }

      const allChosenFeats = []
      if (bgDetails.featName) allChosenFeats.push(bgDetails.featName)
      for (const item of allUnlockedAsiList.value) {
        const ch = item.choice
        if (ch && ch.type === 'feat' && ch.featName) {
          allChosenFeats.push(ch.featName)
        }
      }

      const classesPayload = [
        {
          name: characterClass.value.class?.name || classSelected.value,
          level: Number(classLevel.value),
          class: characterClass.value,
          sub_class: selectedSubClassItem.value ? {
            ...selectedSubClassItem.value,
            subClassFeature: selectedSubClassItem.value.subClassFeature?.length
              ? selectedSubClassItem.value.subClassFeature
              : (characterSubClass.value?.subClassFeature || characterStore.characterSubClass?.subClassFeature || [])
          } : (characterStore.characterSubClass || null),
          spells: (chosenSpells.value || []).map(s => ({
            ...s,
            is_feat_spell: false,
            source_feat: null,
            sourceFeat: null
          }))
        }
      ]

      for (const mc of multiclasses.value) {
        if (mc.classSelected) {
          classesPayload.push({
            name: mc.characterClass?.class?.name || mc.classSelected,
            level: Number(mc.classLevel) || 1,
            class: mc.characterClass,
            sub_class: mc.selectedSubClassItem || null,
            spells: (mc.chosenSpells || []).map(s => ({
              ...s,
              is_feat_spell: false,
              source_feat: null,
              sourceFeat: null
            }))
          })
        }
      }

      const preparedFeatSpells = (featChosenSpells.value || []).map(s => ({
        ...s,
        sourceFeat: s.sourceFeat || s.source_feat || 'Feat',
        source_feat: s.source_feat || s.sourceFeat || 'Feat',
        is_feat_spell: true
      }))

      const allSpells = [
        ...(chosenSpells.value || []).map(s => ({
          ...s,
          is_feat_spell: false,
          source_feat: null,
          sourceFeat: null
        })),
        ...multiclasses.value.flatMap(mc => (mc.chosenSpells || []).map(s => ({
          ...s,
          is_feat_spell: false,
          source_feat: null,
          sourceFeat: null
        }))),
        ...preparedFeatSpells
      ]

      const payload = {
        edition: selectedEdition.value,
        name: characterName.value,
        image_url: imageUrl.value || null,
        characteristics: {
          alignment: alignment.value || null,
          gender: characteristics.gender || '',
          eyes: characteristics.eyes || '',
          size: characteristics.size || '',
          height: characteristics.height || '',
          faith: characteristics.faith || '',
          hair: characteristics.hair || '',
          skin: characteristics.skin || '',
          age: characteristics.age || '',
          weight: characteristics.weight || '',
          lifestyle: characteristics.lifestyle || 'Modest',
          appearance: characteristics.appearance || '',
          personalityTraits: (characteristics.personalityTraits || []).filter(Boolean),
          ideals: (characteristics.ideals || []).filter(Boolean),
          bonds: (characteristics.bonds || []).filter(Boolean),
          flaws: (characteristics.flaws || []).filter(Boolean),
          notes: {
            organizations: characteristics.notes?.organizations || '',
            allies: characteristics.notes?.allies || '',
            enemies: characteristics.notes?.enemies || '',
            backstory: characteristics.notes?.backstory || '',
            other: characteristics.notes?.other || ''
          }
        },
        background: characterBackground.value,
        alignment: alignment.value,
        level: totalCharacterLevel.value,
        proficiency_bonus: computedProficiencyBonus.value,
        race: characterRace.value,
        sub_race: characterSubRace.value,
        class: characterClass.value,
        sub_class: characterStore.characterSubClass ? {
          ...characterStore.characterSubClass,
          subClassFeature: characterStore.characterSubClass.subClassFeature?.length
            ? characterStore.characterSubClass.subClassFeature
            : (characterSubClass.value?.subClassFeature || selectedSubClassItem.value?.subClassFeature || [])
        } : (selectedSubClassItem.value || null),
        classes: classesPayload,
        strength: strength.value,
        dexterity: dexterity.value,
        constitution: constitution.value,
        intelligence: intelligence.value,
        wisdom: wisdom.value,
        charisma: charisma.value,
        ability_score: {
          strength: strength.value,
          dexterity: dexterity.value,
          constitution: constitution.value,
          intelligence: intelligence.value,
          wisdom: wisdom.value,
          charisma: charisma.value
        },
        skill_proficiencies: skillObj,
        skills: skillObj,
        skill_expertises: expertiseObj,
        expertises: expertiseObj,
        languages: allLanguagesList.value,
        proficiencies: allProficienciesList.value,
        feats: allChosenFeats,
        feat: allChosenFeats[0] || null,
        feature: bgDetails.featureName || null,
        spells: allSpells,
        equipment: userEquipmentList.value || [],
        treasures: computedTreasures.value,
        treasure: computedTreasures.value
      }

      if (isEditMode.value) {
        const updateRes = await axios.put(`${API_URL}/character/${props.characterToEdit.id}`, payload)
        const charKey = updateRes.data?.data?.public_id || props.characterToEdit.public_id || props.characterToEdit.id
        const fullRes = await axios.get(`${API_URL}/character/${charKey}`)
        if (fullRes.data?.data) {
          emit('created', fullRes.data.data)
        } else {
          emit('back')
        }
      } else {
        const res = await axios.post(`${API_URL}/character`, payload)
        const newKey = res.data?.data?.public_id || res.data?.data?.id
        if (newKey) {
          const fullRes = await axios.get(`${API_URL}/character/${newKey}`)
          if (fullRes.data?.data) {
            emit('created', fullRes.data.data)
          }
        } else {
          emit('back')
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to submit character')
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    isSubmitting,
    submitForm
  }
}
