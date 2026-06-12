export class AIProviderError extends Error {
  readonly statusCode?: number

  constructor(message: string, statusCode?: number) {
    super(message)
    this.name = "AIProviderError"
    this.statusCode = statusCode
  }
}
