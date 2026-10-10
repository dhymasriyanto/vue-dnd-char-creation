import { watch, nextTick } from 'vue'

export function useFormValidation({
  errors,
  activeSteps,
  currentTab,
  currentStepIndex,
  characterName,
  characterRace,
  characterSubRace,
  isSubraceRequired,
  selectedSources,
  selectedEdition,
  raceChosenLanguages,
  raceLangConfig,
  classSelected,
  selectedSubClassKey,
  classLevel,
  isSubclassUnlocked,
  characterStore,
  bgChosenLanguages,
  bgLangConfig,
  alignment,
  selectedBackgroundObj,
  chosenBgSkills,
  bgSkillConfig,
  chosenBgTools,
  bgToolConfig,
  customStartingGold,
  asi2024Plus2,
  asi2024Plus1,
  asi2024Mode,
  pointBuyRemaining,
  characterSubClass,
  multiclasses,
  allUnlockedAsiList,
  classSubTab,
  filteredClasses,
  characterClass,
  subRace,
  subClass,
  scoreMethod,
  baseScores,
  chosenClassSkills,
  classSkillConfig,
  chosenExpertiseSkills,
  expertiseConfig,
  allProficientSkills,
  chosenClassTools,
  classToolConfig,
  chosenSpells,
  featChosenSpells,
  equipmentChoiceMode,
  recheckAbilitiesErrors = () => {}
}) {
  // Error clearance watchers
  watch(characterName, (val) => {
    if (val && val.trim()) delete errors.characterName
  })

  watch(characterRace, (val) => {
    if (val && val.name) {
      delete errors.characterRace
      if (!isSubraceRequired.value) {
        delete errors.characterSubRace
      }
    }
  })

  watch(characterSubRace, (val) => {
    if (val && val.name) {
      delete errors.characterSubRace
    } else if (!isSubraceRequired.value) {
      delete errors.characterSubRace
    }
  })

  watch(selectedSources, (newSources) => {
    if (characterSubRace.value && characterSubRace.value.name) {
      const s = (characterSubRace.value.source || (selectedEdition.value === '2024' ? 'XPHB' : 'PHB')).toUpperCase()
      if (!newSources.includes(s)) {
        characterSubRace.value = {}
      }
    }
    if (characterRace.value && characterRace.value.name) {
      const s = (characterRace.value.source || (selectedEdition.value === '2024' ? 'XPHB' : 'PHB')).toUpperCase()
      if (!newSources.includes(s)) {
        characterRace.value = {}
        characterSubRace.value = {}
        subRace.value = []
      }
    }
    if (classSelected.value && filteredClasses.value && !filteredClasses.value[classSelected.value]) {
      classSelected.value = ''
      characterClass.value = {}
      characterSubClass.value = {}
      subClass.value = []
    }
  }, { deep: true })

  watch(raceChosenLanguages, (val) => {
    if (val.filter(Boolean).length >= raceLangConfig.value.choiceCount) {
      delete errors.raceLanguages
    }
  }, { deep: true })

  watch(classSelected, (val) => {
    if (val) delete errors.characterClass
  })

  watch(selectedSubClassKey, (val) => {
    if (val) delete errors.subclass
  })

  watch(classLevel, (lvl) => {
    if (selectedEdition.value === '2024' && lvl < 3) {
      characterStore.characterSubClass = {}
      characterStore.isSubClassSelected = false
      characterStore.subClassLevelGained = 0
      selectedSubClassKey.value = ''
      delete errors.subclass
    } else if (!isSubclassUnlocked.value) {
      delete errors.subclass
    }
  })

  watch(bgChosenLanguages, (val) => {
    if (val.filter(Boolean).length >= bgLangConfig.value.choiceCount) {
      delete errors.bgLanguages
    }
  }, { deep: true })

  watch(alignment, (val) => {
    if (val) delete errors.alignment
  })

  watch(selectedBackgroundObj, (val) => {
    if (val && val.name) delete errors.characterBackground
  })

  watch(chosenBgSkills, (val) => {
    if (val.filter(Boolean).length >= bgSkillConfig.value.count) {
      delete errors.bgSkills
    }
  }, { deep: true })

  watch(chosenBgTools, (val) => {
    if (val.filter(Boolean).length >= bgToolConfig.value.count) {
      delete errors.bgTools
    }
  }, { deep: true })

  watch(customStartingGold, (val) => {
    if (val !== null && val !== undefined && Number(val) >= 0) {
      delete errors.equipmentGold
    }
  })

  watch([asi2024Plus2, asi2024Plus1, asi2024Mode], () => {
    if (selectedEdition.value !== '2024' || asi2024Mode.value !== 'plus2_plus1' || asi2024Plus2.value !== asi2024Plus1.value) {
      delete errors.asi2024
    }
  })

  watch(pointBuyRemaining, (val) => {
    if (val >= 0) delete errors.pointbuy
  })

  watch(() => characterStore.characterSubClass, (val) => {
    characterSubClass.value = val
  })

  const getDynamicErrorFieldOrder = () => {
    const order = [
      'characterName',
      'characterBackground',
      'bgSkills',
      'bgLanguages',
      'bgTools',
      'characterRace',
      'characterSubRace',
      'raceLanguages',
      'characterClass',
      'subclass',
      'classSkills',
      'expertises',
      'classTools'
    ]

    multiclasses.value.forEach((_, idx) => {
      order.push(`class_mc_${idx}`)
      order.push(`skills_mc_${idx}`)
      order.push(`subclass_mc_${idx}`)
      order.push(`classSpells_mc_${idx}`)
    })

    order.push(
      'classSpells',
      'pointbuy',
      'asi2024',
      'abilities',
      'asiTiers'
    )

    allUnlockedAsiList.value.forEach(item => {
      order.push(item.errorKey)
    })

    order.push('equipmentGold')
    return order
  }

  const scrollToFirstError = () => {
    nextTick(() => {
      const hasAsiError = Object.keys(errors).some(k => k.startsWith('asiTier_'))
      if (errors.subclass || errors.classSkills || errors.expertises || errors.classTools || hasAsiError) {
        classSubTab.value = 'features'
      } else if (errors.classSpells) {
        classSubTab.value = 'spells'
      }

      multiclasses.value.forEach((mc, idx) => {
        const hasMcError = Object.keys(errors).some(k => k.includes(`mc_${idx}`))
        if (hasMcError) {
          mc.isCollapsed = false
          if (errors['classSpells_mc_' + idx]) {
            mc.classSubTab = 'spells'
          } else {
            mc.classSubTab = 'features'
          }
        }
      })

      setTimeout(() => {
        const activeOrder = getDynamicErrorFieldOrder()
        let firstKey = activeOrder.find(key => errors[key])
        if (!firstKey) {
          firstKey = Object.keys(errors).find(key => errors[key])
        }
        if (!firstKey) return

        const el = document.querySelector(`[data-error-field="${firstKey}"]`) ||
                   document.getElementById(firstKey) ||
                   document.querySelector('.border-red-500, .ring-red-500, .border-red-400')

        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })

          el.classList.remove('error-pulse-highlight')
          void el.offsetWidth
          el.classList.add('error-pulse-highlight')
          setTimeout(() => {
            el.classList.remove('error-pulse-highlight')
          }, 1600)

          const focusable = el.matches('input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])')
            ? el
            : el.querySelector('input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])')
          if (focusable && typeof focusable.focus === 'function') {
            focusable.focus({ preventScroll: true })
          }
        }
      }, 75)
    })
  }

  const validateStep = (stepId, shouldScroll = true) => {
    if (stepId === 'characteristics') {
      return true
    }
    let isValid = true

    const validateAllAsiTiers = () => {
      let valid = true
      for (const item of allUnlockedAsiList.value) {
        const ch = item.choice
        if (!ch || !ch.type) {
          errors[item.errorKey] = `Please choose Ability Increase or Feat for ${item.className} Level ${item.tier}`
          errors.asiTiers = errors[item.errorKey]
          valid = false
          break
        } else if (ch.type === 'feat' && !ch.featName) {
          errors[item.errorKey] = `Please select a Feat for ${item.className} Level ${item.tier}`
          errors.asiTiers = errors[item.errorKey]
          valid = false
          break
        } else if (ch.type === 'asi') {
          if (ch.asiMode === '+2') {
            if (!ch.plus2Stat) {
              errors[item.errorKey] = `Please select ability to increase (+2) for ${item.className} Level ${item.tier}`
              errors.asiTiers = errors[item.errorKey]
              valid = false
              break
            }
          } else {
            if (!ch.plus1StatA || !ch.plus1StatB) {
              errors[item.errorKey] = `Please select two abilities to increase (+1 each) for ${item.className} Level ${item.tier}`
              errors.asiTiers = errors[item.errorKey]
              valid = false
              break
            } else if (ch.plus1StatA === ch.plus1StatB) {
              errors[item.errorKey] = `Please select two distinct abilities for ${item.className} Level ${item.tier}`
              errors.asiTiers = errors[item.errorKey]
              valid = false
              break
            }
          }
        }
        delete errors[item.errorKey]
      }
      if (valid) {
        delete errors.asiTiers
      }
      return valid
    }

    if (stepId === 'class') {
      if (!classSelected.value) {
        errors.characterClass = 'Please select a Class'
        isValid = false
      } else {
        delete errors.characterClass
      }

      if (isSubclassUnlocked.value && !characterSubClass.value?.name && !selectedSubClassKey.value) {
        errors.subclass = 'Please select a Subclass'
        isValid = false
      } else {
        delete errors.subclass
      }

      const neededClassSkills = classSkillConfig.value.count || 0
      if (chosenClassSkills.value.length < neededClassSkills) {
        errors.classSkills = `Please select ${neededClassSkills} class skill(s) (${chosenClassSkills.value.length}/${neededClassSkills} selected)`
        isValid = false
      } else {
        delete errors.classSkills
      }

      const neededExpertises = Math.min(expertiseConfig.value.count, allProficientSkills.value.length)
      if (neededExpertises > 0 && chosenExpertiseSkills.value.length < neededExpertises) {
        errors.expertises = `Please select ${neededExpertises} expertise skill(s) (${chosenExpertiseSkills.value.length}/${neededExpertises} selected)`
        isValid = false
      } else {
        delete errors.expertises
      }

      const neededClassTools = classToolConfig.value.count || 0
      if (neededClassTools > 0 && chosenClassTools.value.filter(Boolean).length < neededClassTools) {
        errors.classTools = `Please select ${neededClassTools} class tool proficiency`
        isValid = false
      } else {
        delete errors.classTools
      }

      // Multiclass checks
      multiclasses.value.forEach((mc, idx) => {
        if (!mc.classSelected) {
          errors[`class_mc_${idx}`] = 'Please select a multiclass'
          isValid = false
        } else {
          delete errors[`class_mc_${idx}`]
        }
      })

      if (!validateAllAsiTiers()) {
        isValid = false
      }
    }

    if (stepId === 'race') {
      if (!characterRace.value?.name) {
        errors.characterRace = 'Please select a Race'
        isValid = false
      } else {
        delete errors.characterRace
      }

      if (isSubraceRequired.value && !characterSubRace.value?.name) {
        errors.characterSubRace = 'Please select a Subrace / Lineage'
        isValid = false
      } else {
        delete errors.characterSubRace
      }

      const neededRaceLangs = raceLangConfig.value.choiceCount || 0
      if (neededRaceLangs > 0 && raceChosenLanguages.value.filter(Boolean).length < neededRaceLangs) {
        errors.raceLanguages = `Please choose ${neededRaceLangs} additional language(s)`
        isValid = false
      } else {
        delete errors.raceLanguages
      }
    }

    if (stepId === 'background') {
      if (!selectedBackgroundObj.value?.name) {
        errors.characterBackground = 'Please select a Background'
        isValid = false
      } else {
        delete errors.characterBackground
      }

      const neededBgSkills = bgSkillConfig.value.count || 0
      if (neededBgSkills > 0 && chosenBgSkills.value.filter(Boolean).length < neededBgSkills) {
        errors.bgSkills = `Please select ${neededBgSkills} background skill(s)`
        isValid = false
      } else {
        delete errors.bgSkills
      }

      const neededBgLangs = bgLangConfig.value.choiceCount || 0
      if (neededBgLangs > 0 && bgChosenLanguages.value.filter(Boolean).length < neededBgLangs) {
        errors.bgLanguages = `Please select ${neededBgLangs} background language(s)`
        isValid = false
      } else {
        delete errors.bgLanguages
      }

      const neededBgTools = bgToolConfig.value.count || 0
      if (neededBgTools > 0 && chosenBgTools.value.filter(Boolean).length < neededBgTools) {
        errors.bgTools = `Please select ${neededBgTools} background tool(s)`
        isValid = false
      } else {
        delete errors.bgTools
      }
    }

    if (stepId === 'abilities') {
      recheckAbilitiesErrors()
      if (selectedEdition.value === '2024') {
        if (asi2024Mode.value === 'plus2_plus1') {
          if (!asi2024Plus2.value || !asi2024Plus1.value) {
            errors.asi2024 = 'Please assign both +2 and +1 ability score increases'
            isValid = false
          } else if (asi2024Plus2.value === asi2024Plus1.value) {
            errors.asi2024 = 'Please select two different ability scores for +2 and +1'
            isValid = false
          } else {
            delete errors.asi2024
          }
        }
      }

      if (scoreMethod.value === 'pointbuy') {
        if (pointBuyRemaining.value < 0) {
          errors.pointbuy = `You have spent ${-pointBuyRemaining.value} points over the 27 point budget`
          isValid = false
        } else if (pointBuyRemaining.value > 0) {
          errors.pointbuy = `You have ${pointBuyRemaining.value} unspent points remaining`
          isValid = false
        } else {
          delete errors.pointbuy
        }
      }

      if (errors.abilities) {
        isValid = false
      }
    }

    if (stepId === 'equipment') {
      if (equipmentChoiceMode.value === 'gold') {
        if (customStartingGold.value === null || customStartingGold.value === undefined || Number(customStartingGold.value) < 0) {
          errors.equipmentGold = 'Starting gold must be 0 or greater'
          isValid = false
        } else {
          delete errors.equipmentGold
        }
      } else {
        delete errors.equipmentGold
      }
    }

    if (!isValid && shouldScroll) {
      scrollToFirstError()
    }

    return isValid
  }

  const canGoToStep = (targetIdx) => {
    if (targetIdx <= currentStepIndex.value) return true
    for (let i = 0; i < targetIdx; i++) {
      const stepId = activeSteps.value[i].id
      if (!validateStep(stepId, false)) return false
    }
    return true
  }

  const goToStep = (tabId) => {
    const targetIdx = activeSteps.value.findIndex(s => s.id === tabId)
    if (targetIdx === -1 || targetIdx === currentStepIndex.value) return
    if (targetIdx > currentStepIndex.value) {
      for (let i = 0; i < targetIdx; i++) {
        const stepId = activeSteps.value[i].id
        if (!validateStep(stepId, false)) {
          currentTab.value = stepId
          scrollToFirstError()
          return
        }
      }
    }
    currentTab.value = tabId
  }

  const nextStep = () => {
    const curId = activeSteps.value[currentStepIndex.value]?.id
    if (!validateStep(curId)) return
    if (currentStepIndex.value < activeSteps.value.length - 1) {
      currentTab.value = activeSteps.value[currentStepIndex.value + 1].id
    }
  }

  const prevStep = () => {
    if (currentStepIndex.value > 0) {
      currentTab.value = activeSteps.value[currentStepIndex.value - 1].id
    }
  }

  return {
    getDynamicErrorFieldOrder,
    scrollToFirstError,
    validateStep,
    canGoToStep,
    goToStep,
    nextStep,
    prevStep
  }
}
