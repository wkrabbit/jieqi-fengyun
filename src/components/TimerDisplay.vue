<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/gameStore'

const game = useGameStore()

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

const gameTimeDisplay = computed(() => fmt(game.gameTime))
const redMoveDisplay = computed(() => fmt(game.redMoveTime))
const blackMoveDisplay = computed(() => fmt(game.blackMoveTime))

const isRedTurn = computed(() => game.currentTurn === 'r')
const isBlackTurn = computed(() => game.currentTurn === 'b')

const redUrgent = computed(() => game.redMoveTime <= 15 && isRedTurn.value)
const blackUrgent = computed(() => game.blackMoveTime <= 15 && isBlackTurn.value)
const gameUrgent = computed(() => game.gameTime <= 60)
</script>

<template>
  <div class="flex flex-col gap-2 text-sm font-mono select-none">
    <!-- Game time -->
    <div
      :class="[
        'rounded-lg px-3 py-1.5 text-center',
        gameUrgent ? 'bg-red-800/60 text-red-200' : 'bg-stone-700/60 text-amber-100'
      ]"
    >
      <div class="text-[10px] opacity-60">局时</div>
      <div class="text-lg font-bold tracking-wider">{{ gameTimeDisplay }}</div>
    </div>

    <!-- Red move time -->
    <div
      :class="[
        'rounded-lg px-3 py-1.5 text-center transition-colors',
        isRedTurn
          ? redUrgent
            ? 'bg-red-800/80 text-red-100 ring-1 ring-red-400/50'
            : 'bg-red-900/60 text-red-100 ring-1 ring-red-500/30'
          : 'bg-stone-700/40 text-stone-400'
      ]"
    >
      <div class="text-[10px] opacity-60">红方步时</div>
      <div class="text-base font-bold tracking-wider">{{ redMoveDisplay }}</div>
    </div>

    <!-- Black move time -->
    <div
      :class="[
        'rounded-lg px-3 py-1.5 text-center transition-colors',
        isBlackTurn
          ? blackUrgent
            ? 'bg-red-800/80 text-red-100 ring-1 ring-red-400/50'
            : 'bg-gray-800/80 text-gray-100 ring-1 ring-gray-500/30'
          : 'bg-stone-700/40 text-stone-400'
      ]"
    >
      <div class="text-[10px] opacity-60">黑方步时</div>
      <div class="text-base font-bold tracking-wider">{{ blackMoveDisplay }}</div>
    </div>
  </div>
</template>
