<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import type { PieceType, Color } from '../types'

const props = defineProps<{
  x: number
  y: number
  color: Color
}>()

const emit = defineEmits<{
  select: [type: PieceType]
  close: []
}>()

const PIECE_NAMES: Record<PieceType, string> = {
  king: '将/帅',
  advisor: '士',
  elephant: '象',
  horse: '马',
  rook: '车',
  cannon: '炮',
  pawn: '兵/卒',
}

const PIECE_TYPES: PieceType[] = ['rook', 'horse', 'elephant', 'advisor', 'cannon', 'pawn']

onMounted(() => {
  // Close on next click
  setTimeout(() => document.addEventListener('click', onOutsideClick), 0)
})

onUnmounted(() => {
  document.removeEventListener('click', onOutsideClick)
})

function onOutsideClick() {
  emit('close')
}
</script>

<template>
  <div
    class="fixed z-[100] bg-stone-800/95 border border-stone-600 rounded-lg shadow-2xl py-1 min-w-[100px]"
    :style="{ left: x + 'px', top: y + 'px' }"
    @click.stop
  >
    <div class="text-stone-400 text-[10px] px-3 py-1 uppercase tracking-wider">
      {{ color === 'r' ? '红方' : '黑方' }}棋子
    </div>
    <button
      v-for="t in PIECE_TYPES"
      :key="t"
      @click="emit('select', t)"
      :class="[
        'w-full text-left px-3 py-1.5 text-sm hover:bg-stone-700 transition-colors',
        color === 'r' ? 'text-red-300' : 'text-gray-300',
      ]"
    >
      {{ PIECE_NAMES[t] }}
    </button>
  </div>
</template>
