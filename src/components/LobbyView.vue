<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useLobbyStore } from '../stores/lobbyStore'

const router = useRouter()
const auth = useAuthStore()
const lobby = useLobbyStore()

const roomCodeInput = ref('')

watch(() => lobby.status, (s) => {
  if (s === 'playing' && lobby.roomCode) {
    router.push(`/game/room/${lobby.roomCode}`)
  }
})

async function createRoom() {
  await lobby.createRoom()
}

async function joinRoom() {
  const code = roomCodeInput.value.trim()
  if (!code) {
    lobby.error = '请输入房间号'
    return
  }
  await lobby.joinRoom(code)
}

function startGame() {
  lobby.startGame()
}

function leaveRoom() {
  lobby.leaveRoom()
}

function goLocal() {
  router.push('/game/local')
}

function logout() {
  lobby.reset()
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen bg-stone-800 flex items-center justify-center">
    <div class="bg-stone-700/60 rounded-2xl shadow-xl p-8 w-full max-w-md mx-4">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-amber-200">揭棋风云</h1>
        <div class="flex items-center gap-2">
          <span
            v-if="auth.isVip"
            class="bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded-full"
            title="VIP 用户"
          >VIP</span>
          <button
            @click="logout"
            class="text-stone-400 hover:text-stone-200 text-sm transition-colors"
          >退出</button>
        </div>
      </div>

      <div class="text-stone-300 text-sm mb-6">
        欢迎，<span class="text-amber-300 font-semibold">{{ auth.user?.username }}</span>
      </div>

      <!-- Room view -->
      <div v-if="lobby.status === 'in-room' || lobby.status === 'playing'" class="flex flex-col gap-4">
        <div class="bg-stone-800 rounded-lg p-4 text-center">
          <div class="text-stone-400 text-xs mb-1">房间号</div>
          <div class="text-amber-300 text-3xl font-bold tracking-widest font-mono">{{ lobby.roomCode }}</div>
        </div>

        <div class="flex gap-3">
          <div class="flex-1 bg-stone-800 rounded-lg p-3 text-center">
            <div class="text-red-400 text-xs mb-1">红方</div>
            <div class="text-stone-200 font-semibold">{{ lobby.players[0]?.username || '等待中...' }}</div>
          </div>
          <div class="flex-1 bg-stone-800 rounded-lg p-3 text-center">
            <div class="text-gray-400 text-xs mb-1">黑方</div>
            <div class="text-stone-200 font-semibold">{{ lobby.players[1]?.username || '等待中...' }}</div>
          </div>
        </div>

        <div class="flex gap-2">
          <button
            v-if="lobby.isHost && lobby.players[1]"
            @click="startGame"
            class="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-semibold py-3 rounded-lg
                   transition-colors active:scale-[0.98]"
          >开始对局</button>
          <button
            @click="leaveRoom"
            class="flex-1 bg-red-700/60 hover:bg-red-700 text-red-200 font-semibold py-3 rounded-lg
                   transition-colors active:scale-[0.98]"
          >离开房间</button>
        </div>
      </div>

      <!-- Lobby view -->
      <div v-else>
        <div class="flex gap-2 mb-4">
          <input
            v-model="roomCodeInput"
            type="text"
            placeholder="输入房间号"
            maxlength="6"
            class="flex-1 bg-stone-800 border border-stone-600 rounded-lg px-4 py-2.5 text-stone-100
                   placeholder-stone-400 focus:outline-none focus:border-amber-500 transition-colors"
          />
          <button
            @click="joinRoom"
            class="bg-amber-700/60 hover:bg-amber-700 text-amber-200 px-5 py-2.5 rounded-lg
                   font-semibold transition-colors active:scale-[0.97]"
          >加入</button>
        </div>

        <div class="flex flex-col gap-3">
          <button
            @click="createRoom"
            class="bg-amber-600 hover:bg-amber-500 text-white font-semibold py-3 rounded-lg
                   transition-colors active:scale-[0.98]"
          >创建房间</button>

          <div class="border-t border-stone-600 my-1" />

          <button
            @click="goLocal"
            class="bg-stone-600/60 hover:bg-stone-600 text-stone-200 font-semibold py-3 rounded-lg
                   transition-colors active:scale-[0.98]"
          >本地对战</button>
        </div>
      </div>

      <div v-if="lobby.error" class="mt-4 text-red-400 text-sm text-center">{{ lobby.error }}</div>
    </div>
  </div>
</template>
