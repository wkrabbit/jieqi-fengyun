import { describe, it, expect } from 'vitest'
import { getLegalMoves } from '../moveValidator'
import type { Piece, BoardGrid } from '../../types'

function emptyGrid(): BoardGrid {
  return Array.from({ length: 10 }, () => Array(9).fill(null))
}

function place(pieces: Piece[]): BoardGrid {
  const grid = emptyGrid()
  for (const p of pieces) grid[p.row][p.col] = p
  return grid
}

function makePiece(overrides: Partial<Piece> & { id: number; type: Piece['type']; color: Piece['color']; row: number; col: number }): Piece {
  return { faceUp: false, ...overrides }
}

describe('getLegalMoves — dark pieces (move by position type)', () => {
  it('dark piece at rook position moves like rook', () => {
    // (9,0) is a rook position in traditional layout
    const piece = makePiece({ id: 1, type: 'pawn', color: 'r', row: 9, col: 0, faceUp: false })
    const enemy = makePiece({ id: 2, type: 'pawn', color: 'b', row: 9, col: 8, faceUp: true })
    const grid = place([piece, enemy])
    const moves = getLegalMoves(piece, grid)
    // Moves like a rook, not like a pawn
    expect(moves).toContainEqual({ row: 9, col: 8 })
    expect(moves).toContainEqual({ row: 0, col: 0 })
  })

  it('dark piece at horse position moves like horse', () => {
    // (9,1) is a horse position
    const piece = makePiece({ id: 1, type: 'rook', color: 'r', row: 9, col: 1, faceUp: false })
    const grid = place([piece])
    const moves = getLegalMoves(piece, grid)
    expect(moves).toContainEqual({ row: 7, col: 0 })
    expect(moves).toContainEqual({ row: 7, col: 2 })
    // Should NOT contain rook moves
    expect(moves).not.toContainEqual({ row: 0, col: 1 })
  })

  it('dark piece at cannon position moves like cannon', () => {
    // (7,1) is a cannon position
    const piece = makePiece({ id: 1, type: 'pawn', color: 'r', row: 7, col: 1, faceUp: false })
    const screen = makePiece({ id: 2, type: 'pawn', color: 'r', row: 3, col: 1, faceUp: true })
    const enemy = makePiece({ id: 3, type: 'pawn', color: 'b', row: 1, col: 1, faceUp: true })
    const grid = place([piece, screen, enemy])
    const moves = getLegalMoves(piece, grid)
    // Can capture via screen-jump (cannon rule)
    expect(moves).toContainEqual({ row: 1, col: 1 })
    // Cannot move directly to screen position
    expect(moves).not.toContainEqual({ row: 3, col: 1 })
  })

  it('dark piece at pawn position moves like pawn (forward only before river)', () => {
    // (6,0) is a pawn position
    const piece = makePiece({ id: 1, type: 'rook', color: 'r', row: 6, col: 0, faceUp: false })
    const grid = place([piece])
    expect(getLegalMoves(piece, grid)).toEqual([{ row: 5, col: 0 }])
  })

  it('revealed piece moves by its actual type, not position', () => {
    // Dark pawn at (9,0) — rook position, moves like rook
    const dark = makePiece({ id: 1, type: 'pawn', color: 'r', row: 9, col: 0, faceUp: false })
    // Same piece but revealed — now moves like pawn (actual type)
    const revealed = makePiece({ id: 2, type: 'pawn', color: 'r', row: 9, col: 0, faceUp: true })
    const grid = place([dark])
    const grid2 = place([revealed])
    // Dark at rook position → rook moves
    expect(getLegalMoves(dark, grid)).toContainEqual({ row: 0, col: 0 })
    // Revealed pawn → pawn moves (forward only at row 9 = before river for red)
    expect(getLegalMoves(revealed, grid2)).toEqual([{ row: 8, col: 0 }])
  })
})

describe('getLegalMoves — revealed rook (车)', () => {
  it('rook moves horizontally and vertically, blocked by own piece', () => {
    const piece = makePiece({ id: 1, type: 'rook', color: 'r', row: 5, col: 4, faceUp: true })
    const own = makePiece({ id: 2, type: 'pawn', color: 'r', row: 5, col: 6, faceUp: true })
    const grid = place([piece, own])
    const moves = getLegalMoves(piece, grid)
    expect(moves).toContainEqual({ row: 5, col: 0 })
    expect(moves).toContainEqual({ row: 5, col: 5 })
    expect(moves).not.toContainEqual({ row: 5, col: 6 })
    expect(moves).toContainEqual({ row: 0, col: 4 })
    expect(moves).toContainEqual({ row: 9, col: 4 })
  })

  it('rook can capture enemy piece', () => {
    const piece = makePiece({ id: 1, type: 'rook', color: 'r', row: 5, col: 4, faceUp: true })
    const enemy = makePiece({ id: 2, type: 'pawn', color: 'b', row: 5, col: 8, faceUp: true })
    const grid = place([piece, enemy])
    const moves = getLegalMoves(piece, grid)
    expect(moves).toContainEqual({ row: 5, col: 8 })
  })

  it('rook cannot capture enemy behind another enemy', () => {
    const piece = makePiece({ id: 1, type: 'rook', color: 'r', row: 5, col: 0, faceUp: true })
    const enemy1 = makePiece({ id: 2, type: 'pawn', color: 'b', row: 5, col: 4, faceUp: true })
    const enemy2 = makePiece({ id: 3, type: 'pawn', color: 'b', row: 5, col: 6, faceUp: true })
    const grid = place([piece, enemy1, enemy2])
    const moves = getLegalMoves(piece, grid)
    expect(moves).toContainEqual({ row: 5, col: 4 })
    expect(moves).not.toContainEqual({ row: 5, col: 6 })
  })
})

describe('getLegalMoves — revealed horse (马)', () => {
  it('horse moves in L shape with all 8 positions available', () => {
    const piece = makePiece({ id: 1, type: 'horse', color: 'r', row: 5, col: 4, faceUp: true })
    const grid = place([piece])
    const moves = getLegalMoves(piece, grid)
    expect(moves).toContainEqual({ row: 3, col: 3 })
    expect(moves).toContainEqual({ row: 3, col: 5 })
    expect(moves).toContainEqual({ row: 4, col: 2 })
    expect(moves).toContainEqual({ row: 4, col: 6 })
    expect(moves).toContainEqual({ row: 6, col: 2 })
    expect(moves).toContainEqual({ row: 6, col: 6 })
    expect(moves).toContainEqual({ row: 7, col: 3 })
    expect(moves).toContainEqual({ row: 7, col: 5 })
    expect(moves).toHaveLength(8)
  })

  it('horse blocked by leg piece', () => {
    const piece = makePiece({ id: 1, type: 'horse', color: 'r', row: 5, col: 4, faceUp: true })
    const legBlocker = makePiece({ id: 2, type: 'pawn', color: 'r', row: 5, col: 3, faceUp: true })
    const grid = place([piece, legBlocker])
    const moves = getLegalMoves(piece, grid)
    expect(moves).not.toContainEqual({ row: 4, col: 2 })
    expect(moves).not.toContainEqual({ row: 6, col: 2 })
  })
})

describe('getLegalMoves — revealed elephant (象/相)', () => {
  it('elephant moves diagonally 2 squares with full board access', () => {
    const piece = makePiece({ id: 1, type: 'elephant', color: 'r', row: 7, col: 4, faceUp: true })
    const grid = place([piece])
    const moves = getLegalMoves(piece, grid)
    expect(moves).toContainEqual({ row: 5, col: 2 })
    expect(moves).toContainEqual({ row: 5, col: 6 })
    expect(moves).toContainEqual({ row: 9, col: 2 })
    expect(moves).toContainEqual({ row: 9, col: 6 })
  })

  it('elephant can cross the river', () => {
    const piece = makePiece({ id: 1, type: 'elephant', color: 'r', row: 5, col: 2, faceUp: true })
    const grid = place([piece])
    const moves = getLegalMoves(piece, grid)
    expect(moves).toContainEqual({ row: 3, col: 0 })
    expect(moves).toContainEqual({ row: 3, col: 4 })
  })

  it('elephant blocked by eye piece', () => {
    const piece = makePiece({ id: 1, type: 'elephant', color: 'r', row: 7, col: 4, faceUp: true })
    const eyeBlocker = makePiece({ id: 2, type: 'pawn', color: 'r', row: 6, col: 3, faceUp: true })
    const grid = place([piece, eyeBlocker])
    const moves = getLegalMoves(piece, grid)
    expect(moves).not.toContainEqual({ row: 5, col: 2 })
  })
})

describe('getLegalMoves — revealed advisor (士)', () => {
  it('advisor moves diagonally anywhere on board', () => {
    const piece = makePiece({ id: 1, type: 'advisor', color: 'r', row: 5, col: 4, faceUp: true })
    const grid = place([piece])
    const moves = getLegalMoves(piece, grid)
    expect(moves).toContainEqual({ row: 4, col: 3 })
    expect(moves).toContainEqual({ row: 4, col: 5 })
    expect(moves).toContainEqual({ row: 6, col: 3 })
    expect(moves).toContainEqual({ row: 6, col: 5 })
    expect(moves).toHaveLength(4)
  })
})

describe('getLegalMoves — revealed king (帅/将)', () => {
  it('king moves one step inside palace', () => {
    const piece = makePiece({ id: 1, type: 'king', color: 'r', row: 8, col: 4, faceUp: true })
    const grid = place([piece])
    const moves = getLegalMoves(piece, grid)
    expect(moves).toContainEqual({ row: 7, col: 4 })
    expect(moves).toContainEqual({ row: 8, col: 3 })
    expect(moves).toContainEqual({ row: 8, col: 5 })
    expect(moves).toContainEqual({ row: 9, col: 4 })
  })
})

describe('getLegalMoves — revealed cannon (炮)', () => {
  it('cannon moves like rook when not capturing', () => {
    const piece = makePiece({ id: 1, type: 'cannon', color: 'r', row: 5, col: 4, faceUp: true })
    const grid = place([piece])
    const moves = getLegalMoves(piece, grid)
    expect(moves).toContainEqual({ row: 0, col: 4 })
    expect(moves).toContainEqual({ row: 5, col: 0 })
  })

  it('cannon captures by jumping exactly one screen piece', () => {
    const piece = makePiece({ id: 1, type: 'cannon', color: 'r', row: 5, col: 4, faceUp: true })
    const screen = makePiece({ id: 2, type: 'pawn', color: 'r', row: 3, col: 4, faceUp: true })
    const enemy = makePiece({ id: 3, type: 'pawn', color: 'b', row: 1, col: 4, faceUp: true })
    const grid = place([piece, screen, enemy])
    const moves = getLegalMoves(piece, grid)
    expect(moves).toContainEqual({ row: 1, col: 4 })
    expect(moves).not.toContainEqual({ row: 3, col: 4 })
  })

  it('cannon cannot capture without a screen piece', () => {
    const piece = makePiece({ id: 1, type: 'cannon', color: 'r', row: 5, col: 4, faceUp: true })
    const enemy = makePiece({ id: 2, type: 'pawn', color: 'b', row: 2, col: 4, faceUp: true })
    const grid = place([piece, enemy])
    const moves = getLegalMoves(piece, grid)
    expect(moves).not.toContainEqual({ row: 2, col: 4 })
  })
})

describe('getLegalMoves — revealed pawn (兵/卒)', () => {
  it('red pawn before river: forward = row-1', () => {
    const piece = makePiece({ id: 1, type: 'pawn', color: 'r', row: 6, col: 4, faceUp: true })
    const grid = place([piece])
    const moves = getLegalMoves(piece, grid)
    expect(moves).toEqual([{ row: 5, col: 4 }])
  })

  it('red pawn after river: can move forward or sideways, not backward', () => {
    const piece = makePiece({ id: 1, type: 'pawn', color: 'r', row: 4, col: 4, faceUp: true })
    const grid = place([piece])
    const moves = getLegalMoves(piece, grid)
    expect(moves).toContainEqual({ row: 3, col: 4 })
    expect(moves).toContainEqual({ row: 4, col: 3 })
    expect(moves).toContainEqual({ row: 4, col: 5 })
    expect(moves).toHaveLength(3)
    expect(moves).not.toContainEqual({ row: 5, col: 4 })
  })

  it('black pawn before river: forward = row+1', () => {
    const piece = makePiece({ id: 1, type: 'pawn', color: 'b', row: 3, col: 4, faceUp: true })
    const grid = place([piece])
    const moves = getLegalMoves(piece, grid)
    expect(moves).toEqual([{ row: 4, col: 4 }])
  })
})
