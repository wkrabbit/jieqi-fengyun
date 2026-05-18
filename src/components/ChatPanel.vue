<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { wsService } from '../services/ws'
import { useAuthStore } from '../stores/authStore'

interface ChatMsg {
  playerId: number
  playerName: string
  text: string
  timestamp: string
}

const messages = ref<ChatMsg[]>([])
const input = ref('')
const container = ref<HTMLDivElement | null>(null)
const expanded = ref(false)

function scrollBottom() {
  nextTick(() => {
    if (container.value) {
      container.value.scrollTop = container.value.scrollHeight
    }
  })
}

const auth = useAuthStore()

function sendMessage() {
  const text = input.value.trim()
  if (!text) return
  const msg: ChatMsg = {
    playerId: 0,
    playerName: auth.user?.username || 'Guest',
    text,
    timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
  }
  // Local echo
  messages.value.push(msg)
  scrollBottom()
  wsService.send('chat_message', { ...msg })
  input.value = ''
}

// Listen for incoming chat
wsService.on('chat_message', (data) => {
  messages.value.push({
    playerId: data.playerId as number,
    playerName: data.playerName as string,
    text: data.text as string,
    timestamp: data.timestamp as string,
  })
  if (messages.value.length > 100) messages.value.shift()
  scrollBottom()
})
</script>

<template>
  <div class="flex flex-col bg-stone-700/40 rounded-lg overflow-hidden">
    <!-- Toggle header -->
    <button
      @click="expanded = !expanded"
      class="flex items-center justify-between px-3 py-2 text-xs text-stone-400 hover:text-stone-200 transition-colors"
    >
      <span>聊天</span>
      <span class="text-[10px]">{{ expanded ? '收起' : '展开' }}</span>
    </button>

    <div v-if="expanded" class="flex flex-col" style="height: 220px">
      <!-- Messages -->
      <div ref="container" class="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 text-xs">
        <div v-if="messages.length === 0" class="text-stone-500 text-center py-4">
          暂无消息
        </div>
        <div
          v-for="(msg, i) in messages"
          :key="i"
          class="flex gap-1.5"
        >
          <span class="text-stone-500 shrink-0">{{ msg.timestamp }}</span>
          <span class="text-amber-300/80 font-semibold shrink-0">{{ msg.playerName }}:</span>
          <span class="text-stone-200 break-all">{{ msg.text }}</span>
        </div>
      </div>

      <!-- Input -->
      <div class="flex gap-1 px-2 pb-2">
        <input
          v-model="input"
          @keydown.enter="sendMessage"
          type="text"
          placeholder="输入消息..."
          maxlength="200"
          class="flex-1 bg-stone-800 border border-stone-600 rounded px-2 py-1 text-xs text-stone-100
                 placeholder-stone-500 focus:outline-none focus:border-amber-500"
        />
        <button
          @click="sendMessage"
          class="bg-amber-700/60 hover:bg-amber-700 text-amber-200 px-3 py-1 rounded text-xs
                 font-semibold transition-colors"
        >发送</button>
      </div>
    </div>
  </div>
</template>
