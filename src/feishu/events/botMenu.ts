import type { DecryptedEnvelope } from "../../webhook/verify.js"

export type MenuEventHandler = (envelope: DecryptedEnvelope) => Promise<void>

export function composeMenuHandlers(...handlers: MenuEventHandler[]): MenuEventHandler {
  return async function handle(envelope: DecryptedEnvelope): Promise<void> {
    for (const handler of handlers) {
      await handler(envelope)
    }
  }
}
