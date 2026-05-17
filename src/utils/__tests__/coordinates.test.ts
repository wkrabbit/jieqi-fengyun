import { describe, it, expect } from 'vitest'
import { boardToPixel, pixelToBoard } from '../coordinates'

describe('boardToPixel', () => {
  it('returns center of cell for valid board position', () => {
    const { x, y } = boardToPixel(0, 0, 800, 880, 40, 40)
    expect(x).toBeGreaterThan(0)
    expect(y).toBeGreaterThan(0)
  })
})

describe('pixelToBoard', () => {
  it('returns null for clicks outside the board margins', () => {
    const result = pixelToBoard(5, 5, 800, 880, 40, 40)
    expect(result).toBeNull()
  })

  it('returns row and col for a click inside the board', () => {
    const marginX = 40, marginY = 40
    const boardW = 800 - marginX * 2
    const boardH = 880 - marginY * 2
    const cellW = boardW / 8
    const cellH = boardH / 9
    const cx = marginX + 4 * cellW
    const cy = marginY + 4 * cellH
    const result = pixelToBoard(cx, cy, 800, 880, marginX, marginY)
    expect(result).toEqual({ row: 4, col: 4 })
  })
})
