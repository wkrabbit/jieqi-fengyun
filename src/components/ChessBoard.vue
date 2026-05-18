<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useBoardStore } from '../stores/boardStore'
import { useGameStore } from '../stores/gameStore'
import { useCheatStore } from '../stores/cheatStore'
import { BoardRenderer } from '../renderer/BoardRenderer'
import { PieceRenderer } from '../renderer/PieceRenderer'
import { EffectRenderer } from '../renderer/EffectRenderer'
import type { HighlightPoint } from '../renderer/EffectRenderer'
import { FlipAnimator } from '../animation/FlipAnimator'
import { MoveAnimator } from '../animation/MoveAnimator'
import { CaptureAnimator } from '../animation/CaptureAnimator'
import { boardToPixel, calcBoardDimensions } from '../utils/coordinates'
import type { Piece, PieceType } from '../types'
import CheatMenu from './CheatMenu.vue'

const CANVAS_W = 660
const CANVAS_H = 726

const canvasRef = ref<HTMLCanvasElement | null>(null)
const board = useBoardStore()
const game = useGameStore()
const cheat = useCheatStore()

const showCheatMenu = ref(false)
const cheatMenuPos = ref({ x: 0, y: 0 })
const cheatMenuPiece = ref<{ id: number; color: 'r' | 'b' } | null>(null)

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
let checkShowTimer = 0          // > 0 means "将军" text is visible
let checkmateShowTimer = 0      // > 0 means "绝杀" text is visible
let stalemateShowTimer = 0      // > 0 means "困毙" text is visible
let wasInCheck = false
let wasGameover = false

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

function findPieceAt(px: number, py: number): Piece | null {
  const radius = cellSize * 0.45
  // Search top-down (highest row first) so overlapping pieces pick the visible one
  const sorted = [...board.pieces].sort((a, b) => b.row - a.row)
  for (const piece of sorted) {
    const cx = marginX + piece.col * cellSize
    const cy = marginY + piece.row * cellSize
    const dx = px - cx
    const dy = py - cy
    if (dx * dx + dy * dy <= radius * radius) {
      return piece
    }
  }
  return null
}

function handleClick(e: MouseEvent) {
  const canvas = canvasRef.value
  if (!canvas || game.phase === 'gameover') return
  if (isAnimating()) return
  if (game.mode === 'online' && !game.isMyTurn) return

  const rect = canvas.getBoundingClientRect()
  const scaleX = CANVAS_W / rect.width
  const scaleY = CANVAS_H / rect.height
  const px = (e.clientX - rect.left) * scaleX
  const py = (e.clientY - rect.top) * scaleY

  const clickedPiece = findPieceAt(px, py)

  if (!game.selectedPiece) {
    if (clickedPiece && clickedPiece.color === game.currentTurn) {
      game.selectPiece(clickedPiece)
    }
  } else {
    if (clickedPiece && clickedPiece.color === game.currentTurn
      && clickedPiece.id !== game.selectedPiece.id) {
      game.selectPiece(clickedPiece)
      return
    }
    // Legal move target (circle-based hit test, works beyond board edge)
    if (game.selectedPiece) {
      const moveRadius = cellSize * 0.28
      let foundMove: { row: number; col: number } | null = null
      for (const m of game.legalMoves) {
        const cx = marginX + m.col * cellSize
        const cy = marginY + m.row * cellSize
        const dx = px - cx
        const dy = py - cy
        if (dx * dx + dy * dy <= moveRadius * moveRadius) {
          foundMove = m
          break
        }
      }
      if (foundMove) {
        const from = { row: game.selectedPiece.row, col: game.selectedPiece.col }
        const targetPiece = board.grid[foundMove.row]?.[foundMove.col]
        const movingPieceDark = !game.selectedPiece.faceUp

        if (targetPiece && targetPiece.color !== game.currentTurn) {
          startCaptureAnimation(targetPiece.id)
        }

        if (movingPieceDark) {
          startFlipForMove(game.selectedPiece.id)
        }

        startMoveAnimation(game.selectedPiece.id, from, foundMove)
        game.moveTo(foundMove.row, foundMove.col)
        return
      }
    }
    game.selectPiece(null)
  }
}

function handleRightClick(e: MouseEvent) {
  if (!cheat.enabled) return
  const canvas = canvasRef.value
  if (!canvas) return

  e.preventDefault()
  const rect = canvas.getBoundingClientRect()
  const scaleX = CANVAS_W / rect.width
  const scaleY = CANVAS_H / rect.height
  const px = (e.clientX - rect.left) * scaleX
  const py = (e.clientY - rect.top) * scaleY

  const piece = findPieceAt(px, py)
  if (!piece || piece.faceUp) return

  cheatMenuPiece.value = { id: piece.id, color: piece.color }
  cheatMenuPos.value = { x: e.clientX, y: e.clientY }
  showCheatMenu.value = true
}

function handleCheatSelect(type: PieceType) {
  if (cheatMenuPiece.value) {
    cheat.setCheat(cheatMenuPiece.value.id, type)
  }
  showCheatMenu.value = false
  cheatMenuPiece.value = null
}

function handleCheatClose() {
  showCheatMenu.value = false
  cheatMenuPiece.value = null
}

function startFlipForMove(pieceId: number) {
  flipAnimator.start(pieceId, 200, () => {
    checkAnimationsDone()
  })
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
  if (!isAnimating() && game.phase !== 'gameover') {
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

  pieceRenderer.drawPieces(board.pieces, cellSize, marginX, marginY, animProgress, new Set(cheat.pendingCheats.keys()))

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

  if (game.inCheck && game.phase !== 'gameover') {
    effectRenderer.drawCheckPulse(CANVAS_W, CANVAS_H, cellSize, marginX, marginY, checkPulse)
  }

  // "将军" text (1s, fade in/out)
  if (checkShowTimer > 0) {
    const fadeIn = Math.min(checkShowTimer / 0.1, 1)
    const fadeOut = checkShowTimer > 0.9 ? (1.0 - checkShowTimer) / 0.1 : 1
    effectRenderer.drawCheckText(CANVAS_W, CANVAS_H, marginX, marginY, cellSize, fadeIn * fadeOut)
  }

  // "绝杀" text (1s, fade in/out)
  if (checkmateShowTimer > 0) {
    const fadeIn = Math.min(checkmateShowTimer / 0.1, 1)
    const fadeOut = checkmateShowTimer > 0.9 ? (1.0 - checkmateShowTimer) / 0.1 : 1
    effectRenderer.drawCheckmateText(CANVAS_W, CANVAS_H, marginX, marginY, cellSize, fadeIn * fadeOut)
  }

  // "困毙" text (1s, fade in/out)
  if (stalemateShowTimer > 0) {
    const fadeIn = Math.min(stalemateShowTimer / 0.1, 1)
    const fadeOut = stalemateShowTimer > 0.9 ? (1.0 - stalemateShowTimer) / 0.1 : 1
    effectRenderer.drawStalemateText(CANVAS_W, CANVAS_H, marginX, marginY, cellSize, fadeIn * fadeOut)
  }
}

function gameLoop(time: number) {
  const dt = lastTime ? Math.min(time - lastTime, 50) : 16
  lastTime = time

  if (isAnimating() && game.phase !== 'gameover') {
    game.phase = 'animating'
  }

  if (isAnimating()) {
    const flipResults = flipAnimator.update(dt, 200)
    for (const r of flipResults) {
      if (r.midPoint) {
        board.revealPiece(r.pieceId)
      }
    }
    moveAnimator.update(dt, 150)
    captureAnimator.update(dt, 120)
  }

  game.tick(dt)

  // Check text trigger — rising edge of inCheck
  if (game.inCheck && !wasInCheck && game.phase !== 'gameover') {
    checkShowTimer = 1.0
  }
  wasInCheck = game.inCheck

  // Checkmate text trigger — rising edge of gameover with checkmate
  if (!wasGameover && game.phase === 'gameover' && game.gameoverReason === 'checkmate') {
    checkmateShowTimer = 1.0
  }
  // Stalemate text trigger — rising edge of gameover with stalemate
  if (!wasGameover && game.phase === 'gameover' && game.gameoverReason === 'stalemate') {
    stalemateShowTimer = 1.0
  }
  wasGameover = game.phase === 'gameover'

  if (game.inCheck) {
    checkPulse += dt / 1000
  } else {
    checkPulse = 0
    wasInCheck = false
  }

  // Update text timers
  if (checkShowTimer > 0) checkShowTimer = Math.max(0, checkShowTimer - dt / 1000)
  if (checkmateShowTimer > 0) checkmateShowTimer = Math.max(0, checkmateShowTimer - dt / 1000)
  if (stalemateShowTimer > 0) stalemateShowTimer = Math.max(0, stalemateShowTimer - dt / 1000)

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
    @contextmenu="handleRightClick"
    class="rounded-xl shadow-2xl cursor-pointer"
    :style="{ width: CANVAS_W + 'px', height: CANVAS_H + 'px' }"
  />
  <CheatMenu
    v-if="showCheatMenu && cheatMenuPiece"
    :x="cheatMenuPos.x"
    :y="cheatMenuPos.y"
    :color="cheatMenuPiece.color"
    @select="handleCheatSelect"
    @close="handleCheatClose"
  />
</template>
