<script setup lang="ts">
import { useGameStore } from '../stores/gameStore'

const game = useGameStore()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="game.phase === 'gameover'"
      class="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40"
    >
      <div class="rounded-2xl bg-amber-50/95 shadow-2xl px-10 py-8 text-center min-w-[280px]">
        <div class="text-3xl mb-2">
          {{ game.winner === 'r' ? '🏆' : '🏆' }}
        </div>
        <div :class="['text-2xl font-bold mb-1', game.winner === 'r' ? 'text-red-600' : 'text-gray-800']">
          {{ game.winner === 'r' ? '红方胜利！' : '黑方胜利！' }}
        </div>
        <button
          @click="game.newGame()"
          class="mt-5 rounded-lg bg-amber-600 px-6 py-2 text-white font-semibold
                 hover:bg-amber-500 transition-colors active:scale-[0.97]"
        >
          再来一局
        </button>
      </div>
    </div>
  </Teleport>
</template>
