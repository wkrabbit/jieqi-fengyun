export const PIECE_TYPES = ['king', 'advisor', 'elephant', 'horse', 'rook', 'cannon', 'pawn'] as const
export type PieceType = typeof PIECE_TYPES[number]

export type Color = 'r' | 'b'
export const COLORS: Color[] = ['r', 'b']

export interface Piece {
  id: number
  type: PieceType
  color: Color
  faceUp: boolean
  row: number
  col: number
}

export interface Position {
  row: number
  col: number
}

export type BoardGrid = (Piece | null)[][]
