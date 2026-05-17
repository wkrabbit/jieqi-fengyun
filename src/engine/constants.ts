import type { Piece, Color, PieceType } from '../types'
import { PIECE_TYPES } from '../types'

export { PIECE_TYPES, COLORS } from '../types'

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

const RED_POOL: PieceType[] = [
  'rook', 'rook', 'horse', 'horse', 'elephant', 'elephant',
  'advisor', 'advisor', 'cannon', 'cannon',
  'pawn', 'pawn', 'pawn', 'pawn', 'pawn',
]

const BLACK_POOL: PieceType[] = [
  'rook', 'rook', 'horse', 'horse', 'elephant', 'elephant',
  'advisor', 'advisor', 'cannon', 'cannon',
  'pawn', 'pawn', 'pawn', 'pawn', 'pawn',
]

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
