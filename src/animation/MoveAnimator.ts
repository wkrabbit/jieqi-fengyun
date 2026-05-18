export interface MoveState {
  pieceId: number
  fromX: number
  fromY: number
  toX: number
  toY: number
  startRow: number
  startCol: number
  progress: number
}

export class MoveAnimator {
  private state: Map<number, MoveState> = new Map()
  private callbacks: Map<number, () => void> = new Map()

  start(
    pieceId: number,
    fromX: number, fromY: number,
    toX: number, toY: number,
    _duration: number,
    onComplete: () => void,
    fromRow?: number, fromCol?: number,
  ): MoveState {
    const s: MoveState = { pieceId, fromX, fromY, toX, toY, startRow: fromRow ?? 0, startCol: fromCol ?? 0, progress: 0 }
    this.state.set(pieceId, s)
    this.callbacks.set(pieceId, onComplete)
    return s
  }

  update(dt: number, duration: number): { x: number; y: number; finished: boolean }[] {
    const results: { x: number; y: number; finished: boolean }[] = []
    for (const [id, s] of this.state) {
      s.progress += dt / duration
      if (s.progress >= 1) {
        results.push({ x: s.toX, y: s.toY, finished: true })
        this.state.delete(id)
        this.callbacks.get(id)?.()
        this.callbacks.delete(id)
      } else {
        const t = easeOut(s.progress)
        results.push({
          x: s.fromX + (s.toX - s.fromX) * t,
          y: s.fromY + (s.toY - s.fromY) * t,
          finished: false,
        })
      }
    }
    return results
  }

  isAnimating(pieceId: number): boolean {
    return this.state.has(pieceId)
  }

  getAnimState(pieceId: number): MoveState | undefined { return this.state.get(pieceId) }
  getAnimStart(pieceId: number): { row: number; col: number } | undefined {
    const s = this.state.get(pieceId)
    return s ? { row: s.startRow, col: s.startCol } : undefined
  }
  get activeCount(): number { return this.state.size }

  getAllIds(): number[] {
    return Array.from(this.state.keys())
  }

  clear() {
    this.state.clear()
    this.callbacks.clear()
  }
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}
