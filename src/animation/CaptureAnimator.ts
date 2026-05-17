export class CaptureAnimator {
  private state: Map<number, { progress: number }> = new Map()
  private callbacks: Map<number, () => void> = new Map()

  start(pieceId: number, duration: number, onComplete: () => void) {
    this.state.set(pieceId, { progress: 0 })
    this.callbacks.set(pieceId, onComplete)
  }

  update(dt: number, duration: number): { scale: number; opacity: number; finished: boolean }[] {
    const results: { scale: number; opacity: number; finished: boolean }[] = []
    for (const [id, s] of this.state) {
      s.progress += dt / duration
      if (s.progress >= 1) {
        results.push({ scale: 0, opacity: 0, finished: true })
        this.state.delete(id)
        this.callbacks.get(id)?.()
        this.callbacks.delete(id)
      } else {
        results.push({
          scale: 1 - s.progress * 0.5,
          opacity: 1 - s.progress,
          finished: false,
        })
      }
    }
    return results
  }

  isAnimating(pieceId: number): boolean {
    return this.state.has(pieceId)
  }

  getActiveState(pieceId: number): { scale: number; opacity: number } | undefined {
    const s = this.state.get(pieceId)
    if (!s) return undefined
    return { scale: 1 - s.progress * 0.5, opacity: 1 - s.progress }
  }
  get activeCount(): number { return this.state.size }

  clear() {
    this.state.clear()
    this.callbacks.clear()
  }
}
