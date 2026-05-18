import type { Piece, PieceType, Color } from '../../src/types/index.js'
import {
  generateRandomLayout,
  generateRandomLayoutWithCheats,
  getLegalMoves,
  isInCheck,
  isCheckmate,
  isStalemate,
  getPositionType,
  canAssignCheatType,
  buildAllocatedCounts,
} from '../../src/engine/index.js'

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
  allocatedCounts?: Record<Color, Record<PieceType, number>>
}

export function createGame(cheatMap?: Map<number, PieceType>, initialRedGameTime?: number, initialBlackGameTime?: number): ServerGame {
  const pieces: ServerPiece[] = cheatMap && cheatMap.size > 0 ? generateRandomLayoutWithCheats(cheatMap) : generateRandomLayout()
  const now = Date.now()
  for (const p of pieces) {
    if (!p.faceUp && p.type !== 'king') {
      p.originalType = p.type
    }
  }

  const game: ServerGame = {
    pieces,
    currentTurn: 'r',
    moveCount: 0,
    noCaptureCount: 0,
    redGameTime: initialRedGameTime ?? 15 * 60,
    blackGameTime: initialBlackGameTime ?? 15 * 60,
    redMoveTime: 90,
    blackMoveTime: 90,
    lastTickTime: now,
    allocatedCounts: buildAllocatedCounts(pieces),
  }
  return game
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

  // Cheat capacity check before move validation (fail fast)
  if (cheatedType && !piece.faceUp && playerColor === piece.color) {
    if (!canAssignCheatType(game.pieces, playerColor, cheatedType, piece.id)) {
      return { ok: false, noCaptureCount: game.noCaptureCount, timers: getTimers(game), error: '该类型棋子已达到上限', board: game.pieces }
    }
  }

  // Validate move using cheated type when applicable
  const grid = getGrid(game)
  const effectivePiece = (cheatedType && !piece.faceUp && playerColor === piece.color)
    ? { ...piece, type: cheatedType, faceUp: true }
    : piece
  const moves = getLegalMoves(effectivePiece, grid)
  const legal = moves.some(m => m.row === toRow && m.col === toCol)
  if (!legal) return { ok: false, noCaptureCount: game.noCaptureCount, timers: getTimers(game), error: '不合法的走法', board: game.pieces }

  // Apply cheat mutation
  let revealed: MoveResult['revealed']
  if (cheatedType && !piece.faceUp && playerColor === piece.color) {
    piece.originalType = piece.type
    // update allocatedCounts
    if (game.allocatedCounts) {
      const ac = game.allocatedCounts[playerColor]
      ac[piece.type] = (ac[piece.type] || 0) - 1
      ac[cheatedType] = (ac[cheatedType] || 0) + 1
    }
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
    // update allocatedCounts for captured piece
    if (game.allocatedCounts && captured) {
      const ac = game.allocatedCounts[captured.color]
      ac[captured.type] = Math.max(0, (ac[captured.type] || 0) - 1)
    }
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
