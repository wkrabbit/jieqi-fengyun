import type { Piece } from '../types'

const DARK_FILL = '#c9a66b'
const DARK_STROKE = '#8b6914'
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
    animProgress: Map<number, { x: number; y: number; scale: number; opacity: number }>
  ) {
    const ctx = this.ctx
    const sorted = [...pieces].sort((a, b) => a.row - b.row)

    for (const piece of sorted) {
      const anim = animProgress.get(piece.id)
      const animX = anim ? anim.x : 0
      const animY = anim ? anim.y : 0
      const animScale = anim ? anim.scale : 1
      const animOpacity = anim ? anim.opacity : 1

      const cx = marginX + piece.col * cellSize + animX
      const cy = marginY + piece.row * cellSize + animY
      const radius = cellSize * 0.43 * animScale

      ctx.save()
      ctx.globalAlpha = animOpacity

      ctx.shadowColor = 'rgba(0,0,0,0.3)'
      ctx.shadowBlur = 3
      ctx.shadowOffsetX = 1
      ctx.shadowOffsetY = 1

      if (!piece.faceUp) {
        this.drawDarkPiece(cx, cy, radius)
      } else {
        this.drawRevealedPiece(cx, cy, radius, piece)
      }

      ctx.restore()
    }
  }

  private drawDarkPiece(cx: number, cy: number, radius: number) {
    const ctx = this.ctx
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.fillStyle = DARK_FILL
    ctx.fill()
    ctx.strokeStyle = DARK_STROKE
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(cx, cy, radius * 0.8, 0, Math.PI * 2)
    ctx.strokeStyle = DARK_STROKE
    ctx.lineWidth = 0.8
    ctx.stroke()

    ctx.fillStyle = DARK_STROKE
    ctx.font = `bold ${radius * 1.1}px "KaiTi", "楷体", serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('暗', cx, cy + 1)
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
