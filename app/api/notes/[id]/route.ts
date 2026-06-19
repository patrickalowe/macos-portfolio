import { NextRequest } from "next/server"
import { json, jsonError } from "@/lib/api/http"
import { mockNotes } from "@/lib/api/mock"
import { readNotes } from "@/lib/api/seed"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params

  const live = await readNotes()
  if (live) {
    const note = live.find((n) => n.id === id)
    if (note) return json(note, "live")
    return jsonError(404, "Note not found")
  }

  const note = mockNotes().notes.find((n) => n.id === id)
  if (note) return json(note, "mock")
  return jsonError(404, "Note not found")
}
