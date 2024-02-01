import {defineStore} from "pinia";
import {ref} from "vue";

export const useCharacterStore = defineStore('character', () => {
	const subClassLists = ref({})
	const characterSubClass = ref({})

	return {subClassLists, characterSubClass}
})

