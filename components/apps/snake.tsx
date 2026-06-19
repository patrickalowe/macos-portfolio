"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Play,
  Pause,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Gamepad2,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SnakeProps {
  isDarkMode?: boolean
}

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT"
type Position = { x: number; y: number }

const GRID_SIZE = 20
const CELL_SIZE = 22
const GAME_SPEED = 110
const HIGH_SCORE_KEY = "snakeHighScore"

const OPPOSITE: Record<Direction, Direction> = {
  UP: "DOWN",
  DOWN: "UP",
  LEFT: "RIGHT",
  RIGHT: "LEFT",
}

const INITIAL_SNAKE: Position[] = [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 },
]

function randomFood(snake: Position[]): Position {
  // Build a set of free cells so spawning is O(grid) and never recurses forever.
  const occupied = new Set(snake.map((s) => `${s.x},${s.y}`))
  const free: Position[] = []
  for (let x = 0; x < GRID_SIZE; x++) {
    for (let y = 0; y < GRID_SIZE; y++) {
      if (!occupied.has(`${x},${y}`)) free.push({ x, y })
    }
  }
  if (free.length === 0) return { x: 0, y: 0 }
  return free[Math.floor(Math.random() * free.length)]
}

export default function Snake({ isDarkMode = true }: SnakeProps) {
  const [gameOver, setGameOver] = useState(false)
  const [isPaused, setIsPaused] = useState(true)
  const [hasStarted, setHasStarted] = useState(false)
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)

  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Authoritative mutable game state — the tick reads/writes these refs so the
  // interval effect never needs to tear down on every render or capture stale state.
  const snakeRef = useRef<Position[]>(INITIAL_SNAKE)
  const foodRef = useRef<Position>({ x: 5, y: 5 })
  const directionRef = useRef<Direction>("UP")
  const pendingDirectionRef = useRef<Direction>("UP")
  const scoreRef = useRef(0)
  const highScoreRef = useRef(0)
  const isDarkModeRef = useRef(isDarkMode)

  useEffect(() => {
    isDarkModeRef.current = isDarkMode
  }, [isDarkMode])

  // --- Rendering ---------------------------------------------------------
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dark = isDarkModeRef.current
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
    const logicalW = GRID_SIZE * CELL_SIZE
    const logicalH = GRID_SIZE * CELL_SIZE

    // Keep the backing store crisp on HiDPI displays.
    if (canvas.width !== logicalW * dpr || canvas.height !== logicalH * dpr) {
      canvas.width = logicalW * dpr
      canvas.height = logicalH * dpr
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const board = dark ? "#0c1116" : "#f3f5f7"
    const gridA = dark ? "#11181f" : "#e9edf1"
    const gridB = dark ? "#0e151b" : "#eef2f5"
    const snakeBody = dark ? "#34d399" : "#16a34a"
    const snakeHead = dark ? "#6ee7b7" : "#15803d"
    const foodColor = dark ? "#fb7185" : "#e11d48"

    ctx.clearRect(0, 0, logicalW, logicalH)
    ctx.fillStyle = board
    ctx.fillRect(0, 0, logicalW, logicalH)

    // Checkerboard grid
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        ctx.fillStyle = (i + j) % 2 === 0 ? gridA : gridB
        ctx.fillRect(i * CELL_SIZE, j * CELL_SIZE, CELL_SIZE, CELL_SIZE)
      }
    }

    // Food (pulsing dot)
    const f = foodRef.current
    const fx = f.x * CELL_SIZE + CELL_SIZE / 2
    const fy = f.y * CELL_SIZE + CELL_SIZE / 2
    ctx.fillStyle = foodColor
    ctx.beginPath()
    ctx.arc(fx, fy, CELL_SIZE / 2 - 2.5, 0, Math.PI * 2)
    ctx.fill()

    // Snake with rounded cells
    const snake = snakeRef.current
    const radius = 5
    snake.forEach((seg, idx) => {
      ctx.fillStyle = idx === 0 ? snakeHead : snakeBody
      const px = seg.x * CELL_SIZE + 1.5
      const py = seg.y * CELL_SIZE + 1.5
      const size = CELL_SIZE - 3
      ctx.beginPath()
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(px, py, size, size, radius)
      } else {
        ctx.rect(px, py, size, size)
      }
      ctx.fill()
    })
  }, [])

  // Keep a stable draw reference for the loop.
  const drawRef = useRef(draw)
  useEffect(() => {
    drawRef.current = draw
    draw()
  }, [draw])

  // --- Game tick ---------------------------------------------------------
  const tick = useCallback(() => {
    const snake = snakeRef.current

    // Commit the queued direction, rejecting 180° reversals.
    const queued = pendingDirectionRef.current
    if (queued !== OPPOSITE[directionRef.current]) {
      directionRef.current = queued
    }
    const dir = directionRef.current

    const head = { ...snake[0] }
    if (dir === "UP") head.y -= 1
    else if (dir === "DOWN") head.y += 1
    else if (dir === "LEFT") head.x -= 1
    else if (dir === "RIGHT") head.x += 1

    // Wall collision
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
      setGameOver(true)
      return
    }

    const eating = head.x === foodRef.current.x && head.y === foodRef.current.y

    // Self collision. When not eating, the tail cell will vacate this tick, so
    // exclude it from the check — a length-n snake moving forward must not
    // false-positive on its own last segment.
    const tailIndex = snake.length - 1
    for (let i = 0; i < snake.length; i++) {
      if (!eating && i === tailIndex) continue
      if (snake[i].x === head.x && snake[i].y === head.y) {
        setGameOver(true)
        return
      }
    }

    const newSnake = [head, ...snake]
    if (eating) {
      foodRef.current = randomFood(newSnake)
      const newScore = scoreRef.current + 10
      scoreRef.current = newScore
      setScore(newScore)
      if (newScore > highScoreRef.current) {
        highScoreRef.current = newScore
        setHighScore(newScore)
      }
    } else {
      newSnake.pop()
    }
    snakeRef.current = newSnake
    drawRef.current()
  }, [])

  const tickRef = useRef(tick)
  useEffect(() => {
    tickRef.current = tick
  }, [tick])

  // Stable interval: only re-arms when running state actually changes.
  useEffect(() => {
    if (isPaused || gameOver || !hasStarted) return
    const id = window.setInterval(() => tickRef.current(), GAME_SPEED)
    return () => window.clearInterval(id)
  }, [isPaused, gameOver, hasStarted])

  // --- Persisted high score ---------------------------------------------
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(HIGH_SCORE_KEY)
      if (saved) {
        const n = Number.parseInt(saved, 10)
        if (!Number.isNaN(n)) {
          highScoreRef.current = n
          setHighScore(n)
        }
      }
    } catch {
      /* storage unavailable */
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(HIGH_SCORE_KEY, highScore.toString())
    } catch {
      /* storage unavailable */
    }
  }, [highScore])

  // --- Auto-pause on blur / tab hidden ----------------------------------
  useEffect(() => {
    const pause = () => setIsPaused(true)
    const onVisibility = () => {
      if (document.hidden) setIsPaused(true)
    }
    window.addEventListener("blur", pause)
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      window.removeEventListener("blur", pause)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])

  // --- Input -------------------------------------------------------------
  const queueDirection = useCallback((next: Direction) => {
    // Reject reversals relative to the last *committed* direction.
    if (next === OPPOSITE[directionRef.current]) return
    pendingDirectionRef.current = next
  }, [])

  const startGame = useCallback(() => {
    snakeRef.current = INITIAL_SNAKE
    foodRef.current = randomFood(INITIAL_SNAKE)
    directionRef.current = "UP"
    pendingDirectionRef.current = "UP"
    scoreRef.current = 0
    setScore(0)
    setGameOver(false)
    setHasStarted(true)
    setIsPaused(false)
    drawRef.current()
  }, [])

  const togglePause = useCallback(() => {
    if (gameOver) return
    if (!hasStarted) {
      startGame()
      return
    }
    setIsPaused((p) => !p)
  }, [gameOver, hasStarted, startGame])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key
      let handled = true
      switch (key) {
        case "ArrowUp":
        case "w":
        case "W":
          queueDirection("UP")
          break
        case "ArrowDown":
        case "s":
        case "S":
          queueDirection("DOWN")
          break
        case "ArrowLeft":
        case "a":
        case "A":
          queueDirection("LEFT")
          break
        case "ArrowRight":
        case "d":
        case "D":
          queueDirection("RIGHT")
          break
        case " ":
          togglePause()
          break
        default:
          handled = false
      }
      if (handled) e.preventDefault()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [queueDirection, togglePause])

  // Initial paint
  useEffect(() => {
    foodRef.current = randomFood(snakeRef.current)
    drawRef.current()
  }, [])

  const running = hasStarted && !isPaused && !gameOver

  return (
    <div className="flex h-full w-full flex-col bg-background text-foreground">
      {/* Scoreboard / chrome */}
      <div className="glass-chrome flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-control bg-muted text-foreground">
            <Gamepad2 className="h-4 w-4" aria-hidden="true" />
          </span>
          <h2 className="text-sm font-semibold lg-vibrant">Snake</h2>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="flex flex-col items-end rounded-control bg-muted px-3 py-1 leading-none"
            aria-label={`Score ${score}`}
          >
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Score</span>
            <span className="font-mono text-sm font-semibold tabular-nums">{score}</span>
          </div>
          <div
            className="flex flex-col items-end rounded-control bg-muted px-3 py-1 leading-none"
            aria-label={`High score ${highScore}`}
          >
            <span className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              <Trophy className="h-2.5 w-2.5" aria-hidden="true" /> Best
            </span>
            <span className="font-mono text-sm font-semibold tabular-nums">{highScore}</span>
          </div>
        </div>
      </div>

      {/* Controls bar */}
      <div className="flex items-center justify-center gap-2 border-b border-border px-4 py-2">
        <button
          type="button"
          onClick={togglePause}
          disabled={gameOver}
          aria-label={running ? "Pause game" : "Start game"}
          className={cn(
            "glass-interactive lg-focus inline-flex items-center gap-1.5 rounded-control px-3.5 py-1.5 text-sm font-medium",
            "bg-card text-foreground disabled:pointer-events-none disabled:opacity-40",
          )}
        >
          {running ? (
            <>
              <Pause className="h-4 w-4" aria-hidden="true" /> Pause
            </>
          ) : (
            <>
              <Play className="h-4 w-4" aria-hidden="true" /> {hasStarted ? "Resume" : "Start"}
            </>
          )}
        </button>
        <button
          type="button"
          onClick={startGame}
          aria-label="Restart game"
          className={cn(
            "glass-interactive lg-focus inline-flex items-center gap-1.5 rounded-control px-3.5 py-1.5 text-sm font-medium",
            "bg-card text-foreground",
          )}
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" /> Restart
        </button>
      </div>

      {/* Board */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-4">
        <div className="relative">
          <canvas
            ref={canvasRef}
            style={{ width: GRID_SIZE * CELL_SIZE, height: GRID_SIZE * CELL_SIZE }}
            className="rounded-tile border border-border shadow-glass"
            aria-label="Snake game board"
            role="img"
          />

          {/* Idle / start overlay */}
          {!hasStarted && !gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-tile bg-background/70 backdrop-blur-glass">
              <Gamepad2 className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">Use arrow keys, WASD, or the pad</p>
              <button
                type="button"
                onClick={startGame}
                className="glass-interactive glass-tint-accent lg-focus inline-flex items-center gap-1.5 rounded-control px-5 py-2 text-sm font-semibold text-foreground"
              >
                <Play className="h-4 w-4" aria-hidden="true" /> Start Game
              </button>
            </div>
          )}

          {/* Paused overlay (mid-game) */}
          {hasStarted && isPaused && !gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-tile bg-background/60 backdrop-blur-glass">
              <Pause className="h-9 w-9 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm font-medium text-muted-foreground">Paused</p>
              <button
                type="button"
                onClick={() => setIsPaused(false)}
                className="glass-interactive glass-tint-accent lg-focus inline-flex items-center gap-1.5 rounded-control px-5 py-2 text-sm font-semibold text-foreground"
              >
                <Play className="h-4 w-4" aria-hidden="true" /> Resume
              </button>
            </div>
          )}

          {/* Game over overlay */}
          {gameOver && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-tile bg-background/75 backdrop-blur-glass"
              role="alertdialog"
              aria-label="Game over"
            >
              <h3 className="text-lg font-bold text-foreground">Game Over</h3>
              <p className="text-sm text-muted-foreground">
                Score <span className="font-mono font-semibold text-foreground">{score}</span>
                {score >= highScore && score > 0 && (
                  <span className="ml-1.5 inline-flex items-center gap-1 text-[var(--lg-accent)]">
                    <Trophy className="h-3 w-3" aria-hidden="true" /> New best!
                  </span>
                )}
              </p>
              <button
                type="button"
                onClick={startGame}
                className="glass-interactive glass-tint-accent lg-focus mt-1 inline-flex items-center gap-1.5 rounded-control px-5 py-2 text-sm font-semibold text-foreground"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" /> Play Again
              </button>
            </div>
          )}
        </div>
      </div>

      {/* On-screen D-pad (touch) */}
      <div className="flex justify-center border-t border-border px-4 py-3">
        <div className="grid grid-cols-3 grid-rows-3 gap-1.5">
          <DpadButton
            className="col-start-2 row-start-1"
            label="Move up"
            onClick={() => queueDirection("UP")}
            disabled={!running}
          >
            <ChevronUp className="h-5 w-5" aria-hidden="true" />
          </DpadButton>
          <DpadButton
            className="col-start-1 row-start-2"
            label="Move left"
            onClick={() => queueDirection("LEFT")}
            disabled={!running}
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </DpadButton>
          <div className="col-start-2 row-start-2 flex items-center justify-center">
            <span className="h-2 w-2 rounded-full bg-border" aria-hidden="true" />
          </div>
          <DpadButton
            className="col-start-3 row-start-2"
            label="Move right"
            onClick={() => queueDirection("RIGHT")}
            disabled={!running}
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </DpadButton>
          <DpadButton
            className="col-start-2 row-start-3"
            label="Move down"
            onClick={() => queueDirection("DOWN")}
            disabled={!running}
          >
            <ChevronDown className="h-5 w-5" aria-hidden="true" />
          </DpadButton>
        </div>
      </div>
    </div>
  )
}

function DpadButton({
  children,
  label,
  onClick,
  disabled,
  className,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "glass-interactive lg-focus flex h-11 w-11 items-center justify-center rounded-control bg-card text-foreground",
        "disabled:pointer-events-none disabled:opacity-30",
        className,
      )}
    >
      {children}
    </button>
  )
}
