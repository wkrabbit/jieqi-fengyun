import type { Piece, Color } from '../types'
import { PIECE_TYPES } from '../types'

export { PIECE_TYPES, COLORS } from '../types'

export function isDarkZone(row: number, color: Color): boolean {
  return color === 'r' ? row >= 5 && row <= 9 : row >= 0 && row <= 4
}

let _id = 0
function p(type: (typeof PIECE_TYPES)[number], color: Color, row: number, col: number): Piece {
  return { id: ++_id, type, color, faceUp: false, row, col }
}

export const INITIAL_LAYOUT: Piece[] = [
  // Black back row (row 0)
  p('rook', 'b', 0, 0), p('horse', 'b', 0, 1), p('elephant', 'b', 0, 2), p('advisor', 'b', 0, 3),
  p('king', 'b', 0, 4),
  p('advisor', 'b', 0, 5), p('elephant', 'b', 0, 6), p('horse', 'b', 0, 7), p('rook', 'b', 0, 8),
  // Black cannons and pawns
  p('cannon', 'b', 2, 1), p('cannon', 'b', 2, 7),
  p('pawn', 'b', 3, 0), p('pawn', 'b', 3, 2), p('pawn', 'b', 3, 4), p('pawn', 'b', 3, 6), p('pawn', 'b', 3, 8),
  // Red pawns and cannons
  p('pawn', 'r', 6, 0), p('pawn', 'r', 6, 2), p('pawn', 'r', 6, 4), p('pawn', 'r', 6, 6), p('pawn', 'r', 6, 8),
  p('cannon', 'r', 7, 1), p('cannon', 'r', 7, 7),
  // Red back row (row 9)
  p('rook', 'r', 9, 0), p('horse', 'r', 9, 1), p('elephant', 'r', 9, 2), p('advisor', 'r', 9, 3),
  p('king', 'r', 9, 4),
  p('advisor', 'r', 9, 5), p('elephant', 'r', 9, 6), p('horse', 'r', 9, 7), p('rook', 'r', 9, 8),
]
