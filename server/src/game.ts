import type { Piece, PieceType, Color } from '../../src/types/index.js'
import { generateRandomLayout, getLegalMoves, isInCheck, isCheckmate, isStalemate, getPositionType } from '../../src/engine/index.js'

export interface ServerPiece extends Piece {
  originalType?: PieceType
}

export interface ServerGame {
  pieces: ServerPiece[]
  currentTurn: Color
  moveCount: number
}

export function createGame(): ServerGame {
  const pieces: ServerPiece[] = generateRandomLayout()
  return {
    pieces,
    currentTurn: 'r',
    moveCount: 0,
  }
}

export function getGrid(game: ServerGame): (ServerPiece | null)[][] {
  const grid: (ServerPiece | null)[][] = Array.from({ length: 10 }, () => Array(9).fill(null))
  for (const p of game.pieces) grid[p.row][p.col] = p
  return grid
}

export function findPiece(game: ServerGame, pieceId: number): ServerPiece | undefined {
  return game.pieces.find(p => p.id === pieceId)
}

export interface MoveResult {
  ok: boolean
  error?: string
  captured?: { id: number; type: PieceType; color: Color; capturedDark: boolean; posType?: PieceType }
  revealed?: { id: number; type: PieceType }
  gameOver?: { winner: Color; reason: string }
  board: ServerPiece[]
}

export function processMove(
  game: ServerGame,
  pieceId: number,
  toRow: number,
  toCol: number,
  playerColor: Color,
  cheatedType?: PieceType,
): MoveResult {
  const piece = findPiece(game, pieceId)
  if (!piece) return { ok: false, error: '棋子不存在', board: game.pieces }
  if (piece.color !== playerColor) return { ok: false, error: '不是你的棋子', board: game.pieces }
  if (game.currentTurn !== playerColor) return { ok: false, error: '还没轮到你', board: game.pieces }

  const grid = getGrid(game)
  const moves = getLegalMoves(piece, grid)
  const legal = moves.some(m => m.row === toRow && m.col === toCol)
  if (!legal) return { ok: false, error: '不合法的走法', board: game.pieces }

  // Apply cheat if provided
  let revealed: MoveResult['revealed']
  if (cheatedType && !piece.faceUp && playerColor === piece.color) {
    piece.originalType = piece.type
    piece.type = cheatedType
  }

  const target = grid[toRow][toCol]
  const captured = target
    ? {
        id: target.id, type: target.type, color: target.color,
        capturedDark: !target.faceUp,
        posType: !target.faceUp ? getPositionType(target.row, target.col) : undefined,
      }
    : undefined

  // If capturing a piece that had a pending cheat (from VIP), reveal original type
  if (target && !target.faceUp && target.originalType) {
    target.type = target.originalType
    delete target.originalType
    target.faceUp = true
    revealed = { id: target.id, type: target.type }
  } else if (target && !target.faceUp) {
    target.faceUp = true
    revealed = { id: target.id, type: target.type }
  }

  // Remove captured piece
  if (captured) {
    game.pieces = game.pieces.filter(p => p.id !== captured.id)
  }

  // Move piece
  piece.row = toRow
  piece.col = toCol
  if (!piece.faceUp) {
    piece.faceUp = true
    revealed = { id: piece.id, type: piece.type }
  }

  game.moveCount++
  const enemyColor: Color = playerColor === 'r' ? 'b' : 'r'

  // Check game over
  const newGrid = getGrid(game)
  if (isCheckmate(enemyColor, newGrid, getLegalMoves)) {
    game.currentTurn = enemyColor
    return {
      ok: true,
      captured,
      revealed,
      gameOver: { winner: playerColor, reason: 'checkmate' },
      board: game.pieces,
    }
  }
  if (isStalemate(enemyColor, newGrid, getLegalMoves)) {
    game.currentTurn = enemyColor
    return {
      ok: true,
      captured,
      revealed,
      gameOver: { winner: playerColor, reason: 'stalemate' },
      board: game.pieces,
    }
  }

  game.currentTurn = enemyColor
  return { ok: true, captured, revealed, board: game.pieces }
}
