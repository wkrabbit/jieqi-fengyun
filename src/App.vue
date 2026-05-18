<script setup lang="ts">
import { watch } from 'vue'
import { useAuthStore } from './stores/authStore'
import { wsService } from './services/ws'

const auth = useAuthStore()

// Keep WS connected across all pages after login
watch(() => auth.token, (token) => {
  if (token) {
    wsService.connect(token)
  } else {
    wsService.disconnect()
  }
}, { immediate: true })
</script>

<template>
  <router-view />
</template>
