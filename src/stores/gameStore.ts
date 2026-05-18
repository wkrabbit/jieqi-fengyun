import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Piece, Position, PieceType, Color } from '../types'
import { useBoardStore } from './boardStore'
import { getLegalMoves, isInCheck, isCheckmate, isStalemate, getPositionType } from '../engine'
import { p2pService } from '../services/p2p'
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
  let noCaptureCount = 0
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

    const target = board.grid[row]?.[col]

    if (target) {
      const capturedDark = !target.faceUp
      const captured: CapturedPiece = {
        type: target.type,
        color: target.color,
        capturedDark,
        posType: capturedDark ? getPositionType(target.row, target.col) : undefined,
      }
      if (currentTurn.value === 'r') {
        redCaptured.value.push(captured)
      } else {
        blackCaptured.value.push(captured)
      }
      if (capturedDark) {
        board.revealPiece(target.id)
      }
    }

    const hadCapture = !!target
    const hadFlip = !piece.faceUp

    board.movePiece(piece.id, row, col)
    if (hadFlip) {
      board.revealPiece(piece.id)
    }
    lastMove.value = { piece: { ...piece, row, col, faceUp: true }, from, to: { row, col } }

    if (hadCapture || hadFlip) {
      noCaptureCount = 0
    } else {
      noCaptureCount++
    }
    selectedPiece.value = null
    legalMoves.value = []

    if (mode.value === 'online') {
      // P2P: send move directly to peer, include cheat if any
      const cheatStore = useCheatStore()
      const cheatedType = cheatStore.getCheat(piece.id)
      const sent = p2pService.send('move', {
        pieceId: piece.id, fromRow: from.row, fromCol: from.col,
        toRow: row, toCol: col, cheatedType,
      })
      if (sent === false) {
        console.warn('P2P send failed, connection may be lost')
      }
      if (cheatedType) cheatStore.clearCheat(piece.id)
      checkGameEnd()
      return
    }

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

    // 40-move draw: no captures or flips for 40 consecutive moves
    if (noCaptureCount >= 40) {
      winner.value = null
      phase.value = 'gameover'
      gameoverReason.value = 'stalemate'
      return
    }

    // No attack force draw
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
    if (currentTurn.value === 'r') {
      redMoveTime.value = MOVE_TIME
    } else {
      blackMoveTime.value = MOVE_TIME
    }
    currentTurn.value = currentTurn.value === 'r' ? 'b' : 'r'
    selectedPiece.value = null
    legalMoves.value = []
    phase.value = 'playing'
  }

  function resign() {
    if (mode.value === 'online') {
      p2pService.send('resign')
    }
    winner.value = mode.value === 'online'
      ? (yourColor.value === 'r' ? 'b' : 'r')
      : (currentTurn.value === 'r' ? 'b' : 'r')
    phase.value = 'gameover'
    gameoverReason.value = 'resign'
  }

  function startOnlineGame(board: Piece[], color: 'r' | 'b', turn: 'r' | 'b') {
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
    resetTimers()

    const bStore = useBoardStore()
    bStore.pieces = board.map(p => ({ ...p }))
    bStore.rebuildGrid()
  }

  function handleOpponentMoved(data: Record<string, unknown>) {
    const board = useBoardStore()
    const pieceId = data.pieceId as number
    const toRow = data.toRow as number
    const toCol = data.toCol as number
    const fromRow = data.fromRow as number
    const fromCol = data.fromCol as number

    let piece: Piece | null | undefined = board.pieces.find(p => p.id === pieceId)
    if (!piece) {
      piece = board.grid[fromRow]?.[fromCol]
    }
    if (!piece) return

    board.movePiece(pieceId, toRow, toCol)
    if (!piece.faceUp) {
      board.revealPiece(pieceId)
    }
    lastMove.value = {
      piece: { ...piece, row: toRow, col: toCol, faceUp: true },
      from: { row: fromRow, col: fromCol },
      to: { row: toRow, col: toCol },
    }
    currentTurn.value = currentTurn.value === 'r' ? 'b' : 'r'
    phase.value = 'playing'
    selectedPiece.value = null
    legalMoves.value = []
  }

  function handleServerGameOver(data: Record<string, unknown>) {
    winner.value = data.winner as 'r' | 'b'
    gameoverReason.value = (data.reason as string | undefined) as 'checkmate' | 'stalemate' | 'resign' | 'timeout' | null
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

  function newGame() {
    if (mode.value === 'online') {
      p2pService.send('new_game')
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
    noCaptureCount = 0
    resetTimers()
    useBoardStore().resetBoard()
  }

  const inCheck = computed(() => {
    const board = useBoardStore()
    return isInCheck(currentTurn.value, board.grid)
  })

  function setupP2pHandlers() {
    p2pService.on('move', (data) => handleOpponentMoved(data))
    p2pService.on('resign', () => handleServerGameOver({
      winner: yourColor.value === 'r' ? 'b' : 'r',
      reason: 'resign',
    }))
    p2pService.on('new_game', () => {
      newGame()
    })
    p2pService.on('_disconnected', () => {
    })
  }
  setupP2pHandlers()

  return {
    mode, yourColor, isMyTurn,
    currentTurn, phase, winner, selectedPiece, legalMoves, lastMove, gameoverReason,
    redGameTime, blackGameTime, redMoveTime, blackMoveTime,
    redCaptured, blackCaptured,
    selectPiece, moveTo, resign, newGame, inCheck, tick, resetTimers,
    startOnlineGame, handleOpponentMoved, handleServerGameOver,
  }
})
