import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './style.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')

app.config.errorHandler = (err, _vm, info) => {
  console.error('Vue error:', err, info)
  const el = document.getElementById('app')
  if (el) {
    el.innerHTML = `<div style="color:red;padding:20px;font-family:monospace;">Error: ${String(err)}</div>`
  }
}

