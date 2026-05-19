<script setup lang="ts">
import { computed, onMounted } from 'vue'
import ChessBoard from './ChessBoard.vue'
import SidePanel from './SidePanel.vue'
import WinDialog from './WinDialog.vue'
import TimerBox from './TimerBox.vue'
import { useGameStore, type CapturedPiece } from '../stores/gameStore'
import { useLobbyStore } from '../stores/lobbyStore'
import { useAuthStore } from '../stores/authStore'
import { useRouter, useRoute } from 'vue-router'

const game = useGameStore()
const lobby = useLobbyStore()
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const isOnlineRoute = !!route.params.code
const flipped = computed(() => game.mode === 'online' && game.yourColor === 'b')

// Player names
const myName = computed(() => auth.user?.username || '玩家')
const opponentName = computed(() => {
  if (!lobby.players) return '对手'
  const myId = auth.user?.id
  const opp = lobby.players.find(p => p && p.id !== myId)
  return opp?.username || '对手'
})

// Captured pieces
const myCaptured = computed(() => flipped.value ? game.blackCaptured : game.redCaptured)
const opponentCaptured = computed(() => flipped.value ? game.redCaptured : game.blackCaptured)
const myLabel = computed(() => flipped.value ? '黑方得子' : '红方得子')
const opponentLabel = computed(() => flipped.value ? '红方得子' : '黑方得子')

// Timer color assignment: my timer = my color, opponent timer = opponent color
const myColor = computed(() => game.yourColor || 'r')
const opponentColor = computed<'r' | 'b'>(() => game.yourColor === 'r' ? 'b' : 'r')

onMounted(() => {
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
  if (cap.type === 'unknown') return '？'
  const names = cap.color === 'r' ? PIECE_NAMES_RED : PIECE_NAMES_BLACK
  return names[cap.type] || '?'
}

function backToLobby() {
  lobby.leaveRoom()
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
      <span
        v-if="game.opponentDisconnected"
        class="text-yellow-400 text-xs font-semibold animate-pulse"
      >对手已断线，等待重连...</span>
      <span v-else-if="game.mode !== 'online'" class="text-stone-400">本地对战</span>
      <button
        @click="backToLobby"
        class="text-stone-400 hover:text-stone-200 text-xs transition-colors ml-auto"
      >返回大厅</button>
    </div>

    <!-- Opponent info (top-right) -->
    <div v-if="game.mode === 'online'" class="flex items-center gap-3 px-4 w-full max-w-[900px] justify-end">
      <TimerBox :color="opponentColor" />
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-full bg-stone-600 flex items-center justify-center text-xs font-bold text-stone-300">
          {{ opponentName.charAt(0) }}
        </div>
        <span class="text-stone-300 text-sm font-semibold">{{ opponentName }}</span>
      </div>
    </div>

    <!-- Opponent captured pieces -->
    <div class="flex items-center gap-1 flex-wrap px-4 w-full max-w-[900px]">
      <span class="text-[10px] text-stone-500 shrink-0">{{ opponentLabel }}:</span>
      <span
        v-for="(cap, i) in [...opponentCaptured].reverse()"
        :key="i"
        :class="flipped
          ? 'text-xs px-1.5 py-0.5 rounded font-bold bg-red-900/50 text-red-300'
          : 'text-xs px-1.5 py-0.5 rounded font-bold bg-gray-800 text-gray-300'"
      >{{ pieceLabel(cap) }}</span>
      <span v-if="opponentCaptured.length === 0" class="text-[10px] text-stone-600">—</span>
    </div>

    <div class="flex flex-col md:flex-row items-center gap-4 p-4 w-full justify-center">
      <div class="flex-shrink-0">
        <ChessBoard />
      </div>
      <div class="flex-shrink-0">
        <SidePanel />
      </div>
    </div>

    <!-- My captured pieces -->
    <div class="flex items-center gap-1 flex-wrap px-4 w-full max-w-[900px]">
      <span class="text-[10px] text-stone-500 shrink-0">{{ myLabel }}:</span>
      <span
        v-for="(cap, i) in myCaptured"
        :key="i"
        :class="flipped
          ? 'text-xs px-1.5 py-0.5 rounded font-bold bg-gray-800 text-gray-300'
          : 'text-xs px-1.5 py-0.5 rounded font-bold bg-red-900/50 text-red-300'"
      >{{ pieceLabel(cap) }}</span>
      <span v-if="myCaptured.length === 0" class="text-[10px] text-stone-600">—</span>
    </div>

    <!-- My info (bottom-left) -->
    <div v-if="game.mode === 'online'" class="flex items-center gap-3 px-4 w-full max-w-[900px]">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-full bg-amber-700 flex items-center justify-center text-xs font-bold text-amber-200">
          {{ myName.charAt(0) }}
        </div>
        <span class="text-amber-200 text-sm font-semibold">{{ myName }}</span>
      </div>
      <TimerBox :color="myColor" />
    </div>

    <WinDialog />
  </div>
</template>
