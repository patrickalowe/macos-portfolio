import { promises as fs } from "node:fs"
import path from "node:path"
import type { NextRequest } from "next/server"
import { json, jsonError } from "@/lib/api/http"
import { mockMail } from "@/lib/api/mock"
import type { MailMessage } from "@/lib/api/types"

export const runtime = "nodejs"
export const revalidate = 3600

const DATA_FILE = path.join(process.cwd(), "data", "mail.json")

async function loadMessages(): Promise<{ messages: MailMessage[]; source: "live" | "mock" }> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8")
    const messages = JSON.parse(raw) as MailMessage[]
    if (!Array.isArray(messages)) throw new Error("malformed mail.json")
    return { messages, source: "live" }
  } catch {
    return { messages: mockMail().messages, source: "mock" }
  }
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await ctx.params
  const { messages, source } = await loadMessages()
  const message = messages.find((m) => m.id === id)
  if (!message) return jsonError(404, "Message not found")
  return json(message, source)
}
