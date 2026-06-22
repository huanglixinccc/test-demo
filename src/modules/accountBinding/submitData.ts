export interface CardSubmitData {
  channel: string[]
  account: string[]
}

export interface CardSubmitPayload {
  card_submit_data: CardSubmitData
}

function normalizeStringArray(value: unknown): string[] {
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
