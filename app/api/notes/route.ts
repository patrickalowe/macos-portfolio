import { json } from "@/lib/api/http"
import { mockNotes } from "@/lib/api/mock"
import { readNotes } from "@/lib/api/seed"

export const runtime = "nodejs"
export const revalidate = 3600

export async function GET() {
  const notes = await readNotes()
  if (notes) return json({ notes }, "live")
  return json(mockNotes(), "mock")
}
