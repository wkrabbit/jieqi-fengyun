import { describe, it, expect } from 'vitest'
import { generateRandomLayout, generateRandomLayoutWithCheats, applyCheatsToLayout } from '../constants'
import type { PieceType, Color } from '../../types'

const ALL_TYPES: PieceType[] = ['rook', 'horse', 'elephant', 'advisor', 'cannon', 'pawn']

function countByColorAndType(pieces: { color: Color; type: PieceType }[]) {
  const r: Record<string, number> = {}
  const b: Record<string, number> = {}
  for (const p of pieces) {
    const map = p.color === 'r' ? r : b
    map[p.type] = (map[p.type] || 0) + 1
  }
  return { r, b }
}

function expectCountsMatch(expected: Record<string, number>, actual: Record<string, number>) {
  for (const t of ALL_TYPES) {
    expect(actual[t]).toBe(expected[t])
  }
  expect(actual['king']).toBe(1)
}

describe('generateRandomLayoutWithCheats', () => {
  it('returns correct structure without cheatMap', () => {
    const b = generateRandomLayoutWithCheats()
    expect(b.length).toBe(32)
    const counts = countByColorAndType(b)
    expect(counts.r.rook).toBe(2)
    expect(counts.r.horse).toBe(2)
    expect(counts.b.rook).toBe(2)
  })

  it('generates layout and applies cheats in one call', () => {
    // This tests the convenience wrapper: unknown internal IDs
    const result = generateRandomLayoutWithCheats(new Map())
    expect(result.length).toBe(32)
    const counts = countByColorAndType(result)
    expect(counts.r.rook).toBe(2)
  })
})

describe('applyCheatsToLayout', () => {
  it('returns same array when no cheatMap', () => {
    const base = generateRandomLayout()
    const result = applyCheatsToLayout(base)
    expect(result).toBe(base)
  })

  it('returns same array when cheatMap is empty', () => {
    const base = generateRandomLayout()
    const result = applyCheatsToLayout(base, new Map())
    expect(result).toBe(base)
  })

  it('preserves overall type counts after applying cheats (compensation)', () => {
    const base = generateRandomLayout()
    const baseCounts = countByColorAndType(base)
    const redPieces = base.filter(p => p.color === 'r' && p.type !== 'king')
    const victims = redPieces.filter(p => p.type !== 'rook').slice(0, 2)
    const cheatMap = new Map<number, PieceType>()
    cheatMap.set(victims[0].id, 'rook')
    cheatMap.set(victims[1].id, 'rook')

    const result = applyCheatsToLayout(base, cheatMap)
    expect(result).not.toBeNull()
    const afterCounts = countByColorAndType(result!)

    expectCountsMatch(baseCounts.r, afterCounts.r)
    expectCountsMatch(baseCounts.b, afterCounts.b)

    // Verify cheats were actually applied
    for (const v of victims) {
      const p = result!.find(x => x.id === v.id)!
      expect(p.type).toBe('rook')
    }
  })

  it('both colors can have cheats simultaneously', () => {
    const base = generateRandomLayout()
    const baseCounts = countByColorAndType(base)
    const redNonKing = base.filter(p => p.color === 'r' && p.type !== 'king' && p.type !== 'rook')
    const blackNonKing = base.filter(p => p.color === 'b' && p.type !== 'king' && p.type !== 'rook')
    const cheatMap = new Map<number, PieceType>()
    cheatMap.set(redNonKing[0].id, 'rook')
    cheatMap.set(blackNonKing[0].id, 'rook')

    const result = applyCheatsToLayout(base, cheatMap)
    expect(result).not.toBeNull()
    const afterCounts = countByColorAndType(result!)

    expectCountsMatch(baseCounts.r, afterCounts.r)
    expectCountsMatch(baseCounts.b, afterCounts.b)
    expect(result!.find(x => x.id === redNonKing[0].id)!.type).toBe('rook')
    expect(result!.find(x => x.id === blackNonKing[0].id)!.type).toBe('rook')
  })

  it('single pawn-to-cannon cheat preserves counts', () => {
    const base = generateRandomLayout()
    const baseCounts = countByColorAndType(base)
    const victim = base.find(p => p.color === 'r' && p.type === 'pawn')!
    const cheatMap = new Map<number, PieceType>()
    cheatMap.set(victim.id, 'cannon')

    const result = applyCheatsToLayout(base, cheatMap)
    expect(result).not.toBeNull()
    const afterCounts = countByColorAndType(result!)
    expectCountsMatch(baseCounts.r, afterCounts.r)
    expect(result!.find(x => x.id === victim.id)!.type).toBe('cannon')
  })

  it('cheat to same type leaves counts unchanged', () => {
    const base = generateRandomLayout()
    const baseCounts = countByColorAndType(base)
    const victim = base.find(p => p.color === 'r' && p.type === 'pawn')!
    const cheatMap = new Map<number, PieceType>()
    cheatMap.set(victim.id, 'pawn')

    const result = applyCheatsToLayout(base, cheatMap)
    expect(result).not.toBeNull()
    const afterCounts = countByColorAndType(result!)
    expectCountsMatch(baseCounts.r, afterCounts.r)
    expect(result!.find(x => x.id === victim.id)!.type).toBe('pawn')
  })

  it('many cheats (5 pawns → 5 different types) preserves counts', () => {
    const base = generateRandomLayout()
    const baseCounts = countByColorAndType(base)
    const redPawns = base.filter(p => p.color === 'r' && p.type === 'pawn').slice(0, 5)
    const targets: PieceType[] = ['rook', 'horse', 'elephant', 'advisor', 'cannon']
    const cheatMap = new Map<number, PieceType>()
    for (let i = 0; i < 5; i++) {
      cheatMap.set(redPawns[i].id, targets[i])
    }

    const result = applyCheatsToLayout(base, cheatMap)
    expect(result).not.toBeNull()
    const afterCounts = countByColorAndType(result!)

    expectCountsMatch(baseCounts.r, afterCounts.r)
    expectCountsMatch(baseCounts.b, afterCounts.b)

    for (let i = 0; i < 5; i++) {
      expect(result!.find(x => x.id === redPawns[i].id)!.type).toBe(targets[i])
    }
  })

  it('king pieces are never affected by cheats', () => {
    const base = generateRandomLayout()
    const redKing = base.find(p => p.color === 'r' && p.type === 'king')!
    const cheatMap = new Map<number, PieceType>()
    cheatMap.set(redKing.id, 'rook')

    const result = applyCheatsToLayout(base, cheatMap)
    expect(result).not.toBeNull()
    expect(result!.find(x => x.id === redKing.id)!.type).toBe('king')
  })

  it('invalid piece IDs in cheatMap are ignored', () => {
    const base = generateRandomLayout()
    const cheatMap = new Map<number, PieceType>()
    cheatMap.set(99999, 'rook')
    cheatMap.set(-1, 'horse')

    const result = applyCheatsToLayout(base, cheatMap)
    expect(result).not.toBeNull()
    const counts = countByColorAndType(result!)
    expect(counts.r.rook).toBe(2)
  })

  it('2 rook swaps work (up to pool limit)', () => {
    const base = generateRandomLayout()
    const baseCounts = countByColorAndType(base)
    const redNonRook = base.filter(p => p.color === 'r' && p.type !== 'king' && p.type !== 'rook').slice(0, 2)
    const cheatMap = new Map<number, PieceType>()
    for (const p of redNonRook) {
      cheatMap.set(p.id, 'rook')
    }

    const result = applyCheatsToLayout(base, cheatMap)
    expect(result).not.toBeNull()
    const afterCounts = countByColorAndType(result!)
    expectCountsMatch(baseCounts.r, afterCounts.r)
  })

  it('impossible cheats (all red to rook) returns null', () => {
    const base = generateRandomLayout()
    const redAll = base.filter(p => p.color === 'r' && p.type !== 'king')
    const cheatMap = new Map<number, PieceType>()
    for (const p of redAll) {
      cheatMap.set(p.id, 'rook')
    }

    const result = applyCheatsToLayout(base, cheatMap)
    expect(result).toBeNull()
    // Original pieces should be untouched
    const baseCounts = countByColorAndType(base)
    expect(baseCounts.r.rook).toBe(2)
  })

  it('randomized: N random cheats always preserve pool counts or fail cleanly', () => {
    for (let run = 0; run < 50; run++) {
      const base = generateRandomLayout()
      const baseCounts = countByColorAndType(base)
      const redNonKing = base.filter(p => p.color === 'r' && p.type !== 'king')
      const count = 1 + Math.floor(Math.random() * 3)
      const picked = redNonKing.slice(0, count)
      const cheatMap = new Map<number, PieceType>()
      const typePool: PieceType[] = [...ALL_TYPES]
      for (const p of picked) {
        const target = typePool[Math.floor(Math.random() * typePool.length)]
        cheatMap.set(p.id, target)
      }

      const result = applyCheatsToLayout(base, cheatMap)

      if (result === null) {
        // Compensation failed — original pieces untouched
        const afterCounts = countByColorAndType(base)
        expectCountsMatch(baseCounts.r, afterCounts.r)
        expectCountsMatch(baseCounts.b, afterCounts.b)
      } else {
        const afterCounts = countByColorAndType(result)
        expectCountsMatch(baseCounts.r, afterCounts.r)
        expectCountsMatch(baseCounts.b, afterCounts.b)

        // Cheated pieces should have target type
        for (const [id, t] of cheatMap.entries()) {
          const p = result.find(x => x.id === id)!
          expect(p.type).toBe(t)
        }
      }
    }
  })

  it('cross-color isolation: cheating only red does not affect black', () => {
    for (let run = 0; run < 30; run++) {
      const base = generateRandomLayout()
      const baseCounts = countByColorAndType(base)
      const redNonKing = base.filter(p => p.color === 'r' && p.type !== 'king' && p.type !== 'rook')

      const cheatMap = new Map<number, PieceType>()
      for (const p of redNonKing.slice(0, 2)) {
        cheatMap.set(p.id, 'rook')
      }

      const result = applyCheatsToLayout(base, cheatMap)
      // Black counts should always match baseline (even if red compensation fails, null means nothing changed)
      const afterCounts = result ? countByColorAndType(result) : countByColorAndType(base)
      expectCountsMatch(baseCounts.b, afterCounts.b)
      if (result) expectCountsMatch(baseCounts.r, afterCounts.r)
    }
  })
})
