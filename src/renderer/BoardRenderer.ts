const WOOD_LIGHT = '#f5deb3'
const WOOD_MID = '#deb887'
const LINE_COLOR = '#5a3020'
const LINE_WIDTH = 1.2

export class BoardRenderer {
  private ctx: CanvasRenderingContext2D

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx
  }

  draw(canvasW: number, canvasH: number, cellSize: number, marginX: number, marginY: number) {
    const ctx = this.ctx
    ctx.clearRect(0, 0, canvasW, canvasH)

    ctx.fillStyle = WOOD_LIGHT
    ctx.fillRect(0, 0, canvasW, canvasH)

    ctx.fillStyle = WOOD_MID
    ctx.fillRect(marginX - cellSize * 0.4, marginY - cellSize * 0.4, cellSize * 8.8, cellSize * 9.8)

    ctx.strokeStyle = LINE_COLOR
    ctx.lineWidth = LINE_WIDTH

    for (let row = 0; row < 10; row++) {
      const y = marginY + row * cellSize
      ctx.beginPath()
      ctx.moveTo(marginX, y)
      ctx.lineTo(marginX + 8 * cellSize, y)
      ctx.stroke()
    }

    for (let col = 0; col < 9; col++) {
      const x = marginX + col * cellSize
      ctx.beginPath()
      ctx.moveTo(x, marginY)
      ctx.lineTo(x, marginY + 4 * cellSize)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x, marginY + 5 * cellSize)
      ctx.lineTo(x, marginY + 9 * cellSize)
      ctx.stroke()
    }

    ctx.beginPath()
    ctx.moveTo(marginX, marginY)
    ctx.lineTo(marginX, marginY + 9 * cellSize)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(marginX + 8 * cellSize, marginY)
    ctx.lineTo(marginX + 8 * cellSize, marginY + 9 * cellSize)
    ctx.stroke()

    ctx.fillStyle = LINE_COLOR
    ctx.font = `${cellSize * 0.55}px "KaiTi", "楷体", "STKaiti", serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const riverY = marginY + 4.5 * cellSize
    ctx.fillText('楚  河', marginX + 2 * cellSize, riverY)
    ctx.fillText('汉  界', marginX + 6 * cellSize, riverY)

    this.drawPalaceDiagonals(marginX, marginY, cellSize, 0)
    this.drawPalaceDiagonals(marginX, marginY, cellSize, 7)
  }

  private drawPalaceDiagonals(mx: number, my: number, cs: number, startRow: number) {
    const ctx = this.ctx
    ctx.beginPath()
    ctx.moveTo(mx + 3 * cs, my + startRow * cs)
    ctx.lineTo(mx + 5 * cs, my + (startRow + 2) * cs)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(mx + 5 * cs, my + startRow * cs)
    ctx.lineTo(mx + 3 * cs, my + (startRow + 2) * cs)
    ctx.stroke()
  }
}
