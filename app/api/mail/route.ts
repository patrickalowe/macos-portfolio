import { json } from "@/lib/api/http"
import { mockMail } from "@/lib/api/mock"
import { readMail } from "@/lib/api/seed"
import type { MailResponse } from "@/lib/api/types"

export const revalidate = 3600

export async function GET(): Promise<Response> {
  const messages = await readMail()
  if (messages) {
    const payload: MailResponse = {
      messages,
      unreadCount: messages.filter((m) => !m.read).length,
    }
    return json(payload, "live")
  }
  return json(mockMail(), "mock")
}
