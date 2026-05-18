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
      const r = cellSize * 0.28

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
    _canvasW: number, _canvasH: number,
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

  drawCheckText(
    _canvasW: number, _canvasH: number,
    marginX: number, marginY: number, cellSize: number,
    alpha: number
  ) {
    const ctx = this.ctx
    const cx = marginX + 4 * cellSize
    const cy = marginY + 4.5 * cellSize
    const fontSize = cellSize * 1.5

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.shadowColor = 'rgba(180, 0, 0, 0.7)'
    ctx.shadowBlur = 12
    ctx.font = `bold ${fontSize}px "KaiTi", "楷体", "STKaiti", serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillStyle = '#dc2626'
    ctx.fillText('将', cx, cy)
    ctx.textBaseline = 'top'
    ctx.fillText('军', cx, cy + 4)
    ctx.restore()
  }

  drawCheckmateText(
    _canvasW: number, _canvasH: number,
    marginX: number, marginY: number, cellSize: number,
    alpha: number
  ) {
    const ctx = this.ctx
    const cx = marginX + 4 * cellSize
    const cy = marginY + 4.5 * cellSize
    const fontSize = cellSize * 1.5

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.shadowColor = 'rgba(160, 0, 0, 0.8)'
    ctx.shadowBlur = 16
    ctx.font = `bold ${fontSize}px "KaiTi", "楷体", "STKaiti", serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillStyle = '#b91c1c'
    ctx.fillText('绝', cx, cy)
    ctx.textBaseline = 'top'
    ctx.fillText('杀', cx, cy + 4)
    ctx.restore()
  }

  drawStalemateText(
    _canvasW: number, _canvasH: number,
    marginX: number, marginY: number, cellSize: number,
    alpha: number
  ) {
    const ctx = this.ctx
    const cx = marginX + 4 * cellSize
    const cy = marginY + 4.5 * cellSize
    const fontSize = cellSize * 1.5

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.shadowColor = 'rgba(140, 100, 40, 0.8)'
    ctx.shadowBlur = 16
    ctx.font = `bold ${fontSize}px "KaiTi", "楷体", "STKaiti", serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillStyle = '#a0522d'
    ctx.fillText('困', cx, cy)
    ctx.textBaseline = 'top'
    ctx.fillText('毙', cx, cy + 4)
    ctx.restore()
  }

  drawTimeoutWinText(
    _canvasW: number, _canvasH: number,
    marginX: number, marginY: number, cellSize: number,
    alpha: number, winner: 'r' | 'b'
  ) {
    const ctx = this.ctx
    const cx = marginX + 4 * cellSize
    const cy = marginY + 4.5 * cellSize
    const fontSize = cellSize * 1.3
    const color = winner === 'r' ? '#dc2626' : '#1e293b'
    const text = winner === 'r' ? '红方获胜' : '黑方获胜'

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.shadowColor = winner === 'r' ? 'rgba(180, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.7)'
    ctx.shadowBlur = 16
    ctx.font = `bold ${fontSize}px "KaiTi", "楷体", "STKaiti", serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = color
    ctx.fillText(text, cx, cy)
    ctx.restore()
  }
}

export type { HighlightPoint }
