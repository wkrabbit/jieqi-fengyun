import type { Piece, PieceType, Color } from '../types'
import type { ColorPools, CheatPresets } from './deferredIdentity'
import { canPresetType, getPresetAvailability } from './deferredIdentity'

/** 暗棋洗牌池（与 generateRandomLayout 一致） */
export const RED_POOL: PieceType[] = [
  'rook', 'rook', 'horse', 'horse', 'elephant', 'elephant',
  'advisor', 'advisor', 'cannon', 'cannon',
  'pawn', 'pawn', 'pawn', 'pawn', 'pawn',
]

export const BLACK_POOL: PieceType[] = [
  'rook', 'rook', 'horse', 'horse', 'elephant', 'elephant',
  'advisor', 'advisor', 'cannon', 'cannon',
  'pawn', 'pawn', 'pawn', 'pawn', 'pawn',
]

/** VIP 可指定的暗棋类型 */
export const CHEATABLE_TYPES: PieceType[] = ['rook', 'horse', 'elephant', 'advisor', 'cannon', 'pawn']

export function getPoolLimits(color: Color): Record<PieceType, number> {
  const pool = color === 'r' ? RED_POOL : BLACK_POOL
  const limits: Record<PieceType, number> = {
    king: 1, advisor: 0, elephant: 0, horse: 0, rook: 0, cannon: 0, pawn: 0,
  }
  for (const t of pool) limits[t] = (limits[t] || 0) + 1
  return limits
}

export interface EffectiveTypeOptions {
  pendingCheats?: Map<number, PieceType>
  /** 预览：将该棋子视为指定类型参与计数 */
  previewPieceId?: number
  previewType?: PieceType
}

/** 棋子在对局中的有效类型（明棋 / 待生效作弊 / 预览） */
export function getEffectiveType(
  piece: Piece,
  options?: EffectiveTypeOptions,
): PieceType {
  if (options?.previewPieceId === piece.id && options.previewType) {
    return options.previewType
  }
  if (!piece.faceUp && options?.pendingCheats?.has(piece.id)) {
    return options.pendingCheats.get(piece.id)!
  }
  return piece.type
}

/** 统计某方各类型有效数量（用于作弊上限，与洗牌池一致） */
export function countEffectiveTypes(
  pieces: Piece[],
  color: Color,
  options?: EffectiveTypeOptions,
): Record<PieceType, number> {
  const counts: Record<PieceType, number> = {
    king: 0, advisor: 0, elephant: 0, horse: 0, rook: 0, cannon: 0, pawn: 0,
  }
  for (const p of pieces) {
    if (p.color !== color) continue
    const t = getEffectiveType(p, options)
    counts[t] = (counts[t] || 0) + 1
  }
  return counts
}

/** 延迟生成模式：按剩余池 + 预设计算菜单 */
export function getCheatMenuAvailability(
  pools: ColorPools,
  presets: CheatPresets,
  pieces: Piece[],
  color: Color,
  pieceId: number,
  localPending?: Map<number, PieceType>,
): Record<PieceType, { available: boolean; remaining: number }> {
  const merged = new Map(presets)
  if (localPending) for (const [id, t] of localPending) merged.set(id, t)
  return getPresetAvailability(pools, merged, pieces, color, pieceId)
}

export function canSetCheatPreset(
  pools: ColorPools,
  presets: CheatPresets,
  pieces: Piece[],
  color: Color,
  pieceId: number,
  type: PieceType,
  localPending?: Map<number, PieceType>,
): boolean {
  const merged = new Map(presets)
  if (localPending) for (const [id, t] of localPending) merged.set(id, t)
  return canPresetType(pools, merged, pieces, color, pieceId, type)
}

/** @deprecated 预生成模式用；延迟模式请用 canSetCheatPreset */
export function canAssignCheatType(
  pieces: Piece[],
  color: Color,
  targetType: PieceType,
  pieceId: number,
  pendingCheats?: Map<number, PieceType>,
): boolean {
  if (targetType === 'king') return false
  const limits = getPoolLimits(color)
  const max = limits[targetType]
  if (!max) return false

  const counts = countEffectiveTypes(pieces, color, {
    pendingCheats,
    previewPieceId: pieceId,
    previewType: targetType,
  })
  return counts[targetType] <= max
}

/** 各类型剩余可作弊名额（用于菜单置灰） */
export function getCheatTypeAvailability(
  pieces: Piece[],
  color: Color,
  pieceId: number,
  pendingCheats?: Map<number, PieceType>,
): Record<PieceType, { available: boolean; remaining: number }> {
  const limits = getPoolLimits(color)
  const result = {} as Record<PieceType, { available: boolean; remaining: number }>

  for (const t of CHEATABLE_TYPES) {
    const max = limits[t]
    const countsWithout = countEffectiveTypes(pieces, color, { pendingCheats })
    const current = countsWithout[t] || 0
    const canSet = canAssignCheatType(pieces, color, t, pieceId, pendingCheats)
    result[t] = {
      available: canSet,
      remaining: Math.max(0, max - current),
    }
  }
  return result
}

/** 将 pending 作弊应用到走法校验用的棋子副本 */
export function pieceForMoveValidation(
  piece: Piece,
  pendingCheats?: Map<number, PieceType>,
): Piece {
  const cheat = pendingCheats?.get(piece.id)
  if (cheat && !piece.faceUp) {
    return { ...piece, type: cheat, faceUp: true }
  }
  return piece
}

export function buildAllocatedCounts(pieces: Piece[]): Record<Color, Record<PieceType, number>> {
  const r: Record<PieceType, number> = { king: 0, advisor: 0, elephant: 0, horse: 0, rook: 0, cannon: 0, pawn: 0 }
  const b: Record<PieceType, number> = { king: 0, advisor: 0, elephant: 0, horse: 0, rook: 0, cannon: 0, pawn: 0 }
  for (const p of pieces) {
    if (p.color === 'r') r[p.type] = (r[p.type] || 0) + 1
    else b[p.type] = (b[p.type] || 0) + 1
  }
  return { r, b }
}
