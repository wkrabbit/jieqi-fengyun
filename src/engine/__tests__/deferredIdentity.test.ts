import { describe, it, expect } from 'vitest'
import {
  createInitialPools,
  revealAndConsume,
  canPresetType,
  createRng,
} from '../deferredIdentity'
import { generateDeferredLayout } from '../constants'
import type { PieceType } from '../../types'

describe('deferredIdentity', () => {
  it('createInitialPools has full counts', () => {
    const pools = createInitialPools()
    expect(pools.r.rook).toBe(2)
    expect(pools.r.pawn).toBe(5)
  })

  it('reveal consumes from pool', () => {
    const pools = createInitialPools()
    const presets = new Map<number, PieceType>()
    const pieces = generateDeferredLayout()
    const dark = pieces.find(p => p.color === 'r' && !p.faceUp)!
    const rng = createRng(42)

    const result = revealAndConsume(pools, presets, dark, 'rook', rng)
    expect(result.type).toBe('rook')
    expect(result.presetApplied).toBe(true)
    expect(pools.r.rook).toBe(1)
    expect(dark.faceUp).toBe(true)
    expect(dark.type).toBe('rook')
  })

  it('preset rejected when pool empty', () => {
    const pools = createInitialPools()
    pools.r.rook = 0
    const presets = new Map<number, PieceType>()
    const pieces = generateDeferredLayout()
    const dark = pieces.find(p => p.color === 'r' && !p.faceUp)!
    const rng = createRng(99)

    const result = revealAndConsume(pools, presets, dark, 'rook', rng)
    expect(result.presetRejected).toBe(true)
    expect(result.type).not.toBe('rook')
  })

  it('canPresetType respects other presets', () => {
    const pools = createInitialPools()
    const pieces = generateDeferredLayout()
    const darks = pieces.filter(p => p.color === 'r' && !p.faceUp)
    const presets = new Map<number, PieceType>()
    presets.set(darks[0].id, 'rook')
    presets.set(darks[1].id, 'rook')

    expect(canPresetType(pools, presets, pieces, 'r', darks[0].id, 'rook')).toBe(true)
    expect(canPresetType(pools, presets, pieces, 'r', darks[2].id, 'rook')).toBe(false)
  })
})
