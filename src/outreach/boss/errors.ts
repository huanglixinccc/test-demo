export class BossDraftError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "BossDraftError"
  }
}
