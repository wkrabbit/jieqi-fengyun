export interface FlipState {
  pieceId: number
  progress: number
  phase: 'shrinking' | 'growing'
}

export class FlipAnimator {
  private state: Map<number, FlipState> = new Map()
  private callbacks: Map<number, () => void> = new Map()

  start(pieceId: number, duration: number, onComplete: () => void): FlipState {
    const state: FlipState = { pieceId, progress: 0, phase: 'shrinking' }
    this.state.set(pieceId, state)
    this.callbacks.set(pieceId, onComplete)
    return state
  }

  update(dt: number, duration: number): { scaleX: number; midPoint: boolean }[] {
    const results: { scaleX: number; midPoint: boolean }[] = []
    for (const [id, s] of this.state) {
      const step = dt / (duration / 2)
      if (s.phase === 'shrinking') {
        s.progress += step
        if (s.progress >= 1) {
          s.progress = 0
          s.phase = 'growing'
          results.push({ scaleX: 0, midPoint: true })
        } else {
          results.push({ scaleX: 1 - s.progress, midPoint: false })
        }
      } else {
        s.progress += step
        if (s.progress >= 1) {
          results.push({ scaleX: 1, midPoint: false })
          this.state.delete(id)
          this.callbacks.get(id)?.()
          this.callbacks.delete(id)
        } else {
          results.push({ scaleX: s.progress, midPoint: false })
        }
      }
    }
    return results
  }

  isAnimating(pieceId: number): boolean {
    return this.state.has(pieceId)
  }

  get activeCount(): number { return this.state.size }

  clear() {
    this.state.clear()
    this.callbacks.clear()
  }
}
