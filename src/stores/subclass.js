import {defineStore} from "pinia";
import {ref} from "vue";

export const useSubClassStore = defineStore('subclass', () => {
	const subClass = ref({})

	return {subClass}
})

