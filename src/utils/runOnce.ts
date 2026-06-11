/** Coalesce concurrent async work keyed by string (e.g. candidateId, recordId). */
export async function runOnce<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const inflight = runOnceQueue.get(key) as Promise<T> | undefined
  if (inflight) return inflight

  const task = fn().finally(() => {
    if (runOnceQueue.get(key) === task) runOnceQueue.delete(key)
  })
  runOnceQueue.set(key, task)
  return task
}

const runOnceQueue = new Map<string, Promise<unknown>>()

/** Test helper */
export function _resetRunOnceForTesting(): void {
  runOnceQueue.clear()
}
