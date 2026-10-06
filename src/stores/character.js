import {defineStore} from "pinia";
import {ref} from "vue";

export const useCharacterStore = defineStore('character', () => {
	const edition = ref('2024')
	const subClassLists = ref({})
	const characterSubClass = ref({})
	const isSubClassSelected = ref(false)
	const subClassLevelGained = ref(0)

	return {edition, subClassLists, characterSubClass, isSubClassSelected, subClassLevelGained}
})

