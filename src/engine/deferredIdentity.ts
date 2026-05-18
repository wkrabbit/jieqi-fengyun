import type { Piece, PieceType, Color } from '../types'
import { CHEATABLE_TYPES, getPoolLimits } from './piecePool'

export type RemainingPool = Record<PieceType, number>

export interface ColorPools {
  r: RemainingPool
  b: RemainingPool
}

export function createEmptyRemaining(): RemainingPool {
  return { king: 0, advisor: 0, elephant: 0, horse: 0, rook: 0, cannon: 0, pawn: 0 }
}

export function createInitialPools(): ColorPools {
  const build = (color: Color): RemainingPool => {
    const limits = getPoolLimits(color)
    const pool = createEmptyRemaining()
    for (const t of CHEATABLE_TYPES) pool[t] = limits[t]
    return pool
  }
  return { r: build('r'), b: build('b') }
}

export function clonePools(pools: ColorPools): ColorPools {
  return { r: { ...pools.r }, b: { ...pools.b } }
}

export type CheatPresets = Map<number, PieceType>

export function countPresetsForType(
  presets: CheatPresets,
  pieces: Piece[],
  color: Color,
  type: PieceType,
  excludePieceId?: number,
): number {
  let n = 0
  for (const [id, t] of presets) {
    if (t !== type || id === excludePieceId) continue
    const p = pieces.find(x => x.id === id)
    if (p && p.color === color && !p.faceUp) n++
  }
  return n
}

export function canPresetType(
  pools: ColorPools,
  presets: CheatPresets,
  pieces: Piece[],
  color: Color,
  pieceId: number,
  type: PieceType,
): boolean {
  if (type === 'king') return false
  const remaining = pools[color][type] ?? 0
  const reserved = countPresetsForType(presets, pieces, color, type, pieceId)
  return remaining - reserved > 0
}

export function getPresetAvailability(
  pools: ColorPools,
  presets: CheatPresets,
  pieces: Piece[],
  color: Color,
  pieceId: number,
): Record<PieceType, { available: boolean; remaining: number }> {
  const result = {} as Record<PieceType, { available: boolean; remaining: number }>
  for (const t of CHEATABLE_TYPES) {
    const reserved = countPresetsForType(presets, pieces, color, t, pieceId)
    const left = Math.max(0, (pools[color][t] ?? 0) - reserved)
    result[t] = {
      remaining: left,
      available: canPresetType(pools, presets, pieces, color, pieceId, t),
    }
  }
  return result
}

export type Rng = () => number

export function createRng(seed: number): Rng {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function drawWeightedType(pool: RemainingPool, rng: Rng): PieceType | null {
  const types = CHEATABLE_TYPES.filter(t => (pool[t] ?? 0) > 0)
  if (types.length === 0) return null
  const total = types.reduce((s, t) => s + pool[t], 0)
  let r = rng() * total
  for (const t of types) {
    r -= pool[t]
    if (r <= 0) return t
  }
  return types[types.length - 1]
}

export interface RevealResult {
  type: PieceType
  presetApplied: boolean
  presetRejected?: boolean
}

/** 翻开时分配身份：优先预设，池不足则加权随机 */
export function revealAndConsume(
  pools: ColorPools,
  presets: CheatPresets,
  piece: Piece,
  requestedPreset: PieceType | undefined,
  rng: Rng,
): RevealResult {
  const color = piece.color
  const pool = pools[color]
  const fromMap = presets.get(piece.id)
  const preset = requestedPreset ?? fromMap

  let assigned: PieceType
  let presetApplied: boolean
  let presetRejected: boolean | undefined

  if (preset && (pool[preset] ?? 0) > 0) {
    assigned = preset
    presetApplied = true
    pool[preset]--
  } else {
    presetRejected = !!preset && (pool[preset] ?? 0) <= 0
    const drawn = drawWeightedType(pool, rng)
    if (!drawn) throw new Error('棋子池已空，无法翻开')
    assigned = drawn
    presetApplied = false
    pool[drawn]--
  }

  piece.type = assigned
  piece.faceUp = true
  presets.delete(piece.id)
  return { type: assigned, presetApplied, presetRejected }
}

export function poolsToJSON(pools: ColorPools): Record<string, Record<string, number>> {
  return { r: { ...pools.r }, b: { ...pools.b } }
}

export function poolsFromJSON(raw: Record<string, Record<string, number>>): ColorPools {
  const empty = createEmptyRemaining()
  return { r: { ...empty, ...raw.r }, b: { ...empty, ...raw.b } }
}
