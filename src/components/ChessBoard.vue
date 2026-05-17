<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useBoardStore } from '../stores/boardStore'
import { useGameStore } from '../stores/gameStore'
import { BoardRenderer } from '../renderer/BoardRenderer'
import { PieceRenderer } from '../renderer/PieceRenderer'
import { EffectRenderer } from '../renderer/EffectRenderer'
import type { HighlightPoint } from '../renderer/EffectRenderer'
import { FlipAnimator } from '../animation/FlipAnimator'
import { MoveAnimator } from '../animation/MoveAnimator'
import { CaptureAnimator } from '../animation/CaptureAnimator'
import { pixelToBoard, boardToPixel, calcBoardDimensions } from '../utils/coordinates'
import { isDarkZone, getLegalMoves, isCheckmate, isStalemate } from '../engine'

const CANVAS_W = 660
const CANVAS_H = 726

const canvasRef = ref<HTMLCanvasElement | null>(null)
const board = useBoardStore()
const game = useGameStore()

let boardRenderer: BoardRenderer
let pieceRenderer: PieceRenderer
let effectRenderer: EffectRenderer
const flipAnimator = new FlipAnimator()
const moveAnimator = new MoveAnimator()
const captureAnimator = new CaptureAnimator()

let cellSize = 60
let marginX = 50
let marginY = 50
let lastTime = 0
let rafId = 0
let checkPulse = 0

function initCtx() {
  const canvas = canvasRef.value
  if (!canvas) return
  canvas.width = CANVAS_W
  canvas.height = CANVAS_H
  const ctx = canvas.getContext('2d')!
  boardRenderer = new BoardRenderer(ctx)
  pieceRenderer = new PieceRenderer(ctx)
  effectRenderer = new EffectRenderer(ctx)
  ;({ cellSize, marginX, marginY } = calcBoardDimensions(CANVAS_W, CANVAS_H))
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function isAnimating(): boolean {
  return flipAnimator.activeCount > 0 || moveAnimator.activeCount > 0 || captureAnimator.activeCount > 0
}

function handleClick(e: MouseEvent) {
  const canvas = canvasRef.value
  if (!canvas || game.phase === 'gameover') return
  if (isAnimating()) return

  const rect = canvas.getBoundingClientRect()
  const scaleX = CANVAS_W / rect.width
  const scaleY = CANVAS_H / rect.height
  const px = (e.clientX - rect.left) * scaleX
  const py = (e.clientY - rect.top) * scaleY

  const pos = pixelToBoard(px, py, CANVAS_W, CANVAS_H, marginX, marginY)
  if (!pos) {
    game.selectPiece(null)
    return
  }

  const clickedPiece = board.grid[pos.row]?.[pos.col]

  // Click own dark piece in dark zone => flip reveal (handled first, with or without selection)
  if (clickedPiece && clickedPiece.color === game.currentTurn && !clickedPiece.faceUp
    && isDarkZone(clickedPiece.row, clickedPiece.color)) {
    game.selectedPiece = null
    game.legalMoves = []
    game.phase = 'animating'
    flipAnimator.start(clickedPiece.id, 200, () => {
      if (game.phase !== 'gameover') {
        // Check end conditions for the opponent (turn hasn't switched yet, so check against current player)
        const enemyColor = game.currentTurn === 'r' ? 'b' : 'r'
        if (isCheckmate(enemyColor, board.grid, getLegalMoves)) {
          game.winner = game.currentTurn
          game.phase = 'gameover'
          return
        }
        if (isStalemate(enemyColor, board.grid, getLegalMoves)) {
          game.winner = game.currentTurn
          game.phase = 'gameover'
          return
        }
        game.lastMove = {
          piece: { ...clickedPiece, faceUp: true },
          from: { row: clickedPiece.row, col: clickedPiece.col },
          to: { row: clickedPiece.row, col: clickedPiece.col },
        }
        game.currentTurn = enemyColor
        game.phase = 'playing'
      }
    })
    return
  }

  if (!game.selectedPiece) {
    if (clickedPiece && clickedPiece.color === game.currentTurn && clickedPiece.faceUp) {
      game.selectPiece(clickedPiece)
    }
  } else {
    // Switch to another own revealed piece
    if (clickedPiece && clickedPiece.color === game.currentTurn && clickedPiece.faceUp
      && clickedPiece.id !== game.selectedPiece.id) {
      game.selectPiece(clickedPiece)
      return
    }
    // Legal move target
    const isLegal = game.legalMoves.some(m => m.row === pos.row && m.col === pos.col)
    if (isLegal && game.selectedPiece) {
      const from = { row: game.selectedPiece.row, col: game.selectedPiece.col }
      const targetPiece = board.grid[pos.row]?.[pos.col]

      if (targetPiece && targetPiece.color !== game.currentTurn) {
        startCaptureAnimation(targetPiece.id)
      }

      startMoveAnimation(game.selectedPiece.id, from, pos)
      game.moveTo(pos.row, pos.col)
      return
    }
    // Click elsewhere => deselect
    game.selectPiece(null)
  }
}

function startMoveAnimation(pieceId: number, from: { row: number; col: number }, to: { row: number; col: number }) {
  const fromPos = boardToPixel(from.row, from.col, CANVAS_W, CANVAS_H, marginX, marginY)
  const toPos = boardToPixel(to.row, to.col, CANVAS_W, CANVAS_H, marginX, marginY)
  moveAnimator.start(pieceId, fromPos.x, fromPos.y, toPos.x, toPos.y, 150, () => {
    checkAnimationsDone()
  })
}

function startCaptureAnimation(pieceId: number) {
  captureAnimator.start(pieceId, 120, () => {
    board.removePiece(pieceId)
    checkAnimationsDone()
  })
}

function checkAnimationsDone() {
  if (!isAnimating()) {
    game.phase = 'playing'
  }
}

function render() {
  if (!canvasRef.value) return

  boardRenderer.draw(CANVAS_W, CANVAS_H, cellSize, marginX, marginY)

  // Build animation progress map
  const animProgress = new Map<number, { x: number; y: number; scale: number; opacity: number }>()

  for (const id of moveAnimator.getAllIds()) {
    const ms = moveAnimator.getAnimState(id)
    if (ms) {
      const t = easeOut(ms.progress)
      animProgress.set(id, {
        x: (ms.toX - ms.fromX) * t,
        y: (ms.toY - ms.fromY) * t,
        scale: 1,
        opacity: 1,
      })
    }
  }

  for (const id of captureAnimator.getAllIds()) {
    const cs = captureAnimator.getActiveState(id)
    if (cs) {
      animProgress.set(id, { x: 0, y: 0, scale: cs.scale, opacity: cs.opacity })
    }
  }

  for (const id of flipAnimator.getAllIds()) {
    const fs = flipAnimator.getFlipState(id)
    if (fs) {
      animProgress.set(id, { x: 0, y: 0, scale: fs.scaleX, opacity: 1 })
    }
  }

  pieceRenderer.drawPieces(board.pieces, cellSize, marginX, marginY, animProgress)

  // Highlights for selected piece
  if (game.selectedPiece && game.phase === 'selecting') {
    const highlights: HighlightPoint[] = game.legalMoves.map(m => {
      const target = board.grid[m.row]?.[m.col]
      return {
        row: m.row,
        col: m.col,
        type: (target && target.color !== game.currentTurn) ? 'capture' : 'move' as const,
      }
    })
    effectRenderer.drawHighlights(highlights, cellSize, marginX, marginY)
    effectRenderer.drawSelectionGlow(game.selectedPiece.row, game.selectedPiece.col, cellSize, marginX, marginY)
  }

  // Check pulse
  if (game.inCheck && game.phase !== 'gameover') {
    effectRenderer.drawCheckPulse(CANVAS_W, CANVAS_H, cellSize, marginX, marginY, checkPulse)
  }
}

function gameLoop(time: number) {
  const dt = lastTime ? Math.min(time - lastTime, 50) : 16
  lastTime = time

  if (isAnimating()) {
    game.phase = 'animating'
    const flipResults = flipAnimator.update(dt, 200)
    for (const r of flipResults) {
      if (r.midPoint) {
        board.revealPiece(r.pieceId)
      }
    }
    moveAnimator.update(dt, 150)
    captureAnimator.update(dt, 120)
  }

  if (game.inCheck) {
    checkPulse += dt / 1000
  } else {
    checkPulse = 0
  }

  render()
  rafId = requestAnimationFrame(gameLoop)
}

onMounted(() => {
  initCtx()
  rafId = requestAnimationFrame(gameLoop)
})

onUnmounted(() => {
  cancelAnimationFrame(rafId)
})
</script>

<template>
  <canvas
    ref="canvasRef"
    @click="handleClick"
    class="rounded-xl shadow-2xl cursor-pointer"
    :style="{ width: CANVAS_W + 'px', height: CANVAS_H + 'px' }"
  />
</template>
