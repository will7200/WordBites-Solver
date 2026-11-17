import React from 'react'
import type { Phase, PieceInput, Request, Response } from '../workerProtocol'

type Method = Request['method']
type DataOf<M extends Method> = Extract<Request, { method: M }>['data']

export interface Progress {
  phase: Phase
  done: number
  total: number
}

export interface WordSolverType {
  ready: boolean
  /** Dictionary download/build progress while not ready. */
  loading?: Progress
  wordCount?: number
  error?: string
  dictionary: string
  /** Returns a request id (usable with `terminate`) and the pending result. */
  solve: (pieces: PieceInput[], onProgress?: (p: Progress) => void) => [string, Promise<string[]>]
  setBoardSize: (width: number, height: number) => Promise<void>
  /** Dictionary lookup for each word. */
  checkWords: (words: string[]) => Promise<boolean[]>
  setDictionary: (name: string) => Promise<void>
  /** Kill the worker (aborting any in-flight solve) and start a fresh one. */
  terminate: () => void
}

export const WordSolverContext = React.createContext<WordSolverType | null>(null)

interface Pending {
  resolve: (v: any) => void
  reject: (e: Error) => void
  onProgress?: (p: Progress) => void
}

const createWorker = () => new Worker(new URL('../words.worker.ts', import.meta.url), { type: 'module' })

const savedDictionary = () => {
  try {
    return localStorage.getItem('wb-dictionary') ?? 'enable1'
  } catch {
    return 'enable1'
  }
}

/** Provides the solver worker. Keeps the worker's board size in sync with `width`/`height`. */
export default function WordSolver({ children, width, height }: { children: React.ReactNode; width: number; height: number }) {
  const workerRef = React.useRef<Worker | null>(null)
  const pending = React.useRef(new Map<string, Pending>())
  const board = React.useRef({ width, height })
  const [ready, setReady] = React.useState(false)
  const [error, setError] = React.useState<string>()
  const [dictionary, setDictionaryState] = React.useState(savedDictionary)
  const [loading, setLoading] = React.useState<Progress>()
  const [wordCount, setWordCount] = React.useState<number>()
  const dictionaryRef = React.useRef(dictionary)

  const rejectAll = (reason: string) => {
    pending.current.forEach((p) => p.reject(new Error(reason)))
    pending.current.clear()
  }

  const call = React.useCallback(<M extends Method>(
    method: M,
    data: DataOf<M>,
    id: string = crypto.randomUUID(),
    onProgress?: (p: Progress) => void,
  ) => {
    return new Promise<any>((resolve, reject) => {
      const worker = workerRef.current
      if (!worker) return reject(new Error('worker not started'))
      pending.current.set(id, { resolve, reject, onProgress })
      worker.postMessage({ id, method, data } as Request)
    })
  }, [])

  const start = React.useCallback(() => {
    const worker = createWorker()
    workerRef.current = worker
    setReady(false)
    worker.onmessage = (e: MessageEvent<Response>) => {
      const msg = e.data
      switch (msg.type) {
        case 'ready':
          setReady(true)
          setLoading(undefined)
          setWordCount(msg.words)
          setError(undefined)
          return
        case 'progress': {
          const p = { phase: msg.phase, done: msg.done, total: msg.total }
          if (msg.id) pending.current.get(msg.id)?.onProgress?.(p)
          else setLoading(p)
          return
        }
        case 'fatal':
          setLoading(undefined)
          setError(msg.error)
          return
        case 'result':
        case 'error': {
          const p = pending.current.get(msg.id)
          pending.current.delete(msg.id)
          if (msg.type === 'result') p?.resolve(msg.data)
          else p?.reject(new Error(msg.error))
        }
      }
    }
    // Restore non-default settings on a restarted worker; messages queue behind initial load.
    const { width, height } = board.current
    if (width !== 8 || height !== 9) worker.postMessage({ id: 'init-size', method: 'set_board_size', data: { width, height } })
    worker.postMessage({ id: 'init-dict', method: 'set_filter_data', data: dictionaryRef.current })
    return worker
  }, [])

  React.useEffect(() => {
    if (board.current.width === width && board.current.height === height) return
    board.current = { width, height }
    call('set_board_size', { width, height }).catch(() => {})
  }, [width, height, call])

  React.useEffect(() => {
    const worker = start()
    return () => {
      worker.terminate()
      rejectAll('worker terminated')
    }
  }, [start])

  const value = React.useMemo<WordSolverType>(
    () => ({
      ready,
      loading,
      wordCount,
      error,
      dictionary,
      solve: (pieces, onProgress) => {
        const id = crypto.randomUUID()
        return [id, call('solve', pieces, id, onProgress)]
      },
      checkWords: (words) => (words.length ? call('check_words', words) : Promise.resolve([])),
      setBoardSize: async (width, height) => {
        board.current = { width, height }
        await call('set_board_size', { width, height })
      },
      setDictionary: async (name) => {
        setReady(false)
        await call('set_filter_data', name).finally(() => setReady(true))
        dictionaryRef.current = name
        setDictionaryState(name)
        try {
          localStorage.setItem('wb-dictionary', name)
        } catch {
          /* ignore */
        }
      },
      terminate: () => {
        workerRef.current?.terminate()
        rejectAll('worker terminated')
        start()
      },
    }),
    [ready, loading, wordCount, error, dictionary, call, start],
  )

  return <WordSolverContext.Provider value={value}>{children}</WordSolverContext.Provider>
}

export const useWordSolver = (): WordSolverType => {
  const ctx = React.useContext(WordSolverContext)
  if (!ctx) throw new Error('useWordSolver must be used inside <WordSolver>')
  return ctx
}
