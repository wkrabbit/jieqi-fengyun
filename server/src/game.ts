import type { Piece, PieceType, Color } from '../../src/types/index.js'
import {
  generateDeferredLayout,
  getLegalMoves,
  isCheckmate,
  isStalemate,
  getPositionType,
  pieceForMoveValidation,
  createInitialPools,
  createRng,
  revealAndConsume,
  canPresetType,
  clonePools,
  type ColorPools,
  type CheatPresets,
} from '../../src/engine/index.js'

export interface ServerPiece extends Piece {}

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
  remainingPool: ColorPools
  cheatPresets: CheatPresets
  rng: () => number
}

export function createGame(
  initialPresets?: CheatPresets,
  initialRedGameTime?: number,
  initialBlackGameTime?: number,
  rngSeed?: number,
): ServerGame {
  const pieces: ServerPiece[] = generateDeferredLayout()
  const now = Date.now()
  const presets: CheatPresets = initialPresets ? new Map(initialPresets) : new Map()

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
    remainingPool: createInitialPools(),
    cheatPresets: presets,
    rng: createRng(rngSeed ?? (now % 2147483647)),
  }
}

export function registerCheatPresets(
  game: ServerGame,
  presets: CheatPresets,
): Array<{ id: number; type: PieceType }> {
  const accepted: Array<{ id: number; type: PieceType }> = []
  for (const [id, type] of presets) {
    const piece = findPiece(game, id)
    if (!piece || piece.faceUp) continue
    if (!canPresetType(game.remainingPool, game.cheatPresets, game.pieces, piece.color, id, type)) {
      continue
    }
    game.cheatPresets.set(id, type)
    accepted.push({ id, type })
  }
  return accepted
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
  capturedReveal?: { id: number; type: PieceType }
  presetRejected?: boolean
  remainingPool?: ColorPools
  board: ServerPiece[]
  noCaptureCount: number
  timers: { redGame: number; blackGame: number; redMove: number; blackMove: number }
  gameOver?: { winner: Color; reason: string }
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

function ensureRevealed(
  game: ServerGame,
  piece: ServerPiece,
  requestedPreset?: PieceType,
): { type: PieceType; presetRejected?: boolean } {
  if (piece.faceUp) return { type: piece.type }
  const result = revealAndConsume(
    game.remainingPool,
    game.cheatPresets,
    piece,
    requestedPreset,
    game.rng,
  )
  return { type: result.type, presetRejected: result.presetRejected }
}

export function processMove(
  game: ServerGame,
  pieceId: number,
  toRow: number,
  toCol: number,
  playerColor: Color,
  cheatedType?: PieceType,
): MoveResult {
  const base = {
    noCaptureCount: game.noCaptureCount,
    timers: getTimers(game),
    board: game.pieces,
  }

  const piece = findPiece(game, pieceId)
  if (!piece) return { ok: false, ...base, error: '棋子不存在' }
  if (piece.color !== playerColor) return { ok: false, ...base, error: '不是你的棋子' }
  if (game.currentTurn !== playerColor) return { ok: false, ...base, error: '还没轮到你' }

  if (cheatedType && !piece.faceUp) {
    if (canPresetType(game.remainingPool, game.cheatPresets, game.pieces, piece.color, piece.id, cheatedType)) {
      game.cheatPresets.set(piece.id, cheatedType)
    } else {
      game.cheatPresets.delete(piece.id)
    }
  }

  const grid = getGrid(game)
  const pendingForValidation = cheatedType && !piece.faceUp
    ? new Map([[piece.id, cheatedType]])
    : game.cheatPresets
  const effectivePiece = pieceForMoveValidation(piece, pendingForValidation)
  const moves = getLegalMoves(effectivePiece, grid)
  const legal = moves.some(m => m.row === toRow && m.col === toCol)
  if (!legal) return { ok: false, ...base, error: '不合法的走法' }

  let revealed: MoveResult['revealed']
  let capturedReveal: MoveResult['capturedReveal']
  let presetRejected = false

  const target = grid[toRow][toCol]
  const captured = target
    ? {
        id: target.id,
        type: target.type,
        color: target.color,
        capturedDark: !target.faceUp,
        posType: !target.faceUp ? getPositionType(target.row, target.col) : undefined,
      }
    : undefined

  if (target && !target.faceUp) {
    const rev = ensureRevealed(game, target)
    captured.type = rev.type
    captured.capturedDark = false
    capturedReveal = { id: target.id, type: rev.type }
  } else if (target) {
    captured.capturedDark = false
  }

  if (!piece.faceUp) {
    const rev = ensureRevealed(game, piece, cheatedType)
    revealed = { id: piece.id, type: rev.type }
    if (rev.presetRejected) presetRejected = true
  }

  if (captured) {
    game.pieces = game.pieces.filter(p => p.id !== captured.id)
    game.cheatPresets.delete(captured.id)
  }

  piece.row = toRow
  piece.col = toCol

  game.moveCount++
  if (captured || revealed) game.noCaptureCount = 0
  else game.noCaptureCount++

  game.currentTurn = playerColor === 'r' ? 'b' : 'r'
  switchTurnTimer(game)

  const poolSnapshot = clonePools(game.remainingPool)
  const newGrid = getGrid(game)
  const endPayload = {
    ok: true as const,
    noCaptureCount: game.noCaptureCount,
    timers: getTimers(game),
    captured,
    revealed,
    capturedReveal,
    presetRejected: presetRejected || undefined,
    remainingPool: poolSnapshot,
    board: game.pieces,
  }

  const enemyColor: Color = playerColor === 'r' ? 'b' : 'r'
  if (isCheckmate(enemyColor, newGrid, getLegalMoves)) {
    return { ...endPayload, gameOver: { winner: playerColor, reason: 'checkmate' } }
  }
  if (isStalemate(enemyColor, newGrid, getLegalMoves)) {
    return { ...endPayload, gameOver: { winner: playerColor, reason: 'stalemate' } }
  }

  return endPayload
}
