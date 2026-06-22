export interface BindingSelectOption {
  value: string
  label: string
}

export const MOCK_BINDING_CHANNELS: BindingSelectOption[] = [
  { value: "1", label: "boss 直聘" },
  { value: "2", label: "猎聘" },
]

export const MOCK_BINDING_ACCOUNTS: BindingSelectOption[] = [
  { value: "1", label: "演示账号 1" },
  { value: "2", label: "演示账号 2" },
]

function toSelectOptions(options: BindingSelectOption[]) {
  return options.map((option) => ({
    text: { tag: "plain_text", content: option.label },
    value: option.value,
  }))
}

export function buildBindingChannelSelectOptions() {
  return toSelectOptions(MOCK_BINDING_CHANNELS)
}

export function buildBindingAccountSelectOptions() {
  return toSelectOptions(MOCK_BINDING_ACCOUNTS)
}
