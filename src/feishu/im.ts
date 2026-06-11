import type { FeishuClient } from "./client.js"

export class FeishuIM {
  constructor(private readonly client: FeishuClient) {}

  async sendTextToUser(openId: string, text: string): Promise<void> {
    await this.client.request("POST", "/open-apis/im/v1/messages", {
      params: { receive_id_type: "open_id" },
      data: {
        receive_id: openId,
        msg_type: "text",
        content: JSON.stringify({ text }),
      },
    })
  }

  async sendCardToUser(openId: string, card: unknown): Promise<void> {
    await this.client.request("POST", "/open-apis/im/v1/messages", {
      params: { receive_id_type: "open_id" },
      data: {
        receive_id: openId,
        msg_type: "interactive",
        content: JSON.stringify(card),
      },
    })
  }

  async downloadMessageFile(messageId: string, fileKey: string): Promise<Buffer> {
    const token = await this.client.getTenantAccessToken()
    const path = `/open-apis/im/v1/messages/${messageId}/resources/${fileKey}`
    const res = await this.client.http.request<ArrayBuffer>({
      method: "GET",
      url: path,
      params: { type: "file" },
      headers: { Authorization: `Bearer ${token}` },
      responseType: "arraybuffer",
    })
    return Buffer.from(res.data)
  }
}
