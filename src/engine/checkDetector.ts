import type { Color, Piece, BoardGrid, Position } from '../types'
import { getLegalMoves } from './moveValidator'

function findKing(color: Color, grid: BoardGrid): Piece | null {
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const piece = grid[r][c]
      if (piece && piece.type === 'king' && piece.color === color && piece.faceUp) {
        return piece
      }
    }
  }
  return null
}

function isSquareAttacked(row: number, col: number, byColor: Color, grid: BoardGrid): boolean {
  // Check kings facing each other (flying general)
  const enemyDir = byColor === 'r' ? 1 : -1
  let kr = row + enemyDir
  while (kr >= 0 && kr <= 9) {
    const target = grid[kr][col]
    if (target !== null) {
      if (target.type === 'king' && target.color === byColor && target.faceUp) return true
      break
    }
    kr += enemyDir
  }

  // Check if any enemy piece can reach this square
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const piece = grid[r][c]
      if (!piece || piece.color !== byColor || !piece.faceUp) continue
      const moves = getLegalMoves(piece, grid)
      if (moves.some((m: Position) => m.row === row && m.col === col)) return true
    }
  }
  return false
}

export function isInCheck(color: Color, grid: BoardGrid): boolean {
  const king = findKing(color, grid)
  if (!king) return false
  const enemyColor = color === 'r' ? 'b' : 'r'
  return isSquareAttacked(king.row, king.col, enemyColor, grid)
}

type GetLegalMovesFn = (piece: Piece, grid: BoardGrid) => Position[]

export function isCheckmate(color: Color, grid: BoardGrid, getMoves: GetLegalMovesFn): boolean {
  if (!isInCheck(color, grid)) return false
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const piece = grid[r][c]
      if (!piece || piece.color !== color || !piece.faceUp) continue
      const moves = getMoves(piece, grid)
      for (const move of moves) {
        const newGrid = grid.map(row => [...row])
        newGrid[move.row][move.col] = { ...piece, row: move.row, col: move.col }
        newGrid[piece.row][piece.col] = null
        if (!isInCheck(color, newGrid)) return false
      }
    }
  }
  return true
}

export function isStalemate(color: Color, grid: BoardGrid, getMoves: GetLegalMovesFn): boolean {
  if (isInCheck(color, grid)) return false
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const piece = grid[r][c]
      if (!piece || piece.color !== color || !piece.faceUp) continue
      const moves = getMoves(piece, grid)
      for (const move of moves) {
        const newGrid = grid.map(row => [...row])
        newGrid[move.row][move.col] = { ...piece, row: move.row, col: move.col }
        newGrid[piece.row][piece.col] = null
        if (!isInCheck(color, newGrid)) return false
      }
    }
  }
  return true
}
