export interface CardSubmitData {
  channel: string[]
  account: string[]
}

export interface CardSubmitPayload {
  card_submit_data: CardSubmitData
}

function normalizeStringArray(value: unknown): string[] {
  if (typeof value === "string") return value ? [value] : []
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string")
}

function fromRecord(record: Record<string, unknown>): CardSubmitPayload | null {
  const nested = record.card_submit_data
  if (nested && typeof nested === "object") {
    const data = nested as Record<string, unknown>
    return {
      card_submit_data: {
        channel: normalizeStringArray(data.channel),
        account: normalizeStringArray(data.account),
      },
    }
  }

  if ("channel" in record || "account" in record) {
    return {
      card_submit_data: {
        channel: normalizeStringArray(record.channel),
        account: normalizeStringArray(record.account),
      },
    }
  }

  return null
}

export function parseCardSubmitPayload(raw: unknown): CardSubmitPayload | null {
  if (raw == null) return null

  if (typeof raw === "string") {
    try {
      return parseCardSubmitPayload(JSON.parse(raw))
    } catch {
      return null
    }
  }

  if (typeof raw !== "object") return null
  return fromRecord(raw as Record<string, unknown>)
}

function findNestedSubmitPayload(raw: unknown, depth = 0): CardSubmitPayload | null {
  const direct = parseCardSubmitPayload(raw)
  if (direct) return direct
  if (depth > 6 || raw == null || typeof raw !== "object") return null

  for (const value of Object.values(raw as Record<string, unknown>)) {
    const found = findNestedSubmitPayload(value, depth + 1)
    if (found) return found
  }
  return null
}

export function parseCardSubmitFromAction(action: unknown): CardSubmitPayload | null {
  if (!action || typeof action !== "object") return null
  const record = action as Record<string, unknown>
  return (
    findNestedSubmitPayload(record.value) ??
    findNestedSubmitPayload(record.form_value) ??
    findNestedSubmitPayload(action)
  )
}

export function parseCardSubmitFromEvent(event: unknown): CardSubmitPayload | null {
  return findNestedSubmitPayload(event)
}
