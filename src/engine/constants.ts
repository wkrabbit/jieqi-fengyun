import type { Piece, Color, PieceType } from '../types'
import { PIECE_TYPES } from '../types'
import { RED_POOL, BLACK_POOL, getPoolLimits } from './piecePool'

export { PIECE_TYPES, COLORS } from '../types'
export { RED_POOL, BLACK_POOL, getPoolLimits } from './piecePool'

export function isDarkZone(row: number, color: Color): boolean {
  return color === 'r' ? row >= 5 && row <= 9 : row >= 0 && row <= 4
}

let _id = 0
function p(type: (typeof PIECE_TYPES)[number], color: Color, row: number, col: number, faceUp = false): Piece {
  return { id: ++_id, type, color, faceUp, row, col }
}

export const INITIAL_LAYOUT: Piece[] = [
  // Black back row (row 0)
  p('rook', 'b', 0, 0), p('horse', 'b', 0, 1), p('elephant', 'b', 0, 2), p('advisor', 'b', 0, 3),
  p('king', 'b', 0, 4, true),
  p('advisor', 'b', 0, 5), p('elephant', 'b', 0, 6), p('horse', 'b', 0, 7), p('rook', 'b', 0, 8),
  // Black cannons and pawns
  p('cannon', 'b', 2, 1), p('cannon', 'b', 2, 7),
  p('pawn', 'b', 3, 0), p('pawn', 'b', 3, 2), p('pawn', 'b', 3, 4), p('pawn', 'b', 3, 6), p('pawn', 'b', 3, 8),
  // Red pawns and cannons
  p('pawn', 'r', 6, 0), p('pawn', 'r', 6, 2), p('pawn', 'r', 6, 4), p('pawn', 'r', 6, 6), p('pawn', 'r', 6, 8),
  p('cannon', 'r', 7, 1), p('cannon', 'r', 7, 7),
  // Red back row (row 9)
  p('rook', 'r', 9, 0), p('horse', 'r', 9, 1), p('elephant', 'r', 9, 2), p('advisor', 'r', 9, 3),
  p('king', 'r', 9, 4, true),
  p('advisor', 'r', 9, 5), p('elephant', 'r', 9, 6), p('horse', 'r', 9, 7), p('rook', 'r', 9, 8),
]

// Fisher-Yates shuffle
function fisherYates<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const RED_DARK_POSITIONS = [
  { row: 9, col: 0 }, { row: 9, col: 1 }, { row: 9, col: 2 }, { row: 9, col: 3 },
  { row: 9, col: 5 }, { row: 9, col: 6 }, { row: 9, col: 7 }, { row: 9, col: 8 },
  { row: 7, col: 1 }, { row: 7, col: 7 },
  { row: 6, col: 0 }, { row: 6, col: 2 }, { row: 6, col: 4 }, { row: 6, col: 6 }, { row: 6, col: 8 },
]

const BLACK_DARK_POSITIONS = [
  { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 },
  { row: 0, col: 5 }, { row: 0, col: 6 }, { row: 0, col: 7 }, { row: 0, col: 8 },
  { row: 2, col: 1 }, { row: 2, col: 7 },
  { row: 3, col: 0 }, { row: 3, col: 2 }, { row: 3, col: 4 }, { row: 3, col: 6 }, { row: 3, col: 8 },
]

// Position → expected piece type (traditional layout, excluding kings)
const POSITION_TYPE_MAP: Record<string, PieceType> = {}
for (const p of INITIAL_LAYOUT) {
  if (p.type !== 'king') {
    POSITION_TYPE_MAP[`${p.row},${p.col}`] = p.type
  }
}

export function getPositionType(row: number, col: number): PieceType | undefined {
  return POSITION_TYPE_MAP[`${row},${col}`]
}

/** 延迟随机：暗子身份未定，type 为初始位型占位（走暗棋位置规则） */
export function generateDeferredLayout(): Piece[] {
  let id = 0
  const pieces: Piece[] = []

  for (const pos of BLACK_DARK_POSITIONS) {
    const pt = getPositionType(pos.row, pos.col)!
    pieces.push({ id: ++id, type: pt, color: 'b', faceUp: false, row: pos.row, col: pos.col })
  }
  for (const pos of RED_DARK_POSITIONS) {
    const pt = getPositionType(pos.row, pos.col)!
    pieces.push({ id: ++id, type: pt, color: 'r', faceUp: false, row: pos.row, col: pos.col })
  }

  pieces.push({ id: ++id, type: 'king', color: 'b', faceUp: true, row: 0, col: 4 })
  pieces.push({ id: ++id, type: 'king', color: 'r', faceUp: true, row: 9, col: 4 })

  return pieces
}

/** @deprecated 测试/兼容：开局一次性预分配 */
export function generateRandomLayout(): Piece[] {
  const shufRed = fisherYates(RED_POOL)
  const shufBlack = fisherYates(BLACK_POOL)

  let id = 0
  const pieces: Piece[] = []

  for (let i = 0; i < 15; i++) {
    const pos = BLACK_DARK_POSITIONS[i]
    pieces.push({ id: ++id, type: shufBlack[i], color: 'b', faceUp: false, row: pos.row, col: pos.col })
  }
  for (let i = 0; i < 15; i++) {
    const pos = RED_DARK_POSITIONS[i]
    pieces.push({ id: ++id, type: shufRed[i], color: 'r', faceUp: false, row: pos.row, col: pos.col })
  }

  pieces.push({ id: ++id, type: 'king', color: 'b', faceUp: true, row: 0, col: 4 })
  pieces.push({ id: ++id, type: 'king', color: 'r', faceUp: true, row: 9, col: 4 })

  return pieces
}

// Apply cheats to an existing layout, compensating to maintain pool counts.
// Returns modified pieces array on success, or null if compensation fails.
// cheatMap maps piece.id → desired PieceType.
export function applyCheatsToLayout(pieces: Piece[], cheatMap?: Map<number, PieceType>): Piece[] | null {
  if (!cheatMap || cheatMap.size === 0) return pieces

  const cm = cheatMap // narrowed for closure

  const desiredCountsR = getPoolLimits('r')
  const desiredCountsB = getPoolLimits('b')

  // Deep-copy before mutations so we can return null on failure without side effects
  const copy = pieces.map(p => ({ ...p }))

  function applyForColor(color: 'r' | 'b', desiredCounts: Record<PieceType, number>): boolean {
    const colorPieces = copy.filter(p => p.color === color && p.type !== 'king')
    const baselineCounts: Record<string, number> = {}
    for (const p of colorPieces) baselineCounts[p.type] = (baselineCounts[p.type] || 0) + 1

    const cheats: Array<{ id: number; from: PieceType; to: PieceType }> = []
    for (const [id, to] of cm.entries()) {
      const p = copy.find(x => x.id === id)
      if (!p || p.color !== color || p.type === 'king') continue
      cheats.push({ id: p.id, from: p.type, to })
    }
    if (cheats.length === 0) return true

    const targetCounts: Record<string, number> = { ...baselineCounts }
    for (const c of cheats) {
      targetCounts[c.from] = (targetCounts[c.from] || 0) - 1
      targetCounts[c.to] = (targetCounts[c.to] || 0) + 1
    }

    const deltas: Record<string, number> = {}
    for (const t of Object.keys(desiredCounts) as PieceType[]) {
      if (t === 'king') continue
      deltas[t] = (targetCounts[t] || 0) - (desiredCounts[t] || 0)
    }

    const nonCheatedByType: Record<string, number[]> = {}
    const cheatedIds = new Set(cheats.map(c => c.id))
    for (const p of colorPieces) {
      if (cheatedIds.has(p.id)) continue
      nonCheatedByType[p.type] = nonCheatedByType[p.type] || []
      nonCheatedByType[p.type].push(p.id)
    }

    const excessTypes = Object.keys(deltas).filter(k => deltas[k] > 0)
    const deficitTypes = Object.keys(deltas).filter(k => deltas[k] < 0)

    for (const exType of excessTypes) {
      while (deltas[exType] > 0) {
        const list = nonCheatedByType[exType] || []
        if (list.length === 0) return false
        const victimId = list.pop()!
        const defType = deficitTypes.find(dt => deltas[dt] < 0)
        if (!defType) return false
        const vp = copy.find(x => x.id === victimId)!
        vp.type = defType as PieceType
        deltas[exType]--
        deltas[defType]++
        nonCheatedByType[defType] = nonCheatedByType[defType] || []
      }
    }

    for (const c of cheats) {
      const p = copy.find(x => x.id === c.id)!
      p.type = c.to
    }

    return true
  }

  const okR = applyForColor('r', desiredCountsR)
  if (!okR) return null
  const okB = applyForColor('b', desiredCountsB)
  if (!okB) return null

  // Copy results back to original pieces
  for (let i = 0; i < pieces.length; i++) {
    pieces[i].type = copy[i].type
  }
  return pieces
}

// Generate layout with optional cheats applied. cheatMap maps piece.id -> PieceType
export function generateRandomLayoutWithCheats(cheatMap?: Map<number, PieceType>): Piece[] {
  const pieces = generateRandomLayout()
  const result = applyCheatsToLayout(pieces, cheatMap)
  return result ?? generateRandomLayout()
}
