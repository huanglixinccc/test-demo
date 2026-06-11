import { EventEmitter } from "node:events"
import type { EventMap } from "./types.js"
import { logger } from "../utils/logger.js"

class TypedBus {
  private readonly ee = new EventEmitter({ captureRejections: true })

  emit<K extends keyof EventMap>(name: K, payload: EventMap[K]): void {
    logger.debug({ event: name }, "bus.emit")
    this.ee.emit(name, payload)
  }

  on<K extends keyof EventMap>(name: K, handler: (payload: EventMap[K]) => void | Promise<void>): void {
    this.ee.on(name, async (payload) => {
      try {
        await handler(payload)
      } catch (err) {
        logger.error({ err, event: name }, "bus.handler.error")
      }
    })
  }

  // Test helper: remove all listeners. Marked as internal.
  _resetForTesting(): void {
    this.ee.removeAllListeners()
  }
}

export const bus = new TypedBus()
