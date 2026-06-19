"use client"

import { useMemo, useState, type ReactNode } from "react"
import {
  Info,
  Palette,
  Wifi,
  WifiOff,
  Bluetooth,
  Sun,
  Volume2,
  VolumeX,
  Lock,
  Check,
  RefreshCw,
  AlertTriangle,
  Cpu,
  MemoryStick,
  Activity,
  Clock,
  HardDrive,
  Laptop,
  Signal,
  Headphones,
  Keyboard,
  Watch,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useSystem } from "@/components/system-provider"
import { useApi } from "@/hooks/use-api"
import type { SystemResponse } from "@/lib/api/types"

type SectionId = "general" | "appearance" | "wifi" | "bluetooth" | "displays" | "sound"

interface SectionDef {
  id: SectionId
  name: string
  icon: ReactNode
  tint: string
}

const SECTIONS: SectionDef[] = [
  { id: "general", name: "General", icon: <Info className="h-3.5 w-3.5" />, tint: "bg-gray-500" },
  { id: "appearance", name: "Appearance", icon: <Palette className="h-3.5 w-3.5" />, tint: "bg-fuchsia-500" },
  { id: "wifi", name: "Wi-Fi", icon: <Wifi className="h-3.5 w-3.5" />, tint: "bg-blue-500" },
  { id: "bluetooth", name: "Bluetooth", icon: <Bluetooth className="h-3.5 w-3.5" />, tint: "bg-sky-500" },
  { id: "displays", name: "Displays", icon: <Sun className="h-3.5 w-3.5" />, tint: "bg-amber-500" },
  { id: "sound", name: "Sound", icon: <Volume2 className="h-3.5 w-3.5" />, tint: "bg-rose-500" },
]

/* ----------------------------------------------------------------- helpers -- */

function formatUptime(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec))
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const parts: string[] = []
  if (d) parts.push(`${d}d`)
  if (h || d) parts.push(`${h}h`)
  if (m || h || d) parts.push(`${m}m`)
  parts.push(`${sec}s`)
  return parts.join(" ")
}

function prettyPlatform(platform: string): string {
  const map: Record<string, string> = {
    darwin: "macOS",
    linux: "Linux",
    win32: "Windows",
  }
  return map[platform] ?? platform
}

/* ------------------------------------------------------------ shared atoms -- */

function DemoPill() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
      Demo data
    </span>
  )
}

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("glass rounded-control overflow-hidden", className)}>{children}</div>
}

function Row({
  children,
  className,
  divider = true,
}: {
  children: ReactNode
  className?: string
  divider?: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3",
        divider && "border-b border-border/60 last:border-b-0",
        className,
      )}
    >
      {children}
    </div>
  )
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "lg-focus relative inline-flex h-[26px] w-[44px] shrink-0 items-center rounded-full transition-colors duration-200 ease-glass",
        checked ? "bg-[var(--lg-accent)]" : "bg-muted-foreground/30",
      )}
    >
      <span
        className={cn(
          "inline-block h-[22px] w-[22px] transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-spring",
          checked ? "translate-x-[20px]" : "translate-x-[2px]",
        )}
      />
    </button>
  )
}

function Slider({
  value,
  min,
  max,
  onChange,
  label,
  leftIcon,
  rightIcon,
}: {
  value: number
  min: number
  max: number
  onChange: (v: number) => void
  label: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="flex items-center gap-3">
      {leftIcon ? <span className="text-muted-foreground">{leftIcon}</span> : null}
      <div className="relative flex h-6 flex-1 items-center">
        <div className="absolute inset-x-0 h-2 rounded-full bg-muted-foreground/20" />
        <div
          className="absolute h-2 rounded-full bg-[var(--lg-accent)]"
          style={{ width: `${pct}%` }}
          aria-hidden
        />
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          aria-label={label}
          onChange={(e) => onChange(Number(e.target.value))}
          className="lg-focus settings-range relative z-10 h-6 w-full cursor-pointer appearance-none bg-transparent"
        />
      </div>
      {rightIcon ? <span className="text-muted-foreground">{rightIcon}</span> : null}
      <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        {Math.round(pct)}%
      </span>
      <style jsx>{`
        .settings-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          height: 22px;
          width: 22px;
          border-radius: 9999px;
          background: #ffffff;
          border: 0.5px solid rgba(0, 0, 0, 0.18);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
          cursor: pointer;
        }
        .settings-range::-moz-range-thumb {
          height: 22px;
          width: 22px;
          border-radius: 9999px;
          background: #ffffff;
          border: 0.5px solid rgba(0, 0, 0, 0.18);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
          cursor: pointer;
        }
      `}</style>
    </div>
  )
}

function SectionHeader({ title, subtitle, aside }: { title: string; subtitle?: string; aside?: ReactNode }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {aside}
    </div>
  )
}

function SettingLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-medium text-foreground">{label}</p>
      {hint ? <p className="truncate text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

/* ------------------------------------------------------------------ panes -- */

function GeneralPane() {
  const { data, error, loading, isMock, refetch } = useApi<SystemResponse>("/api/system", { pollMs: 5000 })

  if (loading && !data) {
    return (
      <div>
        <SectionHeader title="About" subtitle="This Mac" />
        <Card>
          {Array.from({ length: 6 }).map((_, i) => (
            <Row key={i}>
              <div className="h-4 w-28 animate-pulse rounded bg-muted" />
              <div className="ml-auto h-4 w-40 animate-pulse rounded bg-muted" />
            </Row>
          ))}
        </Card>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div>
        <SectionHeader title="About" subtitle="This Mac" />
        <Card>
          <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-sm font-medium text-foreground">Couldn&apos;t load system info</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{error}</p>
            </div>
            <button
              type="button"
              onClick={refetch}
              className="lg-focus glass-interactive inline-flex items-center gap-2 rounded-control px-3 py-1.5 text-sm font-medium text-foreground"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        </Card>
      </div>
    )
  }

  if (!data) return null

  const memUsedGb = Math.max(0, data.memory.totalGb - data.memory.freeGb)
  const memPct = data.memory.totalGb > 0 ? (memUsedGb / data.memory.totalGb) * 100 : 0
  const load1 = data.loadAvg[0] ?? 0
  const loadPct = data.device.cpuCount > 0 ? Math.min(100, (load1 / data.device.cpuCount) * 100) : 0

  return (
    <div className="space-y-6">
      <SectionHeader
        title="About"
        subtitle="This Mac"
        aside={
          <div className="flex items-center gap-2">
            {isMock ? <DemoPill /> : null}
            <button
              type="button"
              onClick={refetch}
              aria-label="Refresh system info"
              className="lg-focus glass-interactive inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            </button>
          </div>
        }
      />

      {/* Hero device card */}
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-200 to-zinc-400 text-zinc-700 shadow-glass dark:from-zinc-700 dark:to-zinc-900 dark:text-zinc-200">
            <Laptop className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-foreground">{data.device.name}</p>
            <p className="text-sm text-muted-foreground">{data.device.chip}</p>
          </div>
        </div>
      </Card>

      {/* Hardware */}
      <Card>
        <Row>
          <Cpu className="h-4 w-4 text-muted-foreground" />
          <SettingLabel label="Chip" />
          <span className="text-sm text-muted-foreground">{data.device.chip}</span>
        </Row>
        <Row>
          <HardDrive className="h-4 w-4 text-muted-foreground" />
          <SettingLabel label="Platform" />
          <span className="text-sm text-muted-foreground">
            {prettyPlatform(data.device.platform)} · {data.device.arch}
          </span>
        </Row>
        <Row>
          <Cpu className="h-4 w-4 text-muted-foreground" />
          <SettingLabel label="Cores" />
          <span className="text-sm tabular-nums text-muted-foreground">{data.device.cpuCount}</span>
        </Row>
      </Card>

      {/* Memory */}
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <MemoryStick className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Memory</p>
          <span className="ml-auto text-xs tabular-nums text-muted-foreground">
            {memUsedGb.toFixed(1)} GB of {data.memory.totalGb.toFixed(1)} GB used
          </span>
        </div>
        <div
          className="h-2.5 w-full overflow-hidden rounded-full bg-muted-foreground/15"
          role="progressbar"
          aria-valuenow={Math.round(memPct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Memory usage"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-[width] duration-500 ease-glass"
            style={{ width: `${memPct}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{data.memory.freeGb.toFixed(1)} GB free</p>
      </Card>

      {/* Load average */}
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">CPU Load</p>
          <span className="ml-auto text-xs tabular-nums text-muted-foreground">
            {data.loadAvg.map((n) => n.toFixed(2)).join("  ·  ")}
          </span>
        </div>
        <div
          className="h-2.5 w-full overflow-hidden rounded-full bg-muted-foreground/15"
          role="progressbar"
          aria-valuenow={Math.round(loadPct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="CPU load (1 minute)"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-600 transition-[width] duration-500 ease-glass"
            style={{ width: `${loadPct}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">1m · 5m · 15m load average</p>
      </Card>

      {/* System / build */}
      <Card>
        <Row>
          <Info className="h-4 w-4 text-muted-foreground" />
          <SettingLabel label="macOS" />
          <span className="text-sm text-muted-foreground">macOS Tahoe 26 ({data.os.release})</span>
        </Row>
        <Row>
          <SettingLabel label="Node" />
          <span className="text-sm tabular-nums text-muted-foreground">{data.os.nodeVersion}</span>
        </Row>
        <Row>
          <SettingLabel label="Next.js" />
          <span className="text-sm tabular-nums text-muted-foreground">{data.os.nextVersion}</span>
        </Row>
        <Row>
          <SettingLabel label="Build" />
          <span className="font-mono text-xs text-muted-foreground">
            {data.build.commit} · {data.build.env}
          </span>
        </Row>
        <Row>
          <Clock className="h-4 w-4 text-muted-foreground" />
          <SettingLabel label="Server uptime" />
          <span className="text-sm tabular-nums text-muted-foreground">
            {formatUptime(data.serverUptimeSec)}
          </span>
        </Row>
      </Card>
    </div>
  )
}

const THEME_OPTIONS = [
  { id: "light" as const, name: "Light" },
  { id: "dark" as const, name: "Dark" },
  { id: "system" as const, name: "Auto" },
]

const ACCENTS = [
  { name: "Blue", color: "#0a84ff" },
  { name: "Purple", color: "#bf5af2" },
  { name: "Pink", color: "#ff375f" },
  { name: "Red", color: "#ff453a" },
  { name: "Orange", color: "#ff9f0a" },
  { name: "Yellow", color: "#ffd60a" },
  { name: "Green", color: "#32d74b" },
  { name: "Graphite", color: "#8e8e93" },
]

function ThemeSwatch({ id }: { id: "light" | "dark" | "system" }) {
  if (id === "light") {
    return (
      <div className="h-16 w-full overflow-hidden rounded-lg bg-gradient-to-br from-sky-200 to-indigo-200">
        <div className="h-4 bg-white/70" />
      </div>
    )
  }
  if (id === "dark") {
    return (
      <div className="h-16 w-full overflow-hidden rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-950">
        <div className="h-4 bg-white/10" />
      </div>
    )
  }
  return (
    <div className="flex h-16 w-full overflow-hidden rounded-lg">
      <div className="h-full w-1/2 bg-gradient-to-br from-sky-200 to-indigo-200" />
      <div className="h-full w-1/2 bg-gradient-to-br from-zinc-800 to-zinc-950" />
    </div>
  )
}

function AppearancePane() {
  const { theme, setTheme } = useSystem()
  const [accent, setAccent] = useState("#0a84ff")

  return (
    <div className="space-y-6">
      <SectionHeader title="Appearance" subtitle="Customize how this Mac looks" />

      <div>
        <p className="mb-3 text-sm font-medium text-foreground">Theme</p>
        <div className="grid grid-cols-3 gap-3">
          {THEME_OPTIONS.map((opt) => {
            const active = theme === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTheme(opt.id)}
                aria-pressed={active}
                className={cn(
                  "lg-focus group rounded-control p-1.5 text-left transition-all duration-200 ease-glass",
                  active
                    ? "ring-2 ring-[var(--lg-accent)] ring-offset-2 ring-offset-background"
                    : "ring-1 ring-border hover:ring-muted-foreground/40",
                )}
              >
                <ThemeSwatch id={opt.id} />
                <div className="mt-2 flex items-center justify-center gap-1.5 pb-1">
                  {active ? (
                    <Check className="h-3.5 w-3.5 text-[var(--lg-accent)]" />
                  ) : null}
                  <span className="text-sm font-medium text-foreground">{opt.name}</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-medium text-foreground">Accent color</p>
        <div className="flex flex-wrap gap-3">
          {ACCENTS.map((a) => {
            const active = accent === a.color
            return (
              <button
                key={a.name}
                type="button"
                onClick={() => setAccent(a.color)}
                aria-label={`${a.name} accent`}
                aria-pressed={active}
                className={cn(
                  "lg-focus flex h-8 w-8 items-center justify-center rounded-full transition-transform duration-150 ease-spring hover:scale-110",
                  active && "ring-2 ring-offset-2 ring-offset-background",
                )}
                style={{ backgroundColor: a.color, boxShadow: active ? `0 0 0 2px ${a.color}` : undefined }}
              >
                {active ? <Check className="h-4 w-4 text-white drop-shadow" /> : null}
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">A preview of system accent options.</p>
      </div>
    </div>
  )
}

const WIFI_NETWORKS = [
  { name: "Daniel's Studio", secured: true, strength: 3 },
  { name: "Tahoe Guest", secured: false, strength: 2 },
  { name: "Xfinity-7B2F", secured: true, strength: 2 },
  { name: "ATT-Fiber-104", secured: true, strength: 1 },
]

function SignalBars({ strength }: { strength: number }) {
  return (
    <span className="flex items-end gap-0.5" aria-hidden>
      {[1, 2, 3].map((bar) => (
        <span
          key={bar}
          className={cn(
            "w-1 rounded-sm",
            bar <= strength ? "bg-foreground" : "bg-muted-foreground/30",
          )}
          style={{ height: `${bar * 4 + 2}px` }}
        />
      ))}
    </span>
  )
}

function WifiPane() {
  const { wifiEnabled, toggleWifi } = useSystem()

  return (
    <div className="space-y-6">
      <SectionHeader title="Wi-Fi" subtitle={wifiEnabled ? "Connected to Daniel's Studio" : "Wi-Fi is off"} />

      <Card>
        <Row divider={false}>
          {wifiEnabled ? (
            <Wifi className="h-5 w-5 text-[var(--lg-accent)]" />
          ) : (
            <WifiOff className="h-5 w-5 text-muted-foreground" />
          )}
          <SettingLabel label="Wi-Fi" hint={wifiEnabled ? "On" : "Off"} />
          <Toggle checked={wifiEnabled} onChange={toggleWifi} label="Toggle Wi-Fi" />
        </Row>
      </Card>

      {wifiEnabled ? (
        <div>
          <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Networks
          </p>
          <Card>
            {WIFI_NETWORKS.map((net, i) => {
              const connected = i === 0
              return (
                <Row key={net.name}>
                  <Signal className="h-4 w-4 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{net.name}</p>
                    {connected ? <p className="text-xs text-[var(--lg-accent)]">Connected</p> : null}
                  </div>
                  {net.secured ? <Lock className="h-3.5 w-3.5 text-muted-foreground" /> : null}
                  <SignalBars strength={net.strength} />
                  {connected ? <Check className="h-4 w-4 text-[var(--lg-accent)]" /> : null}
                </Row>
              )
            })}
          </Card>
        </div>
      ) : null}
    </div>
  )
}

const BT_DEVICES = [
  { name: "Daniel's AirPods Pro", kind: "audio", connected: true, battery: 82 },
  { name: "Magic Keyboard", kind: "keyboard", connected: true, battery: 64 },
  { name: "Apple Watch", kind: "watch", connected: false, battery: null as number | null },
  { name: "Magic Mouse", kind: "mouse", connected: false, battery: null as number | null },
]

function btIcon(kind: string) {
  if (kind === "audio") return <Headphones className="h-4 w-4 text-muted-foreground" />
  if (kind === "keyboard") return <Keyboard className="h-4 w-4 text-muted-foreground" />
  if (kind === "watch") return <Watch className="h-4 w-4 text-muted-foreground" />
  return <Bluetooth className="h-4 w-4 text-muted-foreground" />
}

function BluetoothPane() {
  const { bluetoothEnabled, toggleBluetooth } = useSystem()

  return (
    <div className="space-y-6">
      <SectionHeader title="Bluetooth" subtitle={bluetoothEnabled ? "Discoverable as “Daniel's Mac”" : "Bluetooth is off"} />

      <Card>
        <Row divider={false}>
          <Bluetooth className={cn("h-5 w-5", bluetoothEnabled ? "text-[var(--lg-accent)]" : "text-muted-foreground")} />
          <SettingLabel label="Bluetooth" hint={bluetoothEnabled ? "On" : "Off"} />
          <Toggle checked={bluetoothEnabled} onChange={toggleBluetooth} label="Toggle Bluetooth" />
        </Row>
      </Card>

      {bluetoothEnabled ? (
        <div>
          <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Devices
          </p>
          <Card>
            {BT_DEVICES.map((dev) => (
              <Row key={dev.name}>
                {btIcon(dev.kind)}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{dev.name}</p>
                  <p className={cn("text-xs", dev.connected ? "text-[var(--lg-accent)]" : "text-muted-foreground")}>
                    {dev.connected ? "Connected" : "Not Connected"}
                  </p>
                </div>
                {dev.battery !== null ? (
                  <span className="text-xs tabular-nums text-muted-foreground">{dev.battery}%</span>
                ) : null}
              </Row>
            ))}
          </Card>
        </div>
      ) : null}
    </div>
  )
}

function DisplaysPane() {
  const { brightness, setBrightness } = useSystem()

  return (
    <div className="space-y-6">
      <SectionHeader title="Displays" subtitle="Built-in Liquid Retina XDR Display" />

      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <Sun className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Brightness</p>
        </div>
        <Slider
          value={brightness}
          min={10}
          max={100}
          onChange={setBrightness}
          label="Display brightness"
          leftIcon={<Sun className="h-3.5 w-3.5" />}
          rightIcon={<Sun className="h-5 w-5" />}
        />
      </Card>

      <Card>
        <Row>
          <SettingLabel label="Resolution" hint="Default for display" />
          <span className="text-sm text-muted-foreground">3456 × 2234</span>
        </Row>
        <Row>
          <SettingLabel label="Color profile" />
          <span className="text-sm text-muted-foreground">Apple XDR Display (P3-1600 nits)</span>
        </Row>
        <Row>
          <SettingLabel label="Refresh rate" />
          <span className="text-sm text-muted-foreground">ProMotion (up to 120 Hz)</span>
        </Row>
      </Card>
    </div>
  )
}

function SoundPane() {
  const { volume, setVolume, muted, toggleMuted } = useSystem()
  const effective = muted ? 0 : volume

  return (
    <div className="space-y-6">
      <SectionHeader title="Sound" subtitle="MacBook Pro Speakers" />

      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Output volume</p>
          <button
            type="button"
            onClick={toggleMuted}
            aria-pressed={muted}
            aria-label={muted ? "Unmute" : "Mute"}
            className={cn(
              "lg-focus glass-interactive ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
              muted ? "text-rose-500" : "text-muted-foreground",
            )}
          >
            {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            {muted ? "Muted" : "Mute"}
          </button>
        </div>
        <Slider
          value={effective}
          min={0}
          max={100}
          onChange={setVolume}
          label="Output volume"
          leftIcon={<VolumeX className="h-3.5 w-3.5" />}
          rightIcon={<Volume2 className="h-3.5 w-3.5" />}
        />
      </Card>

      <Card>
        <Row>
          <SettingLabel label="Output device" />
          <span className="text-sm text-muted-foreground">MacBook Pro Speakers</span>
        </Row>
        <Row>
          <SettingLabel label="Input device" />
          <span className="text-sm text-muted-foreground">MacBook Pro Microphone</span>
        </Row>
        <Row>
          <SettingLabel label="Alert sound" />
          <span className="text-sm text-muted-foreground">Boop</span>
        </Row>
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------- shell -- */

export default function Settings() {
  const [active, setActive] = useState<SectionId>("general")

  const pane = useMemo(() => {
    switch (active) {
      case "general":
        return <GeneralPane />
      case "appearance":
        return <AppearancePane />
      case "wifi":
        return <WifiPane />
      case "bluetooth":
        return <BluetoothPane />
      case "displays":
        return <DisplaysPane />
      case "sound":
        return <SoundPane />
    }
  }, [active])

  return (
    <div className="flex h-full bg-background text-foreground">
      {/* Sidebar */}
      <nav
        aria-label="Settings sections"
        className="glass-thin w-52 shrink-0 overflow-y-auto border-r border-border/60 p-2.5"
      >
        <ul className="space-y-0.5">
          {SECTIONS.map((s) => {
            const isActive = active === s.id
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setActive(s.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "lg-focus flex w-full items-center gap-2.5 rounded-control px-2.5 py-1.5 text-sm font-medium transition-colors duration-150",
                    isActive
                      ? "glass-tint-accent text-foreground"
                      : "text-foreground/80 hover:bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-md text-white shadow-sm",
                      s.tint,
                    )}
                  >
                    {s.icon}
                  </span>
                  {s.name}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-7">{pane}</div>
      </div>
    </div>
  )
}
