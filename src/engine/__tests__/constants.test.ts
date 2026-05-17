import { describe, it, expect } from 'vitest'
import { PIECE_TYPES, COLORS, INITIAL_LAYOUT, isDarkZone } from '../constants'
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
