import type { DecryptedEnvelope } from "./verify.js"

export const CARD_ACTION_EVENT_TYPE = "card.action.trigger"

export type CardActionHandler = (
  envelope: DecryptedEnvelope,
) => Promise<Record<string, unknown> | null>

export async function resolveCardActionResponse(
  handlers: CardActionHandler[],
  envelope: DecryptedEnvelope,
): Promise<Record<string, unknown>> {
  for (const handler of handlers) {
    const response = await handler(envelope)
    if (response) return response
  }
  return {}
}
