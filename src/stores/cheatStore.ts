import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Piece, PieceType, Color } from '../types'
import {
  canAssignCheatType,
  getCheatTypeAvailability,
  CHEATABLE_TYPES,
} from '../engine/piecePool'

export const useCheatStore = defineStore('cheat', () => {
  const enabled = ref(false)
  /** 待生效作弊：pieceId → 目标类型（移动时提交 cheatedType） */
  const pendingCheats = ref<Map<number, PieceType>>(new Map())
  /** 开局时服务端已接受的预设（用于紫色光晕） */
  const approvedPieceIds = ref<Set<number>>(new Set())

  function toggle() {
    enabled.value = !enabled.value
    if (!enabled.value) clearAll()
  }

  function setCheat(pieceId: number, type: PieceType, pieces: Piece[], color: Color): boolean {
    if (!canAssignCheatType(pieces, color, type, pieceId, pendingCheats.value)) {
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
  }

  function getCheat(pieceId: number): PieceType | undefined {
    return pendingCheats.value.get(pieceId)
  }

  function isCheated(pieceId: number): boolean {
    return pendingCheats.value.has(pieceId) || approvedPieceIds.value.has(pieceId)
  }

  function getTypeAvailability(pieces: Piece[], color: Color, pieceId: number) {
    return getCheatTypeAvailability(pieces, color, pieceId, pendingCheats.value)
  }

  function canSetType(pieces: Piece[], color: Color, pieceId: number, type: PieceType): boolean {
    return canAssignCheatType(pieces, color, type, pieceId, pendingCheats.value)
  }

  function acceptServerCheats(cheats: Array<{ id: number; type: PieceType }>) {
    pendingCheats.value.clear()
    approvedPieceIds.value.clear()
    for (const c of cheats) {
      approvedPieceIds.value.add(c.id)
    }
  }

  /** 棋子被吃/翻开/服务端同步时清除本地预设 */
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
    CHEATABLE_TYPES,
    toggle,
    setCheat,
    clearCheat,
    clearAll,
    getCheat,
    isCheated,
    getTypeAvailability,
    canSetType,
    acceptServerCheats,
    clearCheatsForPieces,
    buildStartGameCheatMap,
  }
})
