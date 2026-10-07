import { createApp } from 'vue'
import { createPinia } from 'pinia'
import vSelect from 'vue-select'
import 'vue-select/dist/vue-select.css'
import './style.css'
import App from './App.vue'

const app = createApp(App)
app.component('v-select', vSelect)
app.use(createPinia())
app.mount('#app')
