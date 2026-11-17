/// <reference lib="webworker" />
import init, { JSSolution } from '../solver/pkg/solver.js'
import type { Request, Response, SolvedWord } from './workerProtocol'

declare const self: DedicatedWorkerGlobalScope

let width = 8
let height = 9
let filterData: string | undefined
let solver: JSSolution | undefined
const wasmReady = init()

const post = (msg: Response) => self.postMessage(msg)

async function loadFilter(name: string) {
  const res = await fetch(`${import.meta.env.BASE_URL}bloomfilter_${name}.dat`)
  if (!res.ok) throw new Error(`failed to load dictionary "${name}": ${res.status}`)
  filterData = await res.text()
}

async function rebuild() {
  await wasmReady
  if (filterData === undefined) throw new Error('no dictionary loaded')
  solver?.free()
  solver = new JSSolution(width, height, 1, filterData)
}

let queue: Promise<unknown> = loadFilter('alot').then(rebuild).then(
  () => post({ type: 'ready' }),
  (e) => post({ type: 'fatal', error: String(e?.message ?? e) }),
)

self.onmessage = (e: MessageEvent<Request>) => {
  const req = e.data
  // Serialize requests so a solve never runs against a half-built solver.
  queue = queue.then(async () => {
    try {
      switch (req.method) {
        case 'set_board_size':
          ;({ width, height } = req.data)
          await rebuild()
          return post({ type: 'result', id: req.id, data: null })
        case 'set_filter_data':
          await loadFilter(req.data)
          await rebuild()
          return post({ type: 'result', id: req.id, data: null })
        case 'check_words': {
          if (!solver) throw new Error('solver not ready')
          const data = Array.from(solver.contains_all(req.data), Boolean)
          return post({ type: 'result', id: req.id, data })
        }
        case 'solve': {
          if (!solver) throw new Error('solver not ready')
          const data = solver.solve(req.data) as SolvedWord[]
          return post({ type: 'result', id: req.id, data })
        }
      }
    } catch (err) {
      post({ type: 'error', id: req.id, error: String((err as Error)?.message ?? err) })
    }
  })
}
