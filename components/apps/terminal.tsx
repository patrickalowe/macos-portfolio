"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSystem } from "@/components/system-provider"
import type {
  FsResponse,
  GithubResponse,
  SystemResponse,
  WeatherResponse,
} from "@/lib/api/types"
import { cn } from "@/lib/utils"

interface TerminalProps {
  isDarkMode?: boolean
}

/* ------------------------------------------------------------------ model -- */

type LineKind = "out" | "prompt" | "error" | "dim" | "accent" | "pending"

interface Line {
  id: number
  kind: LineKind
  text: string
}

const PROMPT = "apple-techie@macbook ~ %"

/** Result of a command handler: either ready-to-print lines, or an async job. */
type HandlerResult =
  | { lines: Omit<Line, "id">[] }
  | { clear: true }
  | {
      /** Transient line shown immediately while the promise resolves. */
      pending: string
      /** Resolves to the final lines that REPLACE the pending line. */
      run: () => Promise<Omit<Line, "id">[]>
    }

interface CommandContext {
  args: string[]
  raw: string
  theme: string
  isDarkMode: boolean
}

interface Command {
  name: string
  summary: string
  usage?: string
  handler: (ctx: CommandContext) => HandlerResult
}

/* --------------------------------------------------------------- helpers -- */

const out = (text: string): Omit<Line, "id"> => ({ kind: "out", text })
const dim = (text: string): Omit<Line, "id"> => ({ kind: "dim", text })
const accent = (text: string): Omit<Line, "id"> => ({ kind: "accent", text })
const errLine = (text: string): Omit<Line, "id"> => ({ kind: "error", text })

/** Turn any thrown value into a concise single-line message. */
function messageOf(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === "string") return err
  return "request failed"
}

/**
 * GET a localhost API route and parse JSON against the expected type.
 * Throws a clean Error (message only) on any non-2xx / network / parse failure
 * so callers can render a single red `error:` line.
 */
async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, { signal, cache: "no-store" })
  } catch {
    throw new Error("network unreachable")
  }
  if (!res.ok) {
    let detail = `request failed (${res.status})`
    try {
      const body = (await res.json()) as { error?: string }
      if (body?.error) detail = body.error
    } catch {
      /* keep status-based message */
    }
    throw new Error(detail)
  }
  try {
    return (await res.json()) as T
  } catch {
    throw new Error("invalid response")
  }
}

function formatBytes(n: number | undefined): string {
  if (n == null) return ""
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

/* ----------------------------------------------------------- static copy -- */

const NEOFETCH_ART = [
  "                    'c.",
  "                 ,xNMM.",
  "               .OMMMMo",
  "               lMM\"",
  "     .;loddo:.  .olloddol;.",
  "   cKMMMMMMMMMMNWMMMMMMMMMM0:",
  " .KMMMMMMMMMMMMMMMMMMMMMMMWd.",
  " XMMMMMMMMMMMMMMMMMMMMMMMX.",
  ";MMMMMMMMMMMMMMMMMMMMMMMM:",
  ":MMMMMMMMMMMMMMMMMMMMMMMM:",
  ".MMMMMMMMMMMMMMMMMMMMMMMMX.",
  " kMMMMMMMMMMMMMMMMMMMMMMMMWd.",
  " 'XMMMMMMMMMMMMMMMMMMMMMMMMMMk",
  "  'XMMMMMMMMMMMMMMMMMMMMMMMMK.",
  "    kMMMMMMMMMMMMMMMMMMMMMMd",
  "     ;KMMMMMMMWXXWMMMMMMMk.",
  "       \"cooc*\"    \"*coo'\"",
]

/* -------------------------------------------------------------- registry -- */

function buildRegistry(): Map<string, Command> {
  const commands: Command[] = []

  const register = (c: Command) => commands.push(c)

  register({
    name: "help",
    summary: "List all available commands",
    handler: () => ({
      lines: [
        accent("Available commands"),
        dim("───────────────────"),
        ...commands.map((c) =>
          out(`  ${c.name.padEnd(11)} ${c.summary}`),
        ),
        out(""),
        dim("Networked commands fetch live data from this site's APIs."),
        dim("Use ↑/↓ to recall history. Type 'clear' to reset."),
      ],
    }),
  })

  register({
    name: "clear",
    summary: "Clear the scrollback",
    handler: () => ({ clear: true }),
  })

  register({
    name: "echo",
    summary: "Print the given text",
    usage: "echo [text]",
    handler: ({ args }) => ({ lines: [out(args.join(" "))] }),
  })

  register({
    name: "date",
    summary: "Show the current date and time",
    handler: () => ({ lines: [out(new Date().toString())] }),
  })

  register({
    name: "whoami",
    summary: "Print the current user",
    handler: () => ({ lines: [out("apple-techie")] }),
  })

  register({
    name: "pwd",
    summary: "Print the working directory",
    handler: () => ({ lines: [out("/Users/apple-techie")] }),
  })

  register({
    name: "theme",
    summary: "Show the active appearance",
    handler: ({ theme, isDarkMode }) => ({
      lines: [
        out(`theme: ${theme}`),
        out(`appearance: ${isDarkMode ? "dark" : "light"}`),
      ],
    }),
  })

  register({
    name: "about",
    summary: "A short bio",
    handler: () => ({
      lines: [
        accent("apple-techie"),
        dim("Frontend Developer & UI/UX Designer"),
        out(""),
        out("I build beautiful, responsive, accessible web apps with"),
        out("modern frameworks — focused on craft, performance, and"),
        out("seamless user experiences across frontend and backend."),
      ],
    }),
  })

  register({
    name: "skills",
    summary: "Technical skills",
    handler: () => ({
      lines: [
        accent("Frontend"),
        out("  React · Next.js · Vue · TypeScript · Tailwind · UI/UX"),
        out(""),
        accent("Backend"),
        out("  Node · Laravel · Django · PostgreSQL · REST · GraphQL"),
        out(""),
        accent("Tooling"),
        out("  Docker · CI/CD · Git · AWS · Linux"),
      ],
    }),
  })

  register({
    name: "contact",
    summary: "How to reach me",
    handler: () => ({
      lines: [
        out("email      mail@appletechie.dev"),
        out("github     github.com/apple-techie"),
        out("x          x.com/apple_techie"),
        out("instagram  instagram.com/appletechie"),
        out("web        appletechie.dev"),
      ],
    }),
  })

  const neofetch: Command["handler"] = ({ isDarkMode }) => ({
    pending: "gathering system info…",
    run: async () => {
      let info: SystemResponse | null = null
      try {
        info = await getJson<SystemResponse>("/api/system")
      } catch {
        info = null
      }
      const facts: string[] = info
        ? [
            `apple-techie@macbook`,
            `──────────────`,
            `Host:    ${info.device.name}`,
            `Chip:    ${info.device.chip}`,
            `OS:      ${info.device.platform} ${info.os.release}`,
            `Kernel:  ${info.device.arch} · ${info.device.cpuCount} cores`,
            `Memory:  ${info.memory.freeGb.toFixed(1)} / ${info.memory.totalGb.toFixed(
              1,
            )} GB free`,
            `Node:    ${info.os.nodeVersion}`,
            `Next:    ${info.os.nextVersion}`,
            `Uptime:  ${Math.round(info.serverUptimeSec / 60)} min`,
            `Theme:   ${isDarkMode ? "dark" : "light"}`,
          ]
        : [
            `apple-techie@macbook`,
            `──────────────`,
            `Frontend Developer & UI/UX Designer`,
            `Stack:   Next.js · React · TypeScript`,
            `Theme:   ${isDarkMode ? "dark" : "light"}`,
          ]

      const rows = Math.max(NEOFETCH_ART.length, facts.length)
      const lines: Omit<Line, "id">[] = []
      for (let i = 0; i < rows; i++) {
        const art = (NEOFETCH_ART[i] ?? "").padEnd(30)
        const fact = facts[i] ?? ""
        lines.push({ kind: "accent", text: `${art}${fact}` })
      }
      return lines
    },
  })

  register({
    name: "neofetch",
    summary: "ASCII logo + system info",
    handler: neofetch,
  })
  register({
    name: "banner",
    summary: "Alias of neofetch",
    handler: neofetch,
  })

  register({
    name: "ls",
    summary: "List a directory (live /api/fs)",
    usage: "ls [path]",
    handler: ({ args }) => {
      const target = args[0] ?? "."
      const url = `/api/fs?path=${encodeURIComponent(target)}`
      return {
        pending: `reading ${target}…`,
        run: async () => {
          const data = await getJson<FsResponse>(url)
          if (data.type === "file") {
            return [
              out(`${data.path}  ${formatBytes(data.size)}  (${data.language})`),
            ]
          }
          if (data.entries.length === 0) return [dim("(empty)")]
          return data.entries.map((e) =>
            e.type === "dir"
              ? accent(`${e.name}/`)
              : out(`${e.name.padEnd(28)} ${formatBytes(e.size)}`),
          )
        },
      }
    },
  })

  register({
    name: "cat",
    summary: "Print a file (live /api/fs)",
    usage: "cat <path>",
    handler: ({ args }) => {
      const target = args[0]
      if (!target) {
        return { lines: [errLine("error: usage: cat <path>")] }
      }
      const url = `/api/fs?path=${encodeURIComponent(target)}`
      return {
        pending: `reading ${target}…`,
        run: async () => {
          const data = await getJson<FsResponse>(url)
          if (data.type === "dir") {
            throw new Error(`${data.path} is a directory`)
          }
          const body = data.content.replace(/\n+$/, "").split("\n").map(out)
          const lines: Omit<Line, "id">[] = [...body]
          if (data.truncated) {
            lines.push(dim(`… truncated (${formatBytes(data.size)})`))
          }
          return lines.length ? lines : [dim("(empty file)")]
        },
      }
    },
  })

  register({
    name: "weather",
    summary: "Current conditions (live /api/weather)",
    usage: "weather [city]",
    handler: ({ args }) => {
      const city = args.join(" ").trim()
      const url = city
        ? `/api/weather?city=${encodeURIComponent(city)}`
        : "/api/weather"
      return {
        pending: city ? `fetching weather for ${city}…` : "fetching weather…",
        run: async () => {
          const data = await getJson<WeatherResponse>(url)
          const loc = data.location.country
            ? `${data.location.name}, ${data.location.country}`
            : data.location.name
          const c = data.current
          const lines: Omit<Line, "id">[] = [
            accent(`${loc}`),
            out(
              `${c.tempC}°C  ${c.conditionLabel}  (feels ${c.feelsLikeC}°C)`,
            ),
            out(`humidity ${c.humidity}%  ·  wind ${c.windKph} km/h`),
            out(`sunrise ${c.sunrise}  ·  sunset ${c.sunset}`),
          ]
          if (data.forecast.length) {
            lines.push(out(""))
            lines.push(dim("forecast"))
            for (const d of data.forecast.slice(0, 5)) {
              lines.push(
                out(
                  `  ${d.day.padEnd(4)} ${String(d.high).padStart(3)}° / ${String(
                    d.low,
                  ).padStart(3)}°  ${d.condition}`,
                ),
              )
            }
          }
          return lines
        },
      }
    },
  })

  const githubHandler: Command["handler"] = ({ args }) => {
    const user = args[0]?.trim()
    const url = user
      ? `/api/github?user=${encodeURIComponent(user)}`
      : "/api/github"
    return {
      pending: user ? `fetching github.com/${user}…` : "fetching github…",
      run: async () => {
        const data = await getJson<GithubResponse>(url)
        const p = data.profile
        const lines: Omit<Line, "id">[] = [
          accent(`${p.name ?? p.login}  (@${p.login})`),
        ]
        if (p.bio) lines.push(dim(p.bio))
        lines.push(
          out(
            `${p.followers} followers · ${p.following} following · ${p.publicRepos} repos · ${data.totalStars}★`,
          ),
        )
        if (data.topRepos.length) {
          lines.push(out(""))
          lines.push(dim("top repositories"))
          for (const r of data.topRepos.slice(0, 5)) {
            const lang = r.language ? ` · ${r.language}` : ""
            lines.push(out(`  ${r.name.padEnd(22)} ${r.stars}★${lang}`))
            if (r.description) lines.push(dim(`    ${r.description}`))
          }
        }
        return lines
      },
    }
  }

  register({
    name: "gh",
    summary: "GitHub profile (live /api/github)",
    usage: "gh [user]",
    handler: githubHandler,
  })
  register({
    name: "github",
    summary: "Alias of gh",
    usage: "github [user]",
    handler: githubHandler,
  })

  register({
    name: "system",
    summary: "Server & device info (live /api/system)",
    handler: () => ({
      pending: "querying system…",
      run: async () => {
        const data = await getJson<SystemResponse>("/api/system")
        return [
          accent(data.device.name),
          out(`chip      ${data.device.chip}`),
          out(`platform  ${data.device.platform} ${data.os.release}`),
          out(`arch      ${data.device.arch} · ${data.device.cpuCount} cores`),
          out(
            `memory    ${data.memory.freeGb.toFixed(1)} / ${data.memory.totalGb.toFixed(
              1,
            )} GB free`,
          ),
          out(`node      ${data.os.nodeVersion}`),
          out(`next      ${data.os.nextVersion}`),
          out(`build     ${data.build.commit} · ${data.build.env}`),
          out(`uptime    ${Math.round(data.serverUptimeSec / 60)} min`),
          out(
            `load      ${data.loadAvg.map((n) => n.toFixed(2)).join("  ")}`,
          ),
        ]
      },
    }),
  })

  const map = new Map<string, Command>()
  for (const c of commands) map.set(c.name, c)
  return map
}

/* ------------------------------------------------------------- component -- */

export default function Terminal({ isDarkMode }: TerminalProps) {
  const system = useSystem()
  const darkMode = isDarkMode ?? system.isDarkMode
  const registry = useMemo(buildRegistry, [])

  const [lines, setLines] = useState<Line[]>(() => [
    { id: 0, kind: "dim", text: `Last login: ${new Date().toLocaleString()}` },
    { id: 1, kind: "out", text: "Welcome to apple-techie's terminal." },
    { id: 2, kind: "dim", text: "Type 'help' for a list of commands." },
    { id: 3, kind: "out", text: "" },
  ])
  const [input, setInput] = useState("")
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  const idRef = useRef(4)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const nextId = () => idRef.current++

  const append = useCallback((newLines: Omit<Line, "id">[]) => {
    setLines((prev) => [...prev, ...newLines.map((l) => ({ ...l, id: nextId() }))])
  }, [])

  // Auto-scroll to the latest output.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lines])

  const focusInput = useCallback(() => {
    inputRef.current?.focus()
  }, [])

  const runCommand = useCallback(
    (raw: string) => {
      const trimmed = raw.trim()
      append([{ kind: "prompt", text: `${PROMPT} ${raw}` }])
      if (!trimmed) return

      const tokens = trimmed.split(/\s+/)
      const name = tokens[0].toLowerCase()
      const args = tokens.slice(1)
      const command = registry.get(name)

      if (!command) {
        append([
          errLine(`error: command not found: ${name}`),
          dim("type 'help' to see available commands"),
        ])
        return
      }

      const result = command.handler({
        args,
        raw: trimmed,
        theme: system.theme,
        isDarkMode: darkMode,
      })

      if ("clear" in result) {
        setLines([])
        return
      }
      if ("lines" in result) {
        append(result.lines)
        return
      }

      // Async streaming: print a pending placeholder, then replace it.
      const pendingId = nextId()
      setLines((prev) => [
        ...prev,
        { id: pendingId, kind: "pending", text: result.pending },
      ])

      result
        .run()
        .then((resolved) => {
          setLines((prev) => {
            const idx = prev.findIndex((l) => l.id === pendingId)
            const replacement = (
              resolved.length ? resolved : [dim("(no output)")]
            ).map((l) => ({ ...l, id: nextId() }))
            if (idx === -1) return [...prev, ...replacement]
            return [...prev.slice(0, idx), ...replacement, ...prev.slice(idx + 1)]
          })
        })
        .catch((err) => {
          setLines((prev) => {
            const idx = prev.findIndex((l) => l.id === pendingId)
            const replacement: Line = {
              id: nextId(),
              kind: "error",
              text: `error: ${messageOf(err)}`,
            }
            if (idx === -1) return [...prev, replacement]
            return [...prev.slice(0, idx), replacement, ...prev.slice(idx + 1)]
          })
        })
    },
    [append, darkMode, registry, system.theme],
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const value = input
      if (value.trim()) {
        setCommandHistory((prev) => [...prev, value])
      }
      setHistoryIndex(-1)
      setInput("")
      runCommand(value)
      return
    }

    if (e.key === "ArrowUp") {
      e.preventDefault()
      setCommandHistory((hist) => {
        if (hist.length === 0) return hist
        const idx = historyIndex === -1 ? hist.length - 1 : Math.max(0, historyIndex - 1)
        setHistoryIndex(idx)
        setInput(hist[idx])
        return hist
      })
      return
    }

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setCommandHistory((hist) => {
        if (hist.length === 0 || historyIndex === -1) return hist
        const idx = historyIndex + 1
        if (idx >= hist.length) {
          setHistoryIndex(-1)
          setInput("")
        } else {
          setHistoryIndex(idx)
          setInput(hist[idx])
        }
        return hist
      })
      return
    }

    if (e.key === "l" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      setLines([])
    }
  }

  const lineClass: Record<LineKind, string> = {
    out: "text-zinc-100",
    prompt: "text-emerald-300/90",
    error: "text-rose-400",
    dim: "text-zinc-400",
    accent: "text-sky-300",
    pending: "text-amber-300/90",
  }

  return (
    <div
      className="flex h-full flex-col bg-[#0b0c10] font-mono text-[13px] leading-relaxed text-zinc-100"
      onMouseDown={focusInput}
    >
      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-label="Terminal output"
        className="flex-1 overflow-auto px-4 pt-4 pb-2"
      >
        {lines.map((line) => (
          <div
            key={line.id}
            className={cn("whitespace-pre-wrap break-words", lineClass[line.kind])}
          >
            {line.kind === "pending" ? `… ${line.text}` : line.text || " "}
          </div>
        ))}

        <div className="flex items-center">
          <span className="mr-2 shrink-0 text-emerald-400" aria-hidden="true">
            {PROMPT}
          </span>
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
              aria-label="Terminal input"
              className="w-full bg-transparent text-zinc-100 caret-emerald-400 outline-none lg-focus rounded-sm"
              autoFocus
            />
          </div>
        </div>
      </div>
    </div>
  )
}
