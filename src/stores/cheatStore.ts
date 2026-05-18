import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Piece, PieceType, Color } from '../types'
import type { ColorPools } from '../engine/deferredIdentity'
import { createInitialPools, clonePools } from '../engine/deferredIdentity'
import { getCheatMenuAvailability, canSetCheatPreset, CHEATABLE_TYPES } from '../engine/piecePool'

export const useCheatStore = defineStore('cheat', () => {
  const enabled = ref(false)
  const pendingCheats = ref<Map<number, PieceType>>(new Map())
  const approvedPieceIds = ref<Set<number>>(new Set())
  const remainingPool = ref<ColorPools>(createInitialPools())

  function toggle() {
    enabled.value = !enabled.value
    if (!enabled.value) clearAll()
  }

  function syncRemainingPool(pools: ColorPools) {
    remainingPool.value = clonePools(pools)
  }

  function setCheat(pieceId: number, type: PieceType, pieces: Piece[], color: Color): boolean {
    if (!canSetCheatPreset(remainingPool.value, pendingCheats.value, pieces, color, pieceId, type)) {
      return false
    }
    pendingCheats.value.set(pieceId, type)
    return true
  }

  function clearCheat(pieceId: number) {
    pendingCheats.value.delete(pieceId)
  }

  function clearAll() {
    pendingCheats.value.clear()
    approvedPieceIds.value.clear()
    remainingPool.value = createInitialPools()
  }

  function getCheat(pieceId: number): PieceType | undefined {
    return pendingCheats.value.get(pieceId)
  }

  function isCheated(pieceId: number): boolean {
    return pendingCheats.value.has(pieceId) || approvedPieceIds.value.has(pieceId)
  }

  function getTypeAvailability(pieces: Piece[], color: Color, pieceId: number) {
    return getCheatMenuAvailability(
      remainingPool.value,
      pendingCheats.value,
      pieces,
      color,
      pieceId,
    )
  }

  function acceptServerCheats(cheats: Array<{ id: number; type: PieceType }>) {
    pendingCheats.value.clear()
    approvedPieceIds.value.clear()
    for (const c of cheats) {
      pendingCheats.value.set(c.id, c.type)
      approvedPieceIds.value.add(c.id)
    }
  }

  function clearCheatsForPieces(pieceIds: number[]) {
    for (const id of pieceIds) {
      pendingCheats.value.delete(id)
      approvedPieceIds.value.delete(id)
    }
  }

  function buildStartGameCheatMap(pieces: Piece[]): Record<string, string> {
    const out: Record<string, string> = {}
    for (const [id, t] of pendingCheats.value) {
      const p = pieces.find(x => x.id === id)
      if (p) out[`${p.row},${p.col}`] = t
    }
    return out
  }

  return {
    enabled,
    pendingCheats,
    approvedPieceIds,
    remainingPool,
    CHEATABLE_TYPES,
    toggle,
    syncRemainingPool,
    setCheat,
    clearCheat,
    clearAll,
    getCheat,
    isCheated,
    getTypeAvailability,
    acceptServerCheats,
    clearCheatsForPieces,
    buildStartGameCheatMap,
  }
})
