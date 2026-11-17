import React from 'react'
import { useAppDispatch, useAppSelector } from '@/app/store'
import { boardFromSaved, restorePieces, setGridSize } from '@/features/grid/gridSlice'
import { mulberry32, PRACTICE_HEIGHT, PRACTICE_WIDTH, randomPieces, ROUND_SECONDS, scatter } from '@/lib/practice'
import { wordPoints } from '@/lib/scoring'
import { useWordSolver } from '@/components/WordSolver'

export type RoundStatus = 'idle' | 'generating' | 'running' | 'done'

export interface FoundWord {
  word: string
  points: number
  at: number
}

const MIN_WORDS_ON_BOARD = 60

/** Practice round state machine: generate a board, run the clock, score words as they're formed. */
export function usePractice(boardWords: string[], seconds = ROUND_SECONDS) {
  const dispatch = useAppDispatch()
  const solver = useWordSolver()
  const pieces = useAppSelector((s) => s.grid.pieces)
  const [status, setStatus] = React.useState<RoundStatus>('idle')
  const [found, setFound] = React.useState<FoundWord[]>([])
  const [endsAt, setEndsAt] = React.useState<number>()
  const [now, setNow] = React.useState(() => Date.now())
  const [error, setError] = React.useState<string>()
  const [possible, setPossible] = React.useState<string[]>([])

  const start = React.useCallback(async () => {
    setStatus('generating')
    setError(undefined)
    setFound([])
    // Try a few random boards and keep the first with enough words to be fun.
    let best: { placed: ReturnType<typeof scatter>; words: string[] } | undefined
    for (let i = 0; i < 6; i++) {
      const rng = mulberry32((Math.random() * 2 ** 32) >>> 0)
      const placed = scatter(randomPieces(rng), PRACTICE_WIDTH, PRACTICE_HEIGHT, rng)
      if (!placed) continue
      const input = placed.map((p) => ({ letters: p.matrix.flat().join('').toLowerCase(), width: p.width, height: p.height }))
      try {
        const [, result] = solver.solve(input)
        const words = await result
        if (!best || words.length > best.words.length) best = { placed, words }
        if (words.length >= MIN_WORDS_ON_BOARD) break
      } catch (e) {
        setError(String((e as Error).message ?? e))
        setStatus('idle')
        return
      }
    }
    if (!best?.placed) {
      setError("Couldn't generate a board. Try again.")
      setStatus('idle')
      return
    }
    dispatch(setGridSize({ width: PRACTICE_WIDTH, height: PRACTICE_HEIGHT }))
    const state = boardFromSaved({ width: PRACTICE_WIDTH, height: PRACTICE_HEIGHT, pieces: best.placed })
    dispatch(restorePieces(state.pieces))
    setPossible(best.words)
    const t = Date.now()
    setNow(t)
    setEndsAt(t + seconds * 1000)
    setStatus('running')
  }, [dispatch, solver, seconds])

  const reset = React.useCallback(() => {
    setStatus('idle')
    setFound([])
    setPossible([])
    setEndsAt(undefined)
  }, [])

  const end = React.useCallback(() => setStatus((s) => (s === 'running' ? 'done' : s)), [])

  // Clock.
  React.useEffect(() => {
    if (status !== 'running' || !endsAt) return
    const id = setInterval(() => {
      const t = Date.now()
      setNow(t)
      if (t >= endsAt) setStatus('done')
    }, 200)
    return () => clearInterval(id)
  }, [status, endsAt])

  // Score each word the first time it appears on the board.
  React.useEffect(() => {
    if (status !== 'running') return
    setFound((prev) => {
      const have = new Set(prev.map((f) => f.word))
      const fresh = boardWords.filter((w) => !have.has(w))
      if (!fresh.length) return prev
      const t = Date.now()
      return [...prev, ...[...new Set(fresh)].map((word) => ({ word, points: wordPoints(word), at: t }))]
    })
  }, [boardWords, status])

  const remaining = status === 'running' && endsAt ? Math.max(0, endsAt - now) : status === 'done' ? 0 : seconds * 1000
  const score = found.reduce((a, f) => a + f.points, 0)

  return { status, start, end, reset, found, score, remaining, seconds, possible, error, hasBoard: pieces.length > 0 }
}
