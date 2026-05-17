<script setup lang="ts">
import { useGameStore } from '../stores/gameStore'

const game = useGameStore()
</script>

<template>
  <div class="flex flex-col gap-2">
    <button
      @click="game.newGame()"
      class="rounded-lg bg-amber-600/80 px-4 py-2 text-sm font-semibold text-white
             hover:bg-amber-500/90 active:scale-[0.97] backdrop-blur transition-all"
    >
      新游戏
    </button>
    <button
      @click="game.resign()"
      :disabled="game.phase === 'gameover'"
      class="rounded-lg bg-red-700/60 px-4 py-2 text-sm font-semibold text-white
             hover:bg-red-600/80 active:scale-[0.97] backdrop-blur transition-all
             disabled:opacity-40 disabled:cursor-not-allowed"
    >
      认输
    </button>
  </div>
</template>
