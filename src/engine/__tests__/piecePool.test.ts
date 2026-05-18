import { describe, it, expect } from 'vitest'
import { createInitialPools } from '../deferredIdentity'
import { getCheatMenuAvailability, canSetCheatPreset } from '../piecePool'
import { generateDeferredLayout } from '../constants'
import type { PieceType } from '../../types'

describe('piecePool (deferred)', () => {
  it('menu uses remaining pool', () => {
    const pools = createInitialPools()
    const pieces = generateDeferredLayout()
    const darks = pieces.filter(p => p.color === 'r' && !p.faceUp)
    const presets = new Map<number, PieceType>()

    const avail = getCheatMenuAvailability(pools, presets, pieces, 'r', darks[0].id)
    expect(avail.rook.available).toBe(true)
    expect(avail.rook.remaining).toBe(2)

    presets.set(darks[0].id, 'rook')
    presets.set(darks[1].id, 'rook')
    const avail2 = getCheatMenuAvailability(pools, presets, pieces, 'r', darks[2].id)
    expect(avail2.rook.available).toBe(false)
  })

  it('canSetCheatPreset after pool shrink', () => {
    const pools = createInitialPools()
    pools.r.rook = 1
    const pieces = generateDeferredLayout()
    const dark = pieces.find(p => p.color === 'r' && !p.faceUp)!
    const presets = new Map<number, PieceType>()
    presets.set(dark.id, 'rook')

    expect(canSetCheatPreset(pools, presets, pieces, 'r', dark.id, 'rook')).toBe(true)
    const other = pieces.filter(p => p.color === 'r' && !p.faceUp && p.id !== dark.id)[0]
    expect(canSetCheatPreset(pools, presets, pieces, 'r', other.id, 'rook')).toBe(false)
  })
})
