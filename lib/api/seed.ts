import notesData from "@/data/notes.json"
import mailData from "@/data/mail.json"
import type { Note, MailMessage } from "./types"

/**
 * Seed content is BUNDLED at build time via JSON imports (not read from the
 * filesystem at request time), so these work identically on Node and on the
 * Cloudflare Workers runtime, which has no project filesystem.
 * Returns null only if the bundled data is somehow malformed.
 */
export async function readNotes(): Promise<Note[] | null> {
  return Array.isArray(notesData) ? (notesData as Note[]) : null
}

export async function readMail(): Promise<MailMessage[] | null> {
  return Array.isArray(mailData) ? (mailData as MailMessage[]) : null
}
