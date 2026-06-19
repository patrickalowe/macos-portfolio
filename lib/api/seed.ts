import fs from "node:fs/promises"
import path from "node:path"
import type { Note, MailMessage } from "./types"

/** Read seeded notes from data/notes.json. Returns null on missing file / parse error / bad shape. */
export async function readNotes(): Promise<Note[] | null> {
  try {
    const file = path.join(process.cwd(), "data", "notes.json")
    const raw = await fs.readFile(file, "utf8")
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    return parsed as Note[]
  } catch {
    return null
  }
}

/** Read seeded mail from data/mail.json. Returns null on missing file / parse error / bad shape. */
export async function readMail(): Promise<MailMessage[] | null> {
  try {
    const file = path.join(process.cwd(), "data", "mail.json")
    const raw = await fs.readFile(file, "utf8")
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    return parsed as MailMessage[]
  } catch {
    return null
  }
}
