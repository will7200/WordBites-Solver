/// <reference lib="webworker" />
import init, { JSSolution } from '../solver/pkg/solver.js'
import type { PieceInput, Request, Response } from './workerProtocol'

declare const self: DedicatedWorkerGlobalScope

const BASE = `${import.meta.env.BASE_URL}dict/`
const post = (msg: Response) => self.postMessage(msg)

let width = 8
let height = 9
let dictionary = ''
let solver: JSSolution | undefined
const wasmReady = init()
const index: Promise<Record<string, { words: number; bytes: number }>> = fetch(`${BASE}index.json`).then((r) => {
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

async function download(name: string): Promise<Uint8Array> {
  const hit = cache.get(name)
  if (hit) return hit
  const meta = (await index)[name]
  if (!meta) throw new Error(`unknown dictionary "${name}"`)
  const res = await fetch(`${BASE}${name}.txt`)
  if (!res.ok || !res.body) throw new Error(`failed to load dictionary "${name}": ${res.status}`)
  // Content-Length is the compressed size, so measure against the known uncompressed size.
  const progress = throttled()
  const out = new Uint8Array(meta.bytes)
  let done = 0
  const reader = res.body.getReader()
  for (;;) {
    const { done: end, value } = await reader.read()
    if (end) break
    if (done + value.length > out.length) throw new Error(`dictionary "${name}" is larger than expected`)
    out.set(value, done)
    done += value.length
    progress({ type: 'progress', phase: 'download', done, total: meta.bytes })
  }
  progress({ type: 'progress', phase: 'download', done, total: meta.bytes }, true)
  const bytes = out.subarray(0, done)
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
        case 'solve':
          return post({ type: 'result', id: req.id, data: solve(req.id, req.data) })
      }
    } catch (err) {
      post({ type: 'error', id: req.id, error: String((err as Error)?.message ?? err) })
    }
  })
}
