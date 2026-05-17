import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Piece, Position } from '../types'
import { useBoardStore } from './boardStore'
import { getLegalMoves, isInCheck, isCheckmate, isStalemate } from '../engine'

export interface Animation {
  type: 'flip' | 'move' | 'capture' | 'check'
  duration: number
  pieceId?: number
  fromRow?: number
  fromCol?: number
  toRow?: number
  toCol?: number
  onComplete: () => void
}

export const useGameStore = defineStore('game', () => {
  const currentTurn = ref<'r' | 'b'>('r')
  const phase = ref<'playing' | 'selecting' | 'animating' | 'gameover'>('playing')
  const winner = ref<'r' | 'b' | null>(null)
  const selectedPiece = ref<Piece | null>(null)
  const legalMoves = ref<Position[]>([])
  const animQueue = ref<Animation[]>([])
  const lastMove = ref<{ piece: Piece; from: Position; to: Position } | null>(null)

  function selectPiece(piece: Piece | null) {
    if (phase.value !== 'playing') return
    if (piece === null) {
      selectedPiece.value = null
      legalMoves.value = []
      phase.value = 'playing'
      return
    }
    if (piece.color !== currentTurn.value || !piece.faceUp) return
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

    if (target && !target.faceUp) {
      board.revealPiece(target.id)
    }

    board.movePiece(piece.id, row, col)
    lastMove.value = { piece: { ...piece, row, col }, from, to: { row, col } }
    selectedPiece.value = null
    legalMoves.value = []

    const enemyColor = currentTurn.value === 'r' ? 'b' : 'r'
    if (isCheckmate(enemyColor, board.grid, getLegalMoves)) {
      winner.value = currentTurn.value
      phase.value = 'gameover'
      return
    }
    if (isStalemate(enemyColor, board.grid, getLegalMoves)) {
      winner.value = currentTurn.value
      phase.value = 'gameover'
      return
    }

    endTurn()
  }

  function endTurn() {
    currentTurn.value = currentTurn.value === 'r' ? 'b' : 'r'
    selectedPiece.value = null
    legalMoves.value = []
    phase.value = 'playing'
  }

  function resign() {
    winner.value = currentTurn.value === 'r' ? 'b' : 'r'
    phase.value = 'gameover'
  }

  function newGame() {
    currentTurn.value = 'r'
    phase.value = 'playing'
    winner.value = null
    selectedPiece.value = null
    legalMoves.value = []
    animQueue.value = []
    lastMove.value = null
    useBoardStore().resetBoard()
  }

  const inCheck = computed(() => {
    const board = useBoardStore()
    return isInCheck(currentTurn.value, board.grid)
  })

  return {
    currentTurn, phase, winner, selectedPiece, legalMoves, animQueue, lastMove,
    selectPiece, moveTo, resign, newGame, inCheck,
  }
})
