import { promises as fs } from "node:fs"
import path from "node:path"
import type { NextRequest } from "next/server"
import { json } from "@/lib/api/http"
import { mockTracks } from "@/lib/api/mock"
import type { Track, TracksResponse } from "@/lib/api/types"

export const runtime = "nodejs"
export const revalidate = 3600

const AUDIO_EXTS = new Set([".mp3", ".m4a", ".wav", ".ogg"])

/** "lofi-study-112191.mp3" -> "lofi-study-112191" */
function slugify(filename: string): string {
  return path
    .basename(filename, path.extname(filename))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/** "lofi-study-112191.mp3" -> "Lofi Study" (strip trailing numeric id, title-case) */
function prettify(filename: string): string {
  const base = path
    .basename(filename, path.extname(filename))
    .replace(/[_-]+/g, " ")
    .replace(/\s*\b\d{4,}\b\s*/g, " ")
    .trim()
  const words = base.split(/\s+/).filter(Boolean)
  if (words.length === 0) return path.basename(filename, path.extname(filename))
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
}

export async function GET(_req: NextRequest) {
  try {
    const publicDir = path.join(process.cwd(), "public")
    const dirents = await fs.readdir(publicDir, { withFileTypes: true })

    const tracks: Track[] = dirents
      .filter((d) => d.isFile() && AUDIO_EXTS.has(path.extname(d.name).toLowerCase()))
      .map((d) => ({
        id: slugify(d.name),
        title: prettify(d.name),
        artist: "Local Library",
        src: "/" + d.name,
      }))

    if (tracks.length === 0) {
      return json(mockTracks(), "mock")
    }

    // Prefer/merge richer metadata from public/tracks.json when present.
    const byId = new Map(tracks.map((t) => [t.id, t]))
    try {
      const raw = await fs.readFile(path.join(publicDir, "tracks.json"), "utf8")
      const parsed = JSON.parse(raw)
      const meta: Track[] = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.tracks) ? parsed.tracks : []
      for (const m of meta) {
        if (!m || typeof m.id !== "string") continue
        const existing = byId.get(m.id)
        if (existing) {
          byId.set(m.id, { ...existing, ...m })
        } else if (typeof m.src === "string") {
          byId.set(m.id, {
            id: m.id,
            title: typeof m.title === "string" ? m.title : prettify(m.src),
            artist: typeof m.artist === "string" ? m.artist : "Local Library",
            src: m.src,
            durationSec: m.durationSec,
            cover: m.cover,
          })
        }
      }
    } catch {
      // no tracks.json (or invalid) — fall back to filesystem-derived tracks
    }

    const response: TracksResponse = { tracks: Array.from(byId.values()) }
    return json(response, "live")
  } catch {
    return json(mockTracks(), "mock")
  }
}
