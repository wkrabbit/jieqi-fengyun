import type { Piece, PieceType, Color } from '../../src/types/index.js'
import { generateRandomLayout, getLegalMoves, isInCheck, isCheckmate, isStalemate, getPositionType } from '../../src/engine/index.js'

export interface ServerPiece extends Piece {
  originalType?: PieceType
}

export interface ServerGame {
  pieces: ServerPiece[]
  currentTurn: Color
  moveCount: number
  noCaptureCount: number
  redGameTime: number
  blackGameTime: number
  redMoveTime: number
  blackMoveTime: number
  lastTickTime: number
}

export function createGame(initialRedGameTime?: number, initialBlackGameTime?: number): ServerGame {
  const pieces: ServerPiece[] = generateRandomLayout()
  const now = Date.now()
  return {
    pieces,
    currentTurn: 'r',
    moveCount: 0,
    noCaptureCount: 0,
    redGameTime: initialRedGameTime ?? 15 * 60,
    blackGameTime: initialBlackGameTime ?? 15 * 60,
    redMoveTime: 90,
    blackMoveTime: 90,
    lastTickTime: now,
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
  noCaptureCount: number
  timers: { redGame: number; blackGame: number; redMove: number; blackMove: number }
}

export function tickGame(game: ServerGame, now: number) {
  const dt = (now - game.lastTickTime) / 1000
  game.lastTickTime = now
  if (game.currentTurn === 'r') {
    game.redGameTime = Math.max(0, game.redGameTime - dt)
    game.redMoveTime = Math.max(0, game.redMoveTime - dt)
  } else {
    game.blackGameTime = Math.max(0, game.blackGameTime - dt)
    game.blackMoveTime = Math.max(0, game.blackMoveTime - dt)
  }
  return {
    redGameTime: game.redGameTime,
    blackGameTime: game.blackGameTime,
    redMoveTime: game.redMoveTime,
    blackMoveTime: game.blackMoveTime,
  }
}

export function switchTurnTimer(game: ServerGame) {
  if (game.currentTurn === 'r') game.redMoveTime = 90
  else game.blackMoveTime = 90
  game.lastTickTime = Date.now()
}

export function getTimers(game: ServerGame) {
  return {
    redGame: Math.floor(game.redGameTime),
    blackGame: Math.floor(game.blackGameTime),
    redMove: Math.floor(game.redMoveTime),
    blackMove: Math.floor(game.blackMoveTime),
  }
}

const MAX_PIECE_COUNT: Record<string, number> = {
  rook: 2, horse: 2, elephant: 2, advisor: 2, cannon: 2, pawn: 5,
}

function canCheatType(game: ServerGame, playerColor: Color, targetType: PieceType, excludePieceId: number): boolean {
  const max = MAX_PIECE_COUNT[targetType]
  if (!max) return false
  const count = game.pieces.filter(p => p.color === playerColor && p.type === targetType && p.id !== excludePieceId).length
  return count < max
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
  if (!piece) return { ok: false, noCaptureCount: game.noCaptureCount, timers: getTimers(game), error: '棋子不存在', board: game.pieces }
  if (piece.color !== playerColor) return { ok: false, noCaptureCount: game.noCaptureCount, timers: getTimers(game), error: '不是你的棋子', board: game.pieces }
  if (game.currentTurn !== playerColor) return { ok: false, noCaptureCount: game.noCaptureCount, timers: getTimers(game), error: '还没轮到你', board: game.pieces }

  // Validate move against piece's original type (same as client's dark piece rules)
  const grid = getGrid(game)
  const moves = getLegalMoves(piece, grid)
  const legal = moves.some(m => m.row === toRow && m.col === toCol)
  if (!legal) return { ok: false, noCaptureCount: game.noCaptureCount, timers: getTimers(game), error: '不合法的走法', board: game.pieces }

  // Walk validation passed — apply cheat mutation (changes what the piece becomes)
  let revealed: MoveResult['revealed']
  if (cheatedType && !piece.faceUp && playerColor === piece.color) {
    if (!canCheatType(game, playerColor, cheatedType, piece.id)) {
      return { ok: false, noCaptureCount: game.noCaptureCount, timers: getTimers(game), error: '该类型棋子已达到上限', board: game.pieces }
    }
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
  if (captured || revealed) game.noCaptureCount = 0
  else game.noCaptureCount++

  const enemyColor: Color = playerColor === 'r' ? 'b' : 'r'

  // Switch turn and reset move timer
  game.currentTurn = enemyColor
  switchTurnTimer(game)

  // Check game over
  const newGrid = getGrid(game)
  if (isCheckmate(enemyColor, newGrid, getLegalMoves)) {
    return {
      ok: true,
      timers: getTimers(game),
      noCaptureCount: game.noCaptureCount,
      captured,
      revealed,
      gameOver: { winner: playerColor, reason: 'checkmate' },
      board: game.pieces,
    }
  }
  if (isStalemate(enemyColor, newGrid, getLegalMoves)) {
    return {
      ok: true,
      timers: getTimers(game),
      noCaptureCount: game.noCaptureCount,
      captured,
      revealed,
      gameOver: { winner: playerColor, reason: 'stalemate' },
      board: game.pieces,
    }
  }

  return { ok: true, noCaptureCount: game.noCaptureCount, timers: getTimers(game), captured, revealed, board: game.pieces }
}
