import React from 'react'
import type { PieceInput, Request, Response, SolvedWord } from '../workerProtocol'

type Method = Request['method']
type DataOf<M extends Method> = Extract<Request, { method: M }>['data']

export interface WordSolverType {
  ready: boolean
  error?: string
  dictionary: string
  /** Returns a request id (usable with `terminate`) and the pending result. */
  solve: (pieces: PieceInput[]) => [string, Promise<SolvedWord[]>]
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
}

const createWorker = () => new Worker(new URL('../words.worker.ts', import.meta.url), { type: 'module' })

export default function WordSolver({ children }: { children: React.ReactNode }) {
  const workerRef = React.useRef<Worker | null>(null)
  const pending = React.useRef(new Map<string, Pending>())
  const board = React.useRef({ width: 8, height: 9 })
  const [ready, setReady] = React.useState(false)
  const [error, setError] = React.useState<string>()
  const [dictionary, setDictionaryState] = React.useState('alot')
  const dictionaryRef = React.useRef(dictionary)

  const rejectAll = (reason: string) => {
    pending.current.forEach((p) => p.reject(new Error(reason)))
    pending.current.clear()
  }

  const call = React.useCallback(<M extends Method>(method: M, data: DataOf<M>, id: string = crypto.randomUUID()) => {
    return new Promise<any>((resolve, reject) => {
      const worker = workerRef.current
      if (!worker) return reject(new Error('worker not started'))
      pending.current.set(id, { resolve, reject })
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
          setError(undefined)
          return
        case 'fatal':
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
    if (dictionaryRef.current !== 'alot')
      worker.postMessage({ id: 'init-dict', method: 'set_filter_data', data: dictionaryRef.current })
    return worker
  }, [])

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
      error,
      dictionary,
      solve: (pieces) => {
        const id = crypto.randomUUID()
        return [id, call('solve', pieces, id)]
      },
      checkWords: (words) => (words.length ? call('check_words', words) : Promise.resolve([])),
      setBoardSize: async (width, height) => {
        board.current = { width, height }
        await call('set_board_size', { width, height })
      },
      setDictionary: async (name) => {
        await call('set_filter_data', name)
        dictionaryRef.current = name
        setDictionaryState(name)
      },
      terminate: () => {
        workerRef.current?.terminate()
        rejectAll('worker terminated')
        start()
      },
    }),
    [ready, error, dictionary, call, start],
  )

  return <WordSolverContext.Provider value={value}>{children}</WordSolverContext.Provider>
}

export const useWordSolver = (): WordSolverType => {
  const ctx = React.useContext(WordSolverContext)
  if (!ctx) throw new Error('useWordSolver must be used inside <WordSolver>')
  return ctx
}
