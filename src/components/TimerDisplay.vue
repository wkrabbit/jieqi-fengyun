<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/gameStore'

const game = useGameStore()

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

const redGameDisplay = computed(() => fmt(game.redGameTime))
const blackGameDisplay = computed(() => fmt(game.blackGameTime))
const redMoveDisplay = computed(() => fmt(game.redMoveTime))
const blackMoveDisplay = computed(() => fmt(game.blackMoveTime))

const isRedTurn = computed(() => game.currentTurn === 'r')
const isBlackTurn = computed(() => game.currentTurn === 'b')

const redGameUrgent = computed(() => game.redGameTime <= 60 && isRedTurn.value)
const blackGameUrgent = computed(() => game.blackGameTime <= 60 && isBlackTurn.value)
const redMoveUrgent = computed(() => game.redMoveTime <= 15 && isRedTurn.value)
const blackMoveUrgent = computed(() => game.blackMoveTime <= 15 && isBlackTurn.value)
</script>

<template>
  <div class="flex flex-col gap-2 text-sm font-mono select-none">
    <!-- Red timers -->
    <div class="flex gap-1">
      <div
        :class="[
          'flex-1 rounded-lg px-2 py-1.5 text-center transition-colors',
          isRedTurn
            ? redGameUrgent
              ? 'bg-red-800/80 text-red-100 ring-1 ring-red-400/50'
              : 'bg-red-900/60 text-red-100 ring-1 ring-red-500/30'
            : 'bg-stone-700/40 text-stone-400'
        ]"
      >
        <div class="text-[9px] opacity-60">红方局时</div>
        <div class="text-sm font-bold tracking-wider">{{ redGameDisplay }}</div>
      </div>
      <div
        :class="[
          'flex-1 rounded-lg px-2 py-1.5 text-center transition-colors',
          isRedTurn
            ? redMoveUrgent
              ? 'bg-red-800/80 text-red-100 ring-1 ring-red-400/50'
              : 'bg-red-900/60 text-red-100 ring-1 ring-red-500/30'
            : 'bg-stone-700/40 text-stone-400'
        ]"
      >
        <div class="text-[9px] opacity-60">步时</div>
        <div class="text-sm font-bold tracking-wider">{{ redMoveDisplay }}</div>
      </div>
    </div>

    <!-- Black timers -->
    <div class="flex gap-1">
      <div
        :class="[
          'flex-1 rounded-lg px-2 py-1.5 text-center transition-colors',
          isBlackTurn
            ? blackGameUrgent
              ? 'bg-red-800/80 text-red-100 ring-1 ring-red-400/50'
              : 'bg-gray-800/80 text-gray-100 ring-1 ring-gray-500/30'
            : 'bg-stone-700/40 text-stone-400'
        ]"
      >
        <div class="text-[9px] opacity-60">黑方局时</div>
        <div class="text-sm font-bold tracking-wider">{{ blackGameDisplay }}</div>
      </div>
      <div
        :class="[
          'flex-1 rounded-lg px-2 py-1.5 text-center transition-colors',
          isBlackTurn
            ? blackMoveUrgent
              ? 'bg-red-800/80 text-red-100 ring-1 ring-red-400/50'
              : 'bg-gray-800/80 text-gray-100 ring-1 ring-gray-500/30'
            : 'bg-stone-700/40 text-stone-400'
        ]"
      >
        <div class="text-[9px] opacity-60">步时</div>
        <div class="text-sm font-bold tracking-wider">{{ blackMoveDisplay }}</div>
      </div>
    </div>
  </div>
</template>
