import path from "node:path"

const ROOT = process.cwd()

/** Names that must never be exposed by the read-only repo browser. */
const DENY_EXACT = new Set([
  ".git",
  "node_modules",
  ".next",
  ".env",
  ".env.local",
  ".env.development.local",
  ".env.production.local",
  ".vercel",
  ".turbo",
])

const DENY_PATTERNS = [/^\.env/i, /\.pem$/i, /\.key$/i, /secret/i, /credential/i, /\.p12$/i]

export interface SafePathResult {
  ok: boolean
  abs: string
  rel: string
  reason?: string
}

/** Resolve a user-supplied path, guaranteeing it stays inside the repo root. */
export function resolveSafe(userPath: string): SafePathResult {
  const clean = (userPath || "").replace(/\0/g, "")
  if (path.isAbsolute(clean)) {
    return { ok: false, abs: "", rel: "", reason: "absolute paths are not allowed" }
  }
  const abs = path.resolve(ROOT, clean)
  const rel = path.relative(ROOT, abs)
  // must be ROOT itself or strictly within ROOT
  if (abs !== ROOT && (rel.startsWith("..") || path.isAbsolute(rel))) {
    return { ok: false, abs: "", rel: "", reason: "path escapes the project root" }
  }
  // any path segment on the denylist is rejected
  const segments = rel.split(path.sep).filter(Boolean)
  for (const seg of segments) {
    if (DENY_EXACT.has(seg) || DENY_PATTERNS.some((re) => re.test(seg))) {
      return { ok: false, abs: "", rel: "", reason: "path is not accessible" }
    }
  }
  return { ok: true, abs, rel: rel || "." }
}

const LANG_BY_EXT: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "tsx",
  ".js": "javascript",
  ".jsx": "jsx",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".json": "json",
  ".css": "css",
  ".scss": "scss",
  ".html": "html",
  ".md": "markdown",
  ".mdx": "markdown",
  ".yml": "yaml",
  ".yaml": "yaml",
  ".sh": "bash",
  ".py": "python",
  ".rs": "rust",
  ".go": "go",
  ".toml": "toml",
  ".svg": "xml",
}

export function languageForFile(name: string): string {
  return LANG_BY_EXT[path.extname(name).toLowerCase()] ?? "text"
}

export const REPO_ROOT = ROOT
