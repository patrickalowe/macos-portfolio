import { promises as fs } from "node:fs"
import path from "node:path"
import { json } from "@/lib/api/http"
import { mockMail } from "@/lib/api/mock"
import type { MailMessage, MailResponse } from "@/lib/api/types"

export const runtime = "nodejs"
export const revalidate = 3600

const DATA_FILE = path.join(process.cwd(), "data", "mail.json")

export async function GET(): Promise<Response> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8")
    const messages = JSON.parse(raw) as MailMessage[]
    if (!Array.isArray(messages)) throw new Error("malformed mail.json")
    const payload: MailResponse = {
      messages,
      unreadCount: messages.filter((m) => !m.read).length,
    }
    return json(payload, "live")
  } catch {
    return json(mockMail(), "mock")
  }
}
