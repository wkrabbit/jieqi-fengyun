interface HighlightPoint {
  row: number
  col: number
  type: 'move' | 'capture'
}

export class EffectRenderer {
  private ctx: CanvasRenderingContext2D

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx
  }

  drawHighlights(
    highlights: HighlightPoint[],
    cellSize: number, marginX: number, marginY: number
  ) {
    const ctx = this.ctx
    for (const h of highlights) {
      const cx = marginX + h.col * cellSize
      const cy = marginY + h.row * cellSize
      const r = cellSize * 0.22

      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fillStyle = h.type === 'capture'
        ? 'rgba(255, 68, 68, 0.45)'
        : 'rgba(46, 204, 113, 0.45)'
      ctx.fill()
    }
  }

  drawSelectionGlow(
    row: number, col: number,
    cellSize: number, marginX: number, marginY: number
  ) {
    const ctx = this.ctx
    const cx = marginX + col * cellSize
    const cy = marginY + row * cellSize
    const r = cellSize * 0.48

    ctx.save()
    ctx.shadowColor = '#ffd700'
    ctx.shadowBlur = 14
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.strokeStyle = '#ffd700'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.restore()
  }

  drawCheckPulse(
    canvasW: number, canvasH: number,
    cellSize: number, marginX: number, marginY: number,
    pulsePhase: number
  ) {
    const ctx = this.ctx
    const alpha = Math.sin(pulsePhase * Math.PI * 3) * 0.3 + 0.1
    const boardLeft = marginX - cellSize * 0.4
    const boardTop = marginY - cellSize * 0.4
    const boardRight = marginX + cellSize * 8.4
    const boardBottom = marginY + cellSize * 9.4

    ctx.save()
    ctx.strokeStyle = `rgba(255, 50, 50, ${alpha})`
    ctx.lineWidth = 6
    ctx.shadowColor = `rgba(255, 0, 0, ${alpha})`
    ctx.shadowBlur = 20
    ctx.strokeRect(boardLeft, boardTop, boardRight - boardLeft, boardBottom - boardTop)
    ctx.restore()
  }
}

export type { HighlightPoint }
