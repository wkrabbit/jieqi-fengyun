import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Piece, Position, PieceType, Color } from '../types'
import { useBoardStore } from './boardStore'
import { getLegalMoves, isInCheck, isCheckmate, isStalemate, getPositionType } from '../engine'
import { wsService } from '../services/ws'
import { useCheatStore } from './cheatStore'

export interface CapturedPiece {
  type: PieceType
  color: Color
  capturedDark: boolean
  posType?: PieceType
}

export const useGameStore = defineStore('game', () => {
  const mode = ref<'local' | 'online'>('local')
  const yourColor = ref<'r' | 'b' | null>(null)
  const currentTurn = ref<'r' | 'b'>('r')
  const phase = ref<'playing' | 'selecting' | 'animating' | 'gameover'>('playing')
  const winner = ref<'r' | 'b' | null>(null)
  const selectedPiece = ref<Piece | null>(null)
  const legalMoves = ref<Position[]>([])
  const lastMove = ref<{ piece: Piece; from: Position; to: Position } | null>(null)
  const gameoverReason = ref<'checkmate' | 'stalemate' | 'resign' | 'timeout' | null>(null)
  const redCaptured = ref<CapturedPiece[]>([])
  const blackCaptured = ref<CapturedPiece[]>([])

  const GAME_TIME = 15 * 60
  const MOVE_TIME = 90
  const noCaptureCount = ref(0)
  const redGameTime = ref(GAME_TIME)
  const blackGameTime = ref(GAME_TIME)
  const redMoveTime = ref(MOVE_TIME)
  const blackMoveTime = ref(MOVE_TIME)

  const isMyTurn = computed(() => {
    if (mode.value === 'local') return true
    return yourColor.value === currentTurn.value
  })

  function selectPiece(piece: Piece | null) {
    if (phase.value !== 'playing' && phase.value !== 'selecting') return
    if (winner.value) return
    if (mode.value === 'online' && !isMyTurn.value) return
    if (piece === null) {
      selectedPiece.value = null
      legalMoves.value = []
      phase.value = 'playing'
      return
    }
    if (piece.color !== currentTurn.value) return
    selectedPiece.value = piece
    const board = useBoardStore()
    const allMoves = getLegalMoves(piece, board.grid)
    legalMoves.value = allMoves.filter(move => {
      const newGrid = board.grid.map(r => [...r])
      newGrid[move.row][move.col] = { ...piece, row: move.row, col: move.col }
      newGrid[piece.row][piece.col] = null
      return !isInCheck(currentTurn.value, newGrid)
    })
    phase.value = 'selecting'
  }

  function moveTo(row: number, col: number) {
    if (phase.value !== 'selecting' || !selectedPiece.value) return
    if (winner.value) return
    const isLegal = legalMoves.value.some(m => m.row === row && m.col === col)
    if (!isLegal) {
      selectedPiece.value = null
      legalMoves.value = []
      phase.value = 'playing'
      return
    }

    const board = useBoardStore()
    const piece = selectedPiece.value
    const from = { row: piece.row, col: piece.col }

    if (mode.value === 'online') {
      const cheatStore = useCheatStore()
      const cheatedType = cheatStore.getCheat(piece.id)
      wsService.send('move', { pieceId: piece.id, toRow: row, toCol: col, cheatedType })
      if (cheatedType) cheatStore.clearCheat(piece.id)
      selectedPiece.value = null
      legalMoves.value = []
      return
    }

    // Local mode
    const target = board.grid[row]?.[col]
    const hadCapture = !!target
    const hadFlip = !piece.faceUp

    if (target) {
      if (!target.faceUp) board.revealPiece(target.id)
      const captured: CapturedPiece = {
        type: target.type, color: target.color, capturedDark: !target.faceUp,
        posType: !target.faceUp ? getPositionType(target.row, target.col) : undefined,
      }
      if (currentTurn.value === 'r') redCaptured.value.push(captured)
      else blackCaptured.value.push(captured)
    }

    board.movePiece(piece.id, row, col)
    if (hadFlip) board.revealPiece(piece.id)
    lastMove.value = { piece: { ...piece, row, col, faceUp: true }, from, to: { row, col } }

    if (hadCapture || hadFlip) noCaptureCount.value = 0
    else noCaptureCount.value++

    selectedPiece.value = null
    legalMoves.value = []
    checkGameEnd()
  }

  function checkGameEnd() {
    const board = useBoardStore()
    const enemyColor = currentTurn.value === 'r' ? 'b' : 'r'
    if (isCheckmate(enemyColor, board.grid, getLegalMoves)) {
      winner.value = currentTurn.value
      phase.value = 'gameover'
      gameoverReason.value = 'checkmate'
      return
    }
    if (isStalemate(enemyColor, board.grid, getLegalMoves)) {
      winner.value = currentTurn.value
      phase.value = 'gameover'
      gameoverReason.value = 'stalemate'
      return
    }
    if (noCaptureCount.value >= 40) {
      winner.value = null
      phase.value = 'gameover'
      gameoverReason.value = 'stalemate'
      return
    }
    if (noAttackForce(board.pieces)) {
      winner.value = null
      phase.value = 'gameover'
      gameoverReason.value = 'stalemate'
      return
    }
    endTurn()
  }

  function noAttackForce(pieces: Piece[]): boolean {
    let redHas = false, blackHas = false
    for (const p of pieces) {
      if (p.type === 'rook' || p.type === 'horse' || p.type === 'cannon' || p.type === 'pawn') {
        if (p.color === 'r') redHas = true
        else blackHas = true
      }
    }
    return !redHas || !blackHas
  }

  function endTurn() {
    if (currentTurn.value === 'r') redMoveTime.value = MOVE_TIME
    else blackMoveTime.value = MOVE_TIME
    currentTurn.value = currentTurn.value === 'r' ? 'b' : 'r'
    selectedPiece.value = null
    legalMoves.value = []
    phase.value = 'playing'
  }

  function resign() {
    if (mode.value === 'online') wsService.send('resign')
    winner.value = mode.value === 'online'
      ? (yourColor.value === 'r' ? 'b' : 'r')
      : (currentTurn.value === 'r' ? 'b' : 'r')
    phase.value = 'gameover'
    gameoverReason.value = 'resign'
  }

  function newGame() {
    if (mode.value === 'online') {
      wsService.send('new_game_request')
      return
    }
    currentTurn.value = 'r'
    phase.value = 'playing'
    winner.value = null
    selectedPiece.value = null
    legalMoves.value = []
    lastMove.value = null
    gameoverReason.value = null
    redCaptured.value = []
    blackCaptured.value = []
    noCaptureCount.value = 0
    resetTimers()
    useBoardStore().resetBoard()
    useCheatStore().clearAll()
  }

  function startOnlineGame(board: Piece[], color: 'r' | 'b', turn: 'r' | 'b', timers?: { redGame: number; blackGame: number; redMove: number; blackMove: number }) {
    mode.value = 'online'
    yourColor.value = color
    currentTurn.value = turn
    phase.value = 'playing'
    winner.value = null
    selectedPiece.value = null
    legalMoves.value = []
    lastMove.value = null
    gameoverReason.value = null
    redCaptured.value = []
    blackCaptured.value = []
    noCaptureCount.value = 0
    if (timers) {
      redGameTime.value = timers.redGame
      blackGameTime.value = timers.blackGame
      redMoveTime.value = timers.redMove
      blackMoveTime.value = timers.blackMove
    } else {
      resetTimers()
    }

    const bStore = useBoardStore()
    bStore.pieces = board.map(p => ({ ...p }))
    bStore.rebuildGrid()
  }

  function handleMoveAccepted(data: Record<string, unknown>) {
    const board = useBoardStore()
    const newBoard = data.board as Piece[]
    board.pieces = newBoard.map(p => ({ ...p }))
    board.rebuildGrid()
    currentTurn.value = data.currentTurn as 'r' | 'b'
    if (data.noCaptureCount !== undefined) noCaptureCount.value = data.noCaptureCount as number
    if (data.timers) {
      const t = data.timers as { redGame: number; blackGame: number; redMove: number; blackMove: number }
      redGameTime.value = t.redGame
      blackGameTime.value = t.blackGame
      redMoveTime.value = t.redMove
      blackMoveTime.value = t.blackMove
    }
    phase.value = 'playing'

    if (data.captured) {
      const cap = data.captured as { type: PieceType; color: Color; capturedDark: boolean; posType?: PieceType }
      const captured: CapturedPiece = { type: cap.type, color: cap.color, capturedDark: cap.capturedDark, posType: cap.posType }
      if (yourColor.value === 'r') redCaptured.value.push(captured)
      else blackCaptured.value.push(captured)
    }

    if (data.gameOver) {
      const over = data.gameOver as { winner: Color; reason: string }
      winner.value = over.winner
      gameoverReason.value = over.reason as 'checkmate' | 'stalemate' | 'resign' | 'timeout' | null
      phase.value = 'gameover'
    }
  }

  function handleOpponentMoved(data: Record<string, unknown>) {
    const board = useBoardStore()
    const newBoard = data.board as Piece[]
    board.pieces = newBoard.map(p => ({ ...p }))
    board.rebuildGrid()
    currentTurn.value = data.currentTurn as 'r' | 'b'
    if (data.noCaptureCount !== undefined) noCaptureCount.value = data.noCaptureCount as number
    if (data.timers) {
      const t = data.timers as { redGame: number; blackGame: number; redMove: number; blackMove: number }
      redGameTime.value = t.redGame
      blackGameTime.value = t.blackGame
      redMoveTime.value = t.redMove
      blackMoveTime.value = t.blackMove
    }
    phase.value = 'playing'
    selectedPiece.value = null
    legalMoves.value = []

    if (data.gameOver) {
      const over = data.gameOver as { winner: Color; reason: string }
      winner.value = over.winner
      gameoverReason.value = over.reason as 'checkmate' | 'stalemate' | 'resign' | 'timeout' | null
      phase.value = 'gameover'
    }
  }

  function handleServerGameOver(data: Record<string, unknown>) {
    winner.value = data.winner as 'r' | 'b'
    gameoverReason.value = (data.reason as string) as 'checkmate' | 'stalemate' | 'resign' | 'timeout'
    phase.value = 'gameover'
  }

  function tick(dt: number) {
    if (phase.value === 'gameover') return
    if (phase.value === 'animating') return

    const dtSec = dt / 1000
    if (currentTurn.value === 'r') {
      redGameTime.value = Math.max(0, redGameTime.value - dtSec)
      redMoveTime.value = Math.max(0, redMoveTime.value - dtSec)
    } else {
      blackGameTime.value = Math.max(0, blackGameTime.value - dtSec)
      blackMoveTime.value = Math.max(0, blackMoveTime.value - dtSec)
    }

    if (redGameTime.value <= 0 || redMoveTime.value <= 0) {
      winner.value = 'b'
      phase.value = 'gameover'
      gameoverReason.value = 'timeout'
    } else if (blackGameTime.value <= 0 || blackMoveTime.value <= 0) {
      winner.value = 'r'
      phase.value = 'gameover'
      gameoverReason.value = 'timeout'
    }
  }

  function resetTimers() {
    redGameTime.value = GAME_TIME
    blackGameTime.value = GAME_TIME
    redMoveTime.value = MOVE_TIME
    blackMoveTime.value = MOVE_TIME
  }

  const inCheck = computed(() => {
    const board = useBoardStore()
    return isInCheck(currentTurn.value, board.grid)
  })

  function setupWsHandlers() {
    wsService.on('move_accepted', (data) => handleMoveAccepted(data))
    wsService.on('move_rejected', (data) => {
      console.warn('Move rejected:', data.reason)
    })
    wsService.on('opponent_moved', (data) => handleOpponentMoved(data))
    wsService.on('game_over', (data) => handleServerGameOver(data))
    wsService.on('opponent_disconnected', (_data) => {
      // Server handles 60s timeout
    })
    wsService.on('game_state', (data) => {
      const board = useBoardStore()
      board.pieces = (data.pieces as Piece[]).map(p => ({ ...p }))
      board.rebuildGrid()
      currentTurn.value = data.currentTurn as 'r' | 'b'
      if (data.timers) {
        const t = data.timers as { redGame: number; blackGame: number; redMove: number; blackMove: number }
        redGameTime.value = t.redGame
        blackGameTime.value = t.blackGame
        redMoveTime.value = t.redMove
        blackMoveTime.value = t.blackMove
      }
    })
    wsService.on('new_game_request', (_data) => {
      wsService.send('new_game_accept')
    })
  }
  setupWsHandlers()

  return {
    mode, yourColor, isMyTurn,
    currentTurn, phase, winner, selectedPiece, legalMoves, lastMove, gameoverReason,
    redGameTime, blackGameTime, redMoveTime, blackMoveTime,
    redCaptured, blackCaptured, noCaptureCount,
    selectPiece, moveTo, resign, newGame, inCheck, tick, resetTimers,
    startOnlineGame, handleOpponentMoved, handleServerGameOver,
  }
})
