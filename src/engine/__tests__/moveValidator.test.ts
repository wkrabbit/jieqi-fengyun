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

describe('getLegalMoves — dark piece moves by real type', () => {
  it('dark rook moves like rook and can capture', () => {
    const piece = makePiece({ id: 1, type: 'rook', color: 'r', row: 5, col: 4, faceUp: false })
    const enemy = makePiece({ id: 2, type: 'pawn', color: 'b', row: 5, col: 8, faceUp: true })
    const grid = place([piece, enemy])
    const moves = getLegalMoves(piece, grid)
    expect(moves).toContainEqual({ row: 5, col: 8 })
    expect(moves).toContainEqual({ row: 0, col: 4 })
  })

  it('dark piece moves same as revealed piece of same type', () => {
    const dark = makePiece({ id: 1, type: 'horse', color: 'r', row: 5, col: 4, faceUp: false })
    const revealed = makePiece({ id: 2, type: 'horse', color: 'r', row: 5, col: 4, faceUp: true })
    const grid = place([dark])
    const grid2 = place([revealed])
    expect(getLegalMoves(dark, grid)).toEqual(getLegalMoves(revealed, grid2))
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

  it('horse blocked by leg piece (蹩马脚)', () => {
    const piece = makePiece({ id: 1, type: 'horse', color: 'r', row: 5, col: 4, faceUp: true })
    const legBlocker = makePiece({ id: 2, type: 'pawn', color: 'r', row: 5, col: 3, faceUp: true })
    const grid = place([piece, legBlocker])
    const moves = getLegalMoves(piece, grid)
    expect(moves).not.toContainEqual({ row: 4, col: 2 })
    expect(moves).not.toContainEqual({ row: 6, col: 2 })
  })
})

describe('getLegalMoves — revealed elephant (象/相)', () => {
  it('elephant moves diagonally 2 squares, stays on own side', () => {
    const piece = makePiece({ id: 1, type: 'elephant', color: 'r', row: 7, col: 4, faceUp: true })
    const grid = place([piece])
    const moves = getLegalMoves(piece, grid)
    expect(moves).toContainEqual({ row: 5, col: 2 })
    expect(moves).toContainEqual({ row: 5, col: 6 })
    expect(moves).toContainEqual({ row: 9, col: 2 })
    expect(moves).toContainEqual({ row: 9, col: 6 })
  })

  it('elephant blocked by eye piece (塞象眼)', () => {
    const piece = makePiece({ id: 1, type: 'elephant', color: 'r', row: 7, col: 4, faceUp: true })
    const eyeBlocker = makePiece({ id: 2, type: 'pawn', color: 'r', row: 6, col: 3, faceUp: true })
    const grid = place([piece, eyeBlocker])
    const moves = getLegalMoves(piece, grid)
    expect(moves).not.toContainEqual({ row: 5, col: 2 })
  })

  it('elephant cannot cross the river', () => {
    const piece = makePiece({ id: 1, type: 'elephant', color: 'r', row: 5, col: 2, faceUp: true })
    const grid = place([piece])
    const moves = getLegalMoves(piece, grid)
    for (const m of moves) {
      expect(m.row).toBeGreaterThanOrEqual(5)
    }
  })
})

describe('getLegalMoves — revealed advisor (士)', () => {
  it('advisor moves diagonally inside palace only', () => {
    const piece = makePiece({ id: 1, type: 'advisor', color: 'r', row: 9, col: 4, faceUp: true })
    const grid = place([piece])
    const moves = getLegalMoves(piece, grid)
    expect(moves).toContainEqual({ row: 8, col: 3 })
    expect(moves).toContainEqual({ row: 8, col: 5 })
    expect(moves).toHaveLength(2)
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
  it('red pawn before river: forward = row-1 (up toward opponent)', () => {
    const piece = makePiece({ id: 1, type: 'pawn', color: 'r', row: 6, col: 4, faceUp: true })
    const grid = place([piece])
    const moves = getLegalMoves(piece, grid)
    expect(moves).toEqual([{ row: 5, col: 4 }])
  })

  it('red pawn after river: can move forward or sideways', () => {
    const piece = makePiece({ id: 1, type: 'pawn', color: 'r', row: 4, col: 4, faceUp: true })
    const grid = place([piece])
    const moves = getLegalMoves(piece, grid)
    expect(moves).toContainEqual({ row: 3, col: 4 })  // forward = up
    expect(moves).toContainEqual({ row: 4, col: 3 })  // left
    expect(moves).toContainEqual({ row: 4, col: 5 })  // right
    expect(moves).toHaveLength(3)
  })

  it('pawn cannot move backward', () => {
    const piece = makePiece({ id: 1, type: 'pawn', color: 'r', row: 4, col: 4, faceUp: true })
    const grid = place([piece])
    const moves = getLegalMoves(piece, grid)
    expect(moves).not.toContainEqual({ row: 5, col: 4 })  // backward for red = row+1
  })

  it('black pawn before river: forward = row+1 (down toward opponent)', () => {
    const piece = makePiece({ id: 1, type: 'pawn', color: 'b', row: 3, col: 4, faceUp: true })
    const grid = place([piece])
    const moves = getLegalMoves(piece, grid)
    expect(moves).toEqual([{ row: 4, col: 4 }])
  })
})
