import { describe, it, expect } from 'vitest'
import { generateRandomLayout } from '../constants'
import {
  canAssignCheatType,
  getPoolLimits,
  countEffectiveTypes,
  getCheatTypeAvailability,
} from '../piecePool'
import type { PieceType } from '../../types'

describe('piecePool', () => {
  it('getPoolLimits matches shuffle pool', () => {
    const limits = getPoolLimits('r')
    expect(limits.rook).toBe(2)
    expect(limits.pawn).toBe(5)
    expect(limits.king).toBe(1)
  })

  it('canAssignCheatType allows only when pool has room', () => {
    const pieces = generateRandomLayout()
    const limits = getPoolLimits('r')
    const counts = countEffectiveTypes(pieces, 'r')
    const pawn = pieces.find(p => p.color === 'r' && p.type === 'pawn')!

    const target = (['rook', 'horse', 'cannon'] as PieceType[]).find(
      t => (counts[t] || 0) < limits[t],
    )
    if (target) {
      expect(canAssignCheatType(pieces, 'r', target, pawn.id)).toBe(true)
    }

    const twoPending = new Map<number, PieceType>()
    const redNonRook = pieces.filter(p => p.color === 'r' && p.type !== 'king' && p.type !== 'rook')
    twoPending.set(redNonRook[0].id, 'rook')
    twoPending.set(redNonRook[1].id, 'rook')
    expect(canAssignCheatType(pieces, 'r', 'rook', redNonRook[1].id, twoPending)).toBe(false)
  })

  it('countEffectiveTypes includes pending cheats on dark pieces', () => {
    const pieces = generateRandomLayout()
    const victim = pieces.find(p => p.color === 'r' && p.type === 'pawn')!
    const pending = new Map<number, PieceType>()
    pending.set(victim.id, 'rook')

    const before = countEffectiveTypes(pieces, 'r')
    const after = countEffectiveTypes(pieces, 'r', { pendingCheats: pending })
    expect(after.rook).toBe((before.rook || 0) + 1)
    expect(after.pawn).toBe((before.pawn || 0) - 1)
  })

  it('getCheatTypeAvailability marks full types unavailable', () => {
    const pieces = generateRandomLayout()
    const redNonRook = pieces.filter(p => p.color === 'r' && p.type !== 'king' && p.type !== 'rook')
    const pieceId = redNonRook[0].id
    const pending = new Map<number, PieceType>()
    pending.set(redNonRook[0].id, 'rook')
    pending.set(redNonRook[1].id, 'rook')

    const avail = getCheatTypeAvailability(pieces, 'r', pieceId, pending)
    expect(avail.rook.available).toBe(false)
  })
})
