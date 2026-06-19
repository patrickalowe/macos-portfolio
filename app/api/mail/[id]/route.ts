import type { NextRequest } from "next/server"
import { json, jsonError } from "@/lib/api/http"
import { mockMail } from "@/lib/api/mock"
import { readMail } from "@/lib/api/seed"

export const revalidate = 3600

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await ctx.params
  const live = await readMail()
  const source = live ? "live" : "mock"
  const messages = live ?? mockMail().messages
  const message = messages.find((m) => m.id === id)
  if (!message) return jsonError(404, "Message not found")
  return json(message, source)
}
