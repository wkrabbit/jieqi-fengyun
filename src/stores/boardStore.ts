import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Piece, BoardGrid } from '../types'
import { generateDeferredLayout } from '../engine/constants'

export const useBoardStore = defineStore('board', () => {
  const pieces = ref<Piece[]>([])
  const grid = ref<BoardGrid>([])

  function buildGrid(pieceList: Piece[]): BoardGrid {
    const g: BoardGrid = Array.from({ length: 10 }, () => Array(9).fill(null))
    for (const p of pieceList) g[p.row][p.col] = p
    return g
  }

  function initBoard() {
    pieces.value = generateDeferredLayout()
    grid.value = buildGrid(pieces.value)
  }

  function movePiece(pieceId: number, toRow: number, toCol: number) {
    const piece = pieces.value.find(p => p.id === pieceId)
    if (!piece) return
    const target = grid.value[toRow][toCol]
    if (target) {
      pieces.value = pieces.value.filter(p => p.id !== target.id)
    }
    piece.row = toRow
    piece.col = toCol
    grid.value = buildGrid(pieces.value)
  }

  function revealPiece(pieceId: number) {
    const piece = pieces.value.find(p => p.id === pieceId)
    if (!piece) return
    piece.faceUp = true
    grid.value = buildGrid(pieces.value)
  }

  function removePiece(pieceId: number) {
    pieces.value = pieces.value.filter(p => p.id !== pieceId)
    grid.value = buildGrid(pieces.value)
  }

  function rebuildGrid() {
    grid.value = buildGrid(pieces.value)
  }

  function resetBoard() {
    initBoard()
  }

  initBoard()

  return { pieces, grid, initBoard, movePiece, revealPiece, removePiece, resetBoard, rebuildGrid }
})
