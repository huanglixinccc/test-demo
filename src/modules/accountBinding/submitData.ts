import {
  BINDING_FORM_ACCOUNT_FIELD,
  BINDING_FORM_CHANNEL_FIELD,
  BINDING_SUBMIT_BUTTON_NAME,
} from "./constants.js"

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

/** 解析模板卡片 form_value 中的 Select 组件值 */
export function parseBindingTemplateFormSubmit(formValue: unknown): CardSubmitPayload | null {
  if (!formValue || typeof formValue !== "object") return null
  const fields = formValue as Record<string, unknown>

  const hasChannel = BINDING_FORM_CHANNEL_FIELD in fields
  const hasAccount = BINDING_FORM_ACCOUNT_FIELD in fields
  if (!hasChannel && !hasAccount) return null

  return {
    card_submit_data: {
      channel: normalizeStringArray(fields[BINDING_FORM_CHANNEL_FIELD]),
      account: normalizeStringArray(fields[BINDING_FORM_ACCOUNT_FIELD]),
    },
  }
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

  if (record.tag === "button" && record.form_value) {
    const fromForm = parseBindingTemplateFormSubmit(record.form_value)
    if (fromForm) return fromForm
  }

  return (
    findNestedSubmitPayload(record.value) ??
    parseBindingTemplateFormSubmit(record.form_value) ??
    findNestedSubmitPayload(record.form_value) ??
    findNestedSubmitPayload(action)
  )
}

export function parseCardSubmitFromEvent(event: unknown): CardSubmitPayload | null {
  return findNestedSubmitPayload(event)
}
