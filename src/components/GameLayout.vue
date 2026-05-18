<script setup lang="ts">
import { onMounted } from 'vue'
import ChessBoard from './ChessBoard.vue'
import SidePanel from './SidePanel.vue'
import { useGameStore, type CapturedPiece } from '../stores/gameStore'
import { useLobbyStore } from '../stores/lobbyStore'
import { useRouter, useRoute } from 'vue-router'

const game = useGameStore()
const lobby = useLobbyStore()
const router = useRouter()
const route = useRoute()

const isOnlineRoute = !!route.params.code

onMounted(() => {
  // If on online route but not connected, redirect to lobby
  if (isOnlineRoute && !lobby.roomCode) {
    router.replace('/lobby')
  }
})

const PIECE_NAMES_RED: Record<string, string> = {
  king: '帅', advisor: '仕', elephant: '相', horse: '馬', rook: '車', cannon: '炮', pawn: '兵',
}
const PIECE_NAMES_BLACK: Record<string, string> = {
  king: '将', advisor: '士', elephant: '象', horse: '馬', rook: '車', cannon: '砲', pawn: '卒',
}

function pieceLabel(cap: CapturedPiece): string {
  const names = cap.color === 'r' ? PIECE_NAMES_RED : PIECE_NAMES_BLACK
  return names[cap.type] || '?'
}

function backToLobby() {
  lobby.reset()
  router.push('/lobby')
}
</script>

<template>
  <div class="min-h-screen bg-stone-800 flex flex-col items-center justify-center gap-2">
    <!-- Top bar -->
    <div class="flex items-center gap-4 text-sm px-4 w-full max-w-[900px]">
      <span
        v-if="game.mode === 'online'"
        class="text-stone-400"
      >
        房间 <span class="text-amber-300 font-mono font-bold">{{ lobby.roomCode }}</span>
        &middot; 执{{ game.yourColor === 'r' ? '红' : '黑' }}棋
      </span>
      <span
        v-if="game.mode === 'online'"
        :class="game.isMyTurn ? 'text-emerald-400' : 'text-stone-500'"
      >
        {{ game.isMyTurn ? '你的回合' : '对手回合' }}
      </span>
      <span v-else class="text-stone-400">本地对战</span>
      <button
        @click="backToLobby"
        class="text-stone-400 hover:text-stone-200 text-xs transition-colors ml-auto"
      >返回大厅</button>
    </div>

    <!-- Captured pieces row -->
    <div class="flex items-center gap-8 px-4 w-full max-w-[900px]">
      <!-- Black pieces captured (by red) -->
      <div class="flex-1 flex items-center gap-1 flex-wrap">
        <span class="text-[10px] text-stone-500 shrink-0">红方得子:</span>
        <span
          v-for="(cap, i) in game.redCaptured"
          :key="i"
          class="text-xs px-1.5 py-0.5 rounded font-bold bg-red-900/50 text-red-300"
        >{{ pieceLabel(cap) }}</span>
        <span v-if="game.redCaptured.length === 0" class="text-[10px] text-stone-600">—</span>
      </div>

      <!-- Red pieces captured (by black) -->
      <div class="flex-1 flex items-center gap-1 flex-wrap justify-end">
        <span class="text-[10px] text-stone-500 shrink-0">:黑方得子</span>
        <span
          v-for="(cap, i) in [...game.blackCaptured].reverse()"
          :key="i"
          class="text-xs px-1.5 py-0.5 rounded font-bold bg-gray-800 text-gray-300"
        >{{ pieceLabel(cap) }}</span>
        <span v-if="game.blackCaptured.length === 0" class="text-[10px] text-stone-600">—</span>
      </div>
    </div>

    <div class="flex flex-col md:flex-row items-center gap-4 p-4">
      <ChessBoard />
      <SidePanel />
    </div>
  </div>
</template>
