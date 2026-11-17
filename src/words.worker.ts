/// <reference lib="webworker" />
import init, { JSSolution } from '../solver/pkg/solver.js'
import type { LayoutObjective, LayoutResult, PieceInput, Request, Response } from './workerProtocol'
import { arrangeWord } from './lib/arrange'
import type { GridPiece } from './features/grid/gridSlice'
import { wordPoints } from './lib/scoring'

declare const self: DedicatedWorkerGlobalScope

const BASE = `${import.meta.env.BASE_URL}dict/`
const post = (msg: Response) => self.postMessage(msg)

let width = 8
let height = 9
let dictionary = ''
let solver: JSSolution | undefined
const wasmReady = init()
const index: Promise<Record<string, { words: number; bytes: number; gzipBytes: number }>> = fetch(`${BASE}index.json`).then((r) => {
  if (!r.ok) throw new Error(`failed to load dictionary index: ${r.status}`)
  return r.json()
})
const cache = new Map<string, Uint8Array>()

/** Throttle progress messages to ~20/s. */
function throttled() {
  let last = 0
  return (msg: Extract<Response, { type: 'progress' }>, force = false) => {
    const now = performance.now()
    if (force || now - last > 50) {
      last = now
      post(msg)
    }
  }
}

/** Fetch a prebuilt dictionary (gzipped FST), reporting download progress. */
async function download(name: string): Promise<Uint8Array> {
  const hit = cache.get(name)
  if (hit) return hit
  const meta = (await index)[name]
  if (!meta) throw new Error(`unknown dictionary "${name}"`)
  const res = await fetch(`${BASE}${name}.fst.gz`)
  if (!res.ok || !res.body) throw new Error(`failed to load dictionary "${name}": ${res.status}`)
  const progress = throttled()
  const chunks: Uint8Array[] = []
  let done = 0
  // If a server transparently decompresses, we receive the raw size instead.
  const expected = () => (done > meta.gzipBytes ? meta.bytes : meta.gzipBytes)
  const reader = res.body.getReader()
  for (;;) {
    const { done: end, value } = await reader.read()
    if (end) break
    chunks.push(value)
    done += value.length
    progress({ type: 'progress', phase: 'download', done: Math.min(done, expected()), total: expected() })
  }
  progress({ type: 'progress', phase: 'download', done, total: done }, true)
  let bytes = new Uint8Array(done)
  let o = 0
  for (const c of chunks) {
    bytes.set(c, o)
    o += c.length
  }
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
    bytes = new Uint8Array(await new Response(stream).arrayBuffer())
  }
  cache.set(name, bytes)
  return bytes
}

async function load(name: string) {
  const bytes = await download(name)
  await wasmReady
  post({ type: 'progress', phase: 'build', done: 0, total: 1 })
  const next = new JSSolution(width, height, bytes)
  solver?.free()
  solver = next
  dictionary = name
  post({ type: 'ready', dictionary, words: solver.word_count() })
}

function solve(id: string, pieces: PieceInput[]): string[] {
  if (!solver) throw new Error('solver not ready')
  const total = solver.start_solve(pieces)
  const progress = throttled()
  let done = 0
  while (done < total) {
    done = solver.step_solve(1)
    progress({ type: 'progress', id, phase: 'solve', done, total })
  }
  return solver.finish_solve()
}

// The page tells us which dictionary to load first (see WordSolver's start()).
/**
 * Layout search budget. Points: start each restart from a layout built around one of the
 * highest-scoring words (random starts rarely find the long words that carry the points).
 * Words: plain random restarts; seeding doesn't help there, more restarts does.
 */
const LAYOUT_PLAN: Record<LayoutObjective, { restarts: number; iterations: number; seeded: boolean }> = {
  points: { restarts: 12, iterations: 50_000, seeded: true },
  words: { restarts: 12, iterations: 100_000, seeded: false },
}

/** Starting layouts that spell each of the top-scoring words, as flat [x, y, ...] per piece. */
function seedLayouts(pieces: PieceInput[], count: number): Uint32Array[] {
  if (!solver) return []
  const grid: GridPiece[] = pieces.map((p, i) => {
    const l = p.letters.toUpperCase().split('')
    return { id: `p${i}`, width: p.width, height: p.height, cell: { x: 0, y: 0 }, matrix: p.height > 1 ? l.map((c) => [c]) : [l] }
  })
  const words: string[] = solver.solve(pieces)
  const ranked = words.sort((a, b) => wordPoints(b) - wordPoints(a) || a.localeCompare(b))
  const out: Uint32Array[] = []
  for (const w of ranked) {
    const a = arrangeWord(w, grid, width, height)
    if (a) out.push(Uint32Array.from(a.pieces.flatMap((p) => [p.cell.x, p.cell.y])))
    if (out.length >= count) break
  }
  return out
}

function bestLayout(id: string, pieces: PieceInput[], objective: LayoutObjective): LayoutResult {
  if (!solver) throw new Error('solver not ready')
  const plan = LAYOUT_PLAN[objective]
  const progress = throttled()
  const total = plan.restarts * plan.iterations
  const better = (a: LayoutResult, b?: LayoutResult) =>
    !b ||
    (objective === 'words'
      ? a.words.length - b.words.length || a.points - b.points
      : a.points - b.points || a.words.length - b.words.length) > 0
  const seeds = plan.seeded ? seedLayouts(pieces, plan.restarts) : []
  let best: LayoutResult | undefined
  for (let r = 0; r < plan.restarts; r++) {
    const start = seeds.length ? seeds[r % seeds.length] : undefined
    const iters = solver.start_layout(pieces, objective === 'points' ? 1 : 0, plan.iterations, (Math.random() * 2 ** 32) >>> 0, start)
    let done = 0
    while (done < iters) {
      done = solver.step_layout(2000)
      progress({ type: 'progress', id, phase: 'layout', done: r * plan.iterations + done, total })
    }
    const result = solver.best_layout() as LayoutResult
    if (better(result, best)) best = result
  }
  return best!
}

let queue: Promise<unknown> = Promise.resolve()

self.onmessage = (e: MessageEvent<Request>) => {
  const req = e.data
  // Serialize requests so a solve never runs against a half-built solver.
  queue = queue.then(async () => {
    try {
      switch (req.method) {
        case 'set_board_size':
          ;({ width, height } = req.data)
          solver?.set_board_size(width, height)
          return post({ type: 'result', id: req.id, data: null })
        case 'set_filter_data':
          try {
            await load(req.data)
          } catch (e) {
            if (!solver) post({ type: 'fatal', error: String((e as Error)?.message ?? e) })
            throw e
          }
          return post({ type: 'result', id: req.id, data: null })
        case 'check_words': {
          if (!solver) throw new Error('solver not ready')
          return post({ type: 'result', id: req.id, data: Array.from(solver.contains_all(req.data), Boolean) })
        }
        case 'best_layout':
          return post({ type: 'result', id: req.id, data: bestLayout(req.id, req.data.pieces, req.data.objective) })
        case 'solve':
          return post({ type: 'result', id: req.id, data: solve(req.id, req.data) })
      }
    } catch (err) {
      post({ type: 'error', id: req.id, error: String((err as Error)?.message ?? err) })
    }
  })
}
