// Generates lib/api/fs-snapshot.json: a bundled snapshot of the repo's source
// tree + file contents, so the in-app VS Code browser (/api/fs) works on the
// Cloudflare Workers runtime, which has no project filesystem at request time.
import { readdirSync, statSync, readFileSync, writeFileSync, mkdirSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const MAX_BYTES = 128 * 1024

// Top-level directories whose source we expose in the browser.
const INCLUDE_DIRS = ["app", "components", "hooks", "lib", "data", "scripts", "styles"]
// Individual root files worth showing.
const INCLUDE_ROOT_FILES = [
  "package.json", "tsconfig.json", "next.config.mjs", "tailwind.config.ts", "postcss.config.mjs",
  "components.json", "types.ts", "README.md", ".env.example", "vite.config.ts", "wrangler.jsonc",
  "open-next.config.ts", ".gitignore",
]
const DENY_SEGMENTS = new Set(["node_modules", ".next", ".git", ".vinext", "dist", ".turbo", ".vercel"])
const DENY_FILES = new Set(["fs-snapshot.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock", ".DS_Store"])
const TEXT_EXT = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".css", ".scss", ".md", ".mdx",
  ".yml", ".yaml", ".html", ".svg", ".txt", ".toml", ".sh",
])
const LANG = {
  ".ts": "typescript", ".tsx": "tsx", ".js": "javascript", ".jsx": "jsx", ".mjs": "javascript",
  ".cjs": "javascript", ".json": "json", ".css": "css", ".scss": "scss", ".html": "html",
  ".md": "markdown", ".mdx": "markdown", ".yml": "yaml", ".yaml": "yaml", ".sh": "bash",
  ".toml": "toml", ".svg": "xml",
}
const langFor = (name) => LANG[path.extname(name).toLowerCase()] ?? "text"

const files = {}

function isTextFile(name) {
  if (DENY_FILES.has(name)) return false
  const ext = path.extname(name).toLowerCase()
  if (ext === "" && (name === ".env.example" || name === ".gitignore" || name === "LICENSE")) return true
  return TEXT_EXT.has(ext)
}

function addFile(abs, rel) {
  const size = statSync(abs).size
  if (!isTextFile(path.basename(abs))) return
  let content = readFileSync(abs, "utf8")
  let truncated = false
  if (Buffer.byteLength(content, "utf8") > MAX_BYTES) {
    content = content.slice(0, MAX_BYTES)
    truncated = true
  }
  files[rel] = { size, language: langFor(rel), content, truncated }
}

function walk(absDir, relDir) {
  for (const name of readdirSync(absDir)) {
    if (DENY_SEGMENTS.has(name) || name.startsWith(".") && name !== ".env.example" && name !== ".gitignore") continue
    const abs = path.join(absDir, name)
    const rel = relDir ? `${relDir}/${name}` : name
    const st = statSync(abs)
    if (st.isDirectory()) walk(abs, rel)
    else if (st.isFile()) addFile(abs, rel)
  }
}

for (const dir of INCLUDE_DIRS) {
  const abs = path.join(ROOT, dir)
  try { if (statSync(abs).isDirectory()) walk(abs, dir) } catch { /* dir absent */ }
}
for (const f of INCLUDE_ROOT_FILES) {
  const abs = path.join(ROOT, f)
  try { if (statSync(abs).isFile()) addFile(abs, f) } catch { /* file absent */ }
}

const outDir = path.join(ROOT, "lib", "api")
mkdirSync(outDir, { recursive: true })
writeFileSync(path.join(outDir, "fs-snapshot.json"), JSON.stringify({ files }), "utf8")
console.log(`fs-snapshot.json written: ${Object.keys(files).length} files`)
