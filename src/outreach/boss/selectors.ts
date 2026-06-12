/** Boss 直聘 Web 聊天输入框候选选择器（页面改版时可增删） */
export const BOSS_CHAT_INPUT_SELECTORS = [
  '[class*="chat-input"] [contenteditable="true"]',
  '[class*="chat-input"] textarea',
  '[class*="message-input"] [contenteditable="true"]',
  '[class*="message-input"] textarea',
  '[class*="editor-input"] [contenteditable="true"]',
  '[class*="editor-input"] textarea',
  '[data-testid*="chat"] [contenteditable="true"]',
  'div[contenteditable="true"][role="textbox"]',
  'div[contenteditable="true"]',
  'textarea',
] as const
