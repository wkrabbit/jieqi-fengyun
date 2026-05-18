import type { Piece } from '../types'
import { getPositionType } from '../engine/constants'

const DARK_FILL = '#c9a66b'
const DARK_STROKE = '#8b6914'
const DARK_RED = '#9b3020'
const DARK_BLACK = '#3a3a3a'
const RED_FILL = '#c0392b'
const RED_STROKE = '#7b241c'
const BLACK_FILL = '#2c3e50'
const BLACK_STROKE = '#1a252f'
const TEXT_LIGHT = '#f0e6d3'

const PIECE_NAMES: Record<string, string> = {
  king: '帅', advisor: '仕', elephant: '相', horse: '馬', rook: '車', cannon: '炮', pawn: '兵',
}

const PIECE_NAMES_BLACK: Record<string, string> = {
  king: '将', advisor: '士', elephant: '象', horse: '馬', rook: '車', cannon: '砲', pawn: '卒',
}

export class PieceRenderer {
  private ctx: CanvasRenderingContext2D

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx
  }

  drawPieces(
    pieces: Piece[],
    cellSize: number, marginX: number, marginY: number,
    animProgress: Map<number, { x: number; y: number; scale: number; opacity: number }>,
    cheatedPieceIds?: Set<number>,
    animStartMap?: Map<number, { row: number; col: number }>,
    flipped: boolean = false,
  ) {
    const ctx = this.ctx
    const sorted = flipped
      ? [...pieces].sort((a, b) => a.row - b.row)
      : [...pieces].sort((a, b) => b.row - a.row)

    for (const piece of sorted) {
      const anim = animProgress.get(piece.id)
      const animX = anim ? anim.x : 0
      const animY = anim ? anim.y : 0
      const animScale = anim ? anim.scale : 1
      const animOpacity = anim ? anim.opacity : 1

      // Use animation start position as base (prevents backward slide after board replacement)
      const animStart = animStartMap?.get(piece.id)
      const baseCol = animStart ? animStart.col : piece.col
      const baseRow = animStart ? animStart.row : piece.row
      const visualRow = flipped ? 9 - baseRow : baseRow
      const visualCol = flipped ? 8 - baseCol : baseCol
      const cx = marginX + visualCol * cellSize + animX
      const cy = marginY + visualRow * cellSize + animY
      const radius = cellSize * 0.43 * animScale

      ctx.save()
      ctx.globalAlpha = animOpacity

      ctx.shadowColor = 'rgba(0,0,0,0.3)'
      ctx.shadowBlur = 3
      ctx.shadowOffsetX = 1
      ctx.shadowOffsetY = 1

      if (!piece.faceUp) {
        this.drawDarkPiece(cx, cy, radius, piece)
      } else {
        this.drawRevealedPiece(cx, cy, radius, piece)
      }

      // Purple glow for cheated but not yet moved pieces
      if (cheatedPieceIds && cheatedPieceIds.has(piece.id)) {
        ctx.shadowColor = 'rgba(168, 85, 247, 0.7)'
        ctx.shadowBlur = 10
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0
        ctx.beginPath()
        ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.8)'
        ctx.lineWidth = 2.5
        ctx.stroke()
      }

      ctx.restore()
    }
  }

  private drawDarkPiece(cx: number, cy: number, radius: number, piece: Piece) {
    const ctx = this.ctx
    const isRed = piece.color === 'r'
    const accentColor = isRed ? DARK_RED : DARK_BLACK

    // Wooden body
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.fillStyle = DARK_FILL
    ctx.fill()
    ctx.strokeStyle = DARK_STROKE
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Inner ring with side-specific color
    ctx.beginPath()
    ctx.arc(cx, cy, radius * 0.8, 0, Math.PI * 2)
    ctx.strokeStyle = accentColor
    ctx.lineWidth = 1.2
    ctx.stroke()

    // Type-specific character in side-specific color (use position-based type)
    const posType = getPositionType(piece.row, piece.col) || piece.type
    const names = isRed ? PIECE_NAMES : PIECE_NAMES_BLACK
    const name = names[posType] || '?'
    ctx.fillStyle = accentColor
    ctx.font = `bold ${radius * 1.1}px "KaiTi", "楷体", "STKaiti", serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(name, cx, cy + 1)
  }

  private drawRevealedPiece(cx: number, cy: number, radius: number, piece: Piece) {
    const ctx = this.ctx
    const isRed = piece.color === 'r'

    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.fillStyle = isRed ? RED_FILL : BLACK_FILL
    ctx.fill()
    ctx.strokeStyle = isRed ? RED_STROKE : BLACK_STROKE
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(cx, cy, radius * 0.78, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'
    ctx.lineWidth = 1
    ctx.stroke()

    const names = isRed ? PIECE_NAMES : PIECE_NAMES_BLACK
    const name = names[piece.type] || '?'
    ctx.fillStyle = isRed ? '#ffd700' : TEXT_LIGHT
    ctx.font = `bold ${radius * 1.1}px "KaiTi", "楷体", "STKaiti", serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(name, cx, cy + 1)
  }
}
