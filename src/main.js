import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router/index.js'

import './style/variables.css'
import './style/base.css'
import './style/components.css'
import './style/mobile.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
