<script setup lang="ts">
import TurnIndicator from './TurnIndicator.vue'
import TimerDisplay from './TimerDisplay.vue'
import GameControls from './GameControls.vue'
import ChatPanel from './ChatPanel.vue'
import { useGameStore } from '../stores/gameStore'
import { useAuthStore } from '../stores/authStore'
import { useCheatStore } from '../stores/cheatStore'

const game = useGameStore()
const auth = useAuthStore()
const cheat = useCheatStore()
</script>

<template>
  <div class="flex flex-col gap-4 w-64 px-3 py-4">
    <TurnIndicator />
    <TimerDisplay v-if="game.mode !== 'online'" />
    <GameControls />

    <!-- VIP cheat toggle (only for VIP in online mode) -->
    <div
      v-if="auth.isVip && game.mode === 'online'"
      class="bg-stone-700/40 rounded-lg px-3 py-2"
    >
      <div class="flex items-center justify-between">
        <span class="text-xs text-stone-300">作弊模式</span>
        <button
          @click="cheat.toggle()"
          :class="[
            'w-9 h-5 rounded-full transition-colors relative overflow-hidden',
            cheat.enabled ? 'bg-purple-600' : 'bg-stone-600',
          ]"
        >
          <span
            :class="[
              'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
              cheat.enabled ? 'translate-x-4' : 'translate-x-0',
            ]"
          />
        </button>
      </div>
      <div v-if="cheat.enabled" class="text-[10px] text-purple-300/80 mt-1">
        右键暗棋可自定义
      </div>
    </div>

    <!-- Chat (only for online mode) -->
    <ChatPanel v-if="game.mode === 'online'" />
  </div>
</template>
