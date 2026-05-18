export function boardToPixel(
  row: number, col: number,
  canvasW: number, canvasH: number,
  marginX: number, marginY: number,
  flipped: boolean = false,
): { x: number; y: number } {
  const boardW = canvasW - marginX * 2
  const boardH = canvasH - marginY * 2
  const cellW = boardW / 8
  const cellH = boardH / 9
  const visualRow = flipped ? 9 - row : row
  return {
    x: marginX + col * cellW,
    y: marginY + visualRow * cellH,
  }
}

export function pixelToBoard(
  px: number, py: number,
  canvasW: number, canvasH: number,
  marginX: number, marginY: number,
  flipped: boolean = false,
): { row: number; col: number } | null {
  const boardW = canvasW - marginX * 2
  const boardH = canvasH - marginY * 2
  const cellW = boardW / 8
  const cellH = boardH / 9

  if (px < marginX || px > marginX + boardW || py < marginY || py > marginY + boardH) return null

  const col = Math.round((px - marginX) / cellW)
  const visualRow = Math.round((py - marginY) / cellH)

  if (col < 0 || col > 8 || visualRow < 0 || visualRow > 9) return null
  const row = flipped ? 9 - visualRow : visualRow
  return { row, col }
}

export function calcBoardDimensions(canvasW: number, canvasH: number): {
  cellSize: number
  marginX: number
  marginY: number
} {
  const maxCellW = canvasW / 10
  const maxCellH = canvasH / 11
  const cellSize = Math.floor(Math.min(maxCellW, maxCellH))
  const boardW = cellSize * 8
  const boardH = cellSize * 9
  const marginX = Math.floor((canvasW - boardW) / 2)
  const marginY = Math.floor((canvasH - boardH) / 2)
  return { cellSize, marginX, marginY }
}
