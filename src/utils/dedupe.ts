export class LruDedupe {
  private readonly capacity: number
  private readonly map = new Map<string, true>()

  constructor(capacity = 1000) {
    this.capacity = capacity
  }

  seen(key: string): boolean {
    if (this.map.has(key)) {
      this.map.delete(key)
      this.map.set(key, true)
      return true
    }
    this.map.set(key, true)
    if (this.map.size > this.capacity) {
      const oldest = this.map.keys().next().value
      if (oldest !== undefined) this.map.delete(oldest)
    }
    return false
  }
}

export const eventDedupe = new LruDedupe(1000)
