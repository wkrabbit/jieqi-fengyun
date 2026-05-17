<script setup lang="ts">
import { useGameStore } from '../stores/gameStore'
import { computed } from 'vue'

const game = useGameStore()

const turnLabel = computed(() => game.currentTurn === 'r' ? '红方回合' : '黑方回合')
const turnColorClass = computed(() => game.currentTurn === 'r' ? 'text-red-400' : 'text-gray-400')
const bgClass = computed(() => game.currentTurn === 'r' ? 'bg-red-900/30 border-red-500/40' : 'bg-gray-800/40 border-gray-500/30')
</script>

<template>
  <div :class="['rounded-lg border px-4 py-3 text-center backdrop-blur', bgClass]">
    <div :class="['text-lg font-bold', turnColorClass]">{{ turnLabel }}</div>
  </div>
</template>
