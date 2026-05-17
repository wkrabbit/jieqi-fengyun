import type { Piece, Position, BoardGrid } from '../types'

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row <= 9 && col >= 0 && col <= 8
}

function getRookMoves(piece: Piece, grid: BoardGrid): Position[] {
  const moves: Position[] = []
  const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]]
  for (const [dr, dc] of dirs) {
    let r = piece.row + dr, c = piece.col + dc
    while (inBounds(r, c)) {
      const target = grid[r][c]
      if (target === null) {
        moves.push({ row: r, col: c })
      } else {
        if (target.color !== piece.color) moves.push({ row: r, col: c })
        break
      }
      r += dr; c += dc
    }
  }
  return moves
}

function getHorseMoves(piece: Piece, grid: BoardGrid): Position[] {
  const moves: Position[] = []
  const deltas: [number, number, number, number][] = [
    [-2, -1, -1, 0], [-2, 1, -1, 0],
    [2, -1, 1, 0], [2, 1, 1, 0],
    [-1, -2, 0, -1], [-1, 2, 0, 1],
    [1, -2, 0, -1], [1, 2, 0, 1],
  ]
  for (const [dr, dc, legR, legC] of deltas) {
    const tr = piece.row + dr, tc = piece.col + dc
    if (!inBounds(tr, tc)) continue
    if (grid[piece.row + legR][piece.col + legC] !== null) continue
    const target = grid[tr][tc]
    if (target === null || target.color !== piece.color) {
      moves.push({ row: tr, col: tc })
    }
  }
  return moves
}

function getElephantMoves(piece: Piece, grid: BoardGrid): Position[] {
  const moves: Position[] = []
  const deltas: [number, number, number, number][] = [
    [-2, -2, -1, -1], [-2, 2, -1, 1],
    [2, -2, 1, -1], [2, 2, 1, 1],
  ]
  for (const [dr, dc, eyeR, eyeC] of deltas) {
    const tr = piece.row + dr, tc = piece.col + dc
    if (!inBounds(tr, tc)) continue
    const ownSide = piece.color === 'r' ? tr >= 5 : tr <= 4
    if (!ownSide) continue
    if (grid[piece.row + eyeR][piece.col + eyeC] !== null) continue
    const target = grid[tr][tc]
    if (target === null || target.color !== piece.color) {
      moves.push({ row: tr, col: tc })
    }
  }
  return moves
}

function getAdvisorMoves(piece: Piece, grid: BoardGrid): Position[] {
  const moves: Position[] = []
  const deltas = [[-1, -1], [-1, 1], [1, -1], [1, 1]]
  const minRow = piece.color === 'r' ? 7 : 0
  const maxRow = piece.color === 'r' ? 9 : 2
  for (const [dr, dc] of deltas) {
    const tr = piece.row + dr, tc = piece.col + dc
    if (tr < minRow || tr > maxRow || tc < 3 || tc > 5) continue
    const target = grid[tr][tc]
    if (target === null || target.color !== piece.color) {
      moves.push({ row: tr, col: tc })
    }
  }
  return moves
}

function getKingMoves(piece: Piece, grid: BoardGrid): Position[] {
  const moves: Position[] = []
  const deltas = [[0, 1], [0, -1], [1, 0], [-1, 0]]
  const minRow = piece.color === 'r' ? 7 : 0
  const maxRow = piece.color === 'r' ? 9 : 2
  for (const [dr, dc] of deltas) {
    const tr = piece.row + dr, tc = piece.col + dc
    if (tr < minRow || tr > maxRow || tc < 3 || tc > 5) continue
    const target = grid[tr][tc]
    if (target === null || target.color !== piece.color) {
      moves.push({ row: tr, col: tc })
    }
  }
  return moves
}

function getCannonMoves(piece: Piece, grid: BoardGrid): Position[] {
  const moves: Position[] = []
  const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]]
  for (const [dr, dc] of dirs) {
    let r = piece.row + dr, c = piece.col + dc
    // Non-capture: move like rook until first obstacle
    while (inBounds(r, c) && grid[r][c] === null) {
      moves.push({ row: r, col: c })
      r += dr; c += dc
    }
    if (!inBounds(r, c)) continue
    // Skip the screen piece
    r += dr; c += dc
    // Look for target to capture
    while (inBounds(r, c)) {
      const target = grid[r][c]
      if (target !== null) {
        if (target.color !== piece.color) moves.push({ row: r, col: c })
        break
      }
      r += dr; c += dc
    }
  }
  return moves
}

function getPawnMoves(piece: Piece, grid: BoardGrid): Position[] {
  const moves: Position[] = []
  const forward = piece.color === 'r' ? -1 : 1
  const crossedRiver = piece.color === 'r' ? piece.row <= 4 : piece.row >= 5

  const fr = piece.row + forward
  if (inBounds(fr, piece.col)) {
    const target = grid[fr][piece.col]
    if (target === null || target.color !== piece.color) {
      moves.push({ row: fr, col: piece.col })
    }
  }

  if (crossedRiver) {
    for (const dc of [-1, 1]) {
      const tc = piece.col + dc
      if (inBounds(piece.row, tc)) {
        const target = grid[piece.row][tc]
        if (target === null || target.color !== piece.color) {
          moves.push({ row: piece.row, col: tc })
        }
      }
    }
  }

  return moves
}

const STANDARD_HANDLERS: Record<string, (piece: Piece, grid: BoardGrid) => Position[]> = {
  rook: getRookMoves,
  horse: getHorseMoves,
  elephant: getElephantMoves,
  advisor: getAdvisorMoves,
  king: getKingMoves,
  cannon: getCannonMoves,
  pawn: getPawnMoves,
}

export function getLegalMoves(piece: Piece, grid: BoardGrid): Position[] {
  const handler = STANDARD_HANDLERS[piece.type]
  if (!handler) return []
  return handler(piece, grid)
}
