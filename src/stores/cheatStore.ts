import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { PieceType } from '../types'

export const useCheatStore = defineStore('cheat', () => {
  const enabled = ref(false)
  const pendingCheats = ref<Map<number, PieceType>>(new Map())

  function toggle() {
    enabled.value = !enabled.value
    if (!enabled.value) clearAll()
  }

  function setCheat(pieceId: number, type: PieceType) {
    pendingCheats.value.set(pieceId, type)
  }

  function clearCheat(pieceId: number) {
    pendingCheats.value.delete(pieceId)
  }

  function clearAll() {
    pendingCheats.value.clear()
  }

  function getCheat(pieceId: number): PieceType | undefined {
    return pendingCheats.value.get(pieceId)
  }

  function isCheated(pieceId: number): boolean {
    return pendingCheats.value.has(pieceId)
  }

  return { enabled, pendingCheats, toggle, setCheat, clearCheat, clearAll, getCheat, isCheated }
})
