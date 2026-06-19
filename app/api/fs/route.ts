import type { NextRequest } from "next/server"
import { json, jsonError } from "@/lib/api/http"
import type { FsDirResponse, FsEntry, FsFileResponse } from "@/lib/api/types"
import snapshot from "@/lib/api/fs-snapshot.json"

export const dynamic = "force-dynamic"

type SnapFile = { size: number; language: string; content: string; truncated?: boolean }
const FILES = (snapshot as { files: Record<string, SnapFile> }).files
const PATHS = Object.keys(FILES)

/** Normalize a requested path; returns null if it tries to escape. */
function normalize(p: string): string | null {
  const s = (p || ".").replace(/\\/g, "/").replace(/^\.?\/+/, "").replace(/\/+$/, "")
  if (s === "" || s === ".") return ""
  if (s.split("/").some((seg) => seg === "..")) return null
  return s
}

export async function GET(req: NextRequest) {
  const norm = normalize(req.nextUrl.searchParams.get("path") ?? ".")
  if (norm === null) return jsonError(403, "Path is not accessible")

  // Exact file match
  const file = FILES[norm]
  if (file) {
    const payload: FsFileResponse = {
      type: "file",
      path: norm || ".",
      size: file.size,
      language: file.language,
      content: file.content,
      truncated: !!file.truncated,
    }
    return json(payload, "live")
  }

  // Otherwise treat as a directory: collect immediate children from the snapshot
  const prefix = norm === "" ? "" : `${norm}/`
  const dirs = new Set<string>()
  const childFiles: FsEntry[] = []

  for (const p of PATHS) {
    if (norm !== "" && !p.startsWith(prefix)) continue
    const rest = norm === "" ? p : p.slice(prefix.length)
    const slash = rest.indexOf("/")
    if (slash === -1) {
      childFiles.push({ name: rest, type: "file", path: p, size: FILES[p].size })
    } else {
      dirs.add(rest.slice(0, slash))
    }
  }

  if (dirs.size === 0 && childFiles.length === 0) {
    return jsonError(404, "Not found")
  }

  const entries: FsEntry[] = [
    ...Array.from(dirs).map((d) => ({ name: d, type: "dir" as const, path: prefix + d })),
    ...childFiles,
  ].sort((a, b) => (a.type !== b.type ? (a.type === "dir" ? -1 : 1) : a.name.localeCompare(b.name, undefined, { sensitivity: "base" })))

  const payload: FsDirResponse = { type: "dir", path: norm || ".", entries }
  return json(payload, "live")
}
