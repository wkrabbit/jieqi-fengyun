export function boardToPixel(
  row: number, col: number,
  canvasW: number, canvasH: number,
  marginX: number, marginY: number
): { x: number; y: number } {
  const boardW = canvasW - marginX * 2
  const boardH = canvasH - marginY * 2
  const cellW = boardW / 8
  const cellH = boardH / 9
  return {
    x: marginX + col * cellW,
    y: marginY + row * cellH,
  }
}

export function pixelToBoard(
  px: number, py: number,
  canvasW: number, canvasH: number,
  marginX: number, marginY: number
): { row: number; col: number } | null {
  const boardW = canvasW - marginX * 2
  const boardH = canvasH - marginY * 2
  const cellW = boardW / 8
  const cellH = boardH / 9

  const colFloat = (px - marginX) / cellW
  const rowFloat = (py - marginY) / cellH

  if (colFloat < -0.5 || colFloat > 8.5 || rowFloat < -0.5 || rowFloat > 9.5) return null

  const col = Math.round(colFloat)
  const row = Math.round(rowFloat)

  if (col < 0 || col > 8 || row < 0 || row > 9) return null
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
