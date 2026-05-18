import { describe, it, expect } from 'vitest'
import { PIECE_TYPES, INITIAL_LAYOUT, isDarkZone, generateRandomLayout } from '../constants'
import type { Piece } from '../../types'

describe('PIECE_TYPES', () => {
  it('has 7 piece types', () => {
    expect(PIECE_TYPES).toHaveLength(7)
  })
})

describe('INITIAL_LAYOUT', () => {
  it('places 32 pieces on the board', () => {
    const pieces = INITIAL_LAYOUT as Piece[]
    expect(pieces).toHaveLength(32)
  })

  it('has 16 red and 16 black pieces', () => {
    const pieces = INITIAL_LAYOUT as Piece[]
    expect(pieces.filter(p => p.color === 'r')).toHaveLength(16)
    expect(pieces.filter(p => p.color === 'b')).toHaveLength(16)
  })

  it('kings start faceUp, others faceDown', () => {
    const pieces = INITIAL_LAYOUT as Piece[]
    const kings = pieces.filter(p => p.type === 'king')
    const others = pieces.filter(p => p.type !== 'king')
    expect(kings.every(p => p.faceUp)).toBe(true)
    expect(others.every(p => !p.faceUp)).toBe(true)
  })
})

describe('generateRandomLayout', () => {
  it('places 32 pieces on the board', () => {
    const pieces = generateRandomLayout()
    expect(pieces).toHaveLength(32)
  })

  it('has 16 red and 16 black pieces', () => {
    const pieces = generateRandomLayout()
    expect(pieces.filter(p => p.color === 'r')).toHaveLength(16)
    expect(pieces.filter(p => p.color === 'b')).toHaveLength(16)
  })

  it('kings are at (0,4) and (9,4) and faceUp', () => {
    const pieces = generateRandomLayout()
    const bk = pieces.find(p => p.type === 'king' && p.color === 'b')!
    const rk = pieces.find(p => p.type === 'king' && p.color === 'r')!
    expect(bk.row).toBe(0); expect(bk.col).toBe(4); expect(bk.faceUp).toBe(true)
    expect(rk.row).toBe(9); expect(rk.col).toBe(4); expect(rk.faceUp).toBe(true)
  })

  it('all non-king pieces start faceDown', () => {
    const pieces = generateRandomLayout()
    const others = pieces.filter(p => p.type !== 'king')
    expect(others.every(p => !p.faceUp)).toBe(true)
  })

  it('correct piece counts per type per color', () => {
    const pieces = generateRandomLayout()
    const redPieces = pieces.filter(p => p.color === 'r' && p.type !== 'king')
    const blackPieces = pieces.filter(p => p.color === 'b' && p.type !== 'king')
    const counts = (list: Piece[]) => {
      const m = new Map<string, number>()
      for (const p of list) m.set(p.type, (m.get(p.type) || 0) + 1)
      return m
    }
    const expected = { rook: 2, horse: 2, elephant: 2, advisor: 2, cannon: 2, pawn: 5 }
    expect(Object.fromEntries(counts(redPieces))).toEqual(expected)
    expect(Object.fromEntries(counts(blackPieces))).toEqual(expected)
  })

  it('all pieces have unique IDs', () => {
    const pieces = generateRandomLayout()
    const ids = pieces.map(p => p.id)
    expect(new Set(ids).size).toBe(32)
  })

  it('two consecutive calls produce different layouts (probabilistic)', () => {
    // Run 5 pairs — all must differ
    for (let i = 0; i < 5; i++) {
      const a = generateRandomLayout().map(p => `${p.type}@${p.row},${p.col}`).join('|')
      const b = generateRandomLayout().map(p => `${p.type}@${p.row},${p.col}`).join('|')
      expect(a).not.toBe(b)
    }
  })

  it('preset positions are all distinct and within board bounds', () => {
    const pieces = generateRandomLayout()
    const dark = pieces.filter(p => p.type !== 'king')
    const seen = new Set<string>()
    for (const p of dark) {
      const key = `${p.row},${p.col}`
      expect(seen.has(key)).toBe(false)
      seen.add(key)
      expect(p.row).toBeGreaterThanOrEqual(0)
      expect(p.row).toBeLessThanOrEqual(9)
      expect(p.col).toBeGreaterThanOrEqual(0)
      expect(p.col).toBeLessThanOrEqual(8)
    }
  })
})

describe('isDarkZone', () => {
  it('red can only flip rows 5-9 (own half)', () => {
    expect(isDarkZone(5, 'r')).toBe(true)
    expect(isDarkZone(9, 'r')).toBe(true)
    expect(isDarkZone(4, 'r')).toBe(false)
  })

  it('black can only flip rows 0-4 (own half)', () => {
    expect(isDarkZone(0, 'b')).toBe(true)
    expect(isDarkZone(4, 'b')).toBe(true)
    expect(isDarkZone(5, 'b')).toBe(false)
  })
})
