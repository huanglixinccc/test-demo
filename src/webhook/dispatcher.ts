import type { DecryptedEnvelope } from "./verify.js"
import { logger } from "../utils/logger.js"
import { eventDedupe } from "../utils/dedupe.js"

export type EnvelopeHandler = (envelope: DecryptedEnvelope) => Promise<void> | void

export class FeishuEventDispatcher {
  private readonly handlers = new Map<string, EnvelopeHandler>()

  register(eventType: string, handler: EnvelopeHandler): void {
    this.handlers.set(eventType, handler)
  }

  async dispatch(envelope: DecryptedEnvelope): Promise<void> {
    const eventId = envelope.header.event_id
    if (eventDedupe.seen(eventId)) {
      logger.info({ eventId }, "dispatcher.dedupe.skip")
      return
    }
    const handler = this.handlers.get(envelope.header.event_type)
    if (!handler) {
      logger.warn({ eventType: envelope.header.event_type }, "dispatcher.no_handler")
      return
    }
    try {
      await handler(envelope)
    } catch (err) {
      logger.error({ err, eventType: envelope.header.event_type }, "dispatcher.handler_error")
    }
  }
}
