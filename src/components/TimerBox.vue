<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/gameStore'

const props = defineProps<{ color: 'r' | 'b' }>()
const game = useGameStore()

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

const isMyTurn = computed(() => game.currentTurn === props.color)
const gameTime = computed(() => props.color === 'r' ? game.redGameTime : game.blackGameTime)
const moveTime = computed(() => props.color === 'r' ? game.redMoveTime : game.blackMoveTime)
const gameDisplay = computed(() => fmt(gameTime.value))
const moveDisplay = computed(() => fmt(moveTime.value))
const gameUrgent = computed(() => gameTime.value <= 60 && isMyTurn.value)
const moveUrgent = computed(() => moveTime.value <= 15 && isMyTurn.value)

const isRed = computed(() => props.color === 'r')
</script>

<template>
  <div class="flex gap-1 select-none">
    <div
      :class="[
        'rounded-lg px-2 py-1 text-center transition-colors min-w-[56px]',
        isMyTurn
          ? gameUrgent
            ? 'bg-red-800/80 text-red-100 ring-1 ring-red-400/50'
            : isRed
              ? 'bg-red-900/60 text-red-100 ring-1 ring-red-500/30'
              : 'bg-gray-800/80 text-gray-100 ring-1 ring-gray-500/30'
          : 'bg-stone-700/40 text-stone-400'
      ]"
    >
      <div class="text-[9px] opacity-60">局时</div>
      <div class="text-xs font-bold tracking-wider font-mono">{{ gameDisplay }}</div>
    </div>
    <div
      :class="[
        'rounded-lg px-2 py-1 text-center transition-colors min-w-[56px]',
        isMyTurn
          ? moveUrgent
            ? 'bg-red-800/80 text-red-100 ring-1 ring-red-400/50'
            : isRed
              ? 'bg-red-900/60 text-red-100 ring-1 ring-red-500/30'
              : 'bg-gray-800/80 text-gray-100 ring-1 ring-gray-500/30'
          : 'bg-stone-700/40 text-stone-400'
      ]"
    >
      <div class="text-[9px] opacity-60">步时</div>
      <div class="text-xs font-bold tracking-wider font-mono">{{ moveDisplay }}</div>
    </div>
  </div>
</template>
