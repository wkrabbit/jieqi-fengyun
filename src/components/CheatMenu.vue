<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import type { PieceType, Color } from '../types'

const props = defineProps<{
  x: number
  y: number
  color: Color
  availability: Record<PieceType, { available: boolean; remaining: number }>
}>()

const emit = defineEmits<{
  select: [type: PieceType | null]
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

const hasAnyAvailable = computed(() =>
  PIECE_TYPES.some(t => props.availability[t]?.available),
)

onMounted(() => {
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
    class="fixed z-[100] bg-stone-800/95 border border-stone-600 rounded-lg shadow-2xl py-1 min-w-[120px]"
    :style="{ left: x + 'px', top: y + 'px' }"
    @click.stop
  >
    <div class="text-stone-400 text-[10px] px-3 py-1 uppercase tracking-wider">
      {{ color === 'r' ? '红方' : '黑方' }}棋子
    </div>
    <button
      @click="emit('select', null)"
      class="w-full text-left px-3 py-1.5 text-sm hover:bg-stone-700 transition-colors text-stone-400"
    >
      取消预设
    </button>
    <button
      v-for="t in PIECE_TYPES"
      :key="t"
      :disabled="!availability[t]?.available"
      @click="availability[t]?.available && emit('select', t)"
      :class="[
        'w-full text-left px-3 py-1.5 text-sm transition-colors',
        availability[t]?.available
          ? (color === 'r' ? 'text-red-300 hover:bg-stone-700' : 'text-gray-300 hover:bg-stone-700')
          : 'text-stone-600 cursor-not-allowed',
      ]"
      :title="availability[t]?.available ? `剩余 ${availability[t].remaining} 枚` : '已达上限'"
    >
      {{ PIECE_NAMES[t] }}
      <span v-if="!availability[t]?.available" class="text-[10px] text-stone-500 ml-1">已满</span>
    </button>
    <div v-if="!hasAnyAvailable" class="px-3 py-1 text-[10px] text-amber-400/90">
      各类型均已达到棋池上限
    </div>
  </div>
</template>
