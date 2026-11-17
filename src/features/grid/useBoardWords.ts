import React from 'react'
import { useAppSelector } from '@/app/store'
import { useWordSolver } from '@/components/WordSolver'
import { boardRuns } from '@/lib/arrange'
import { pieceAt } from './gridSlice'

/**
 * Dictionary words currently spelled on the board, and their cells ("x,y"). A run counts if it
 * has 3+ letters and combines at least two pieces.
 */
export function useBoardWords() {
  const state = useAppSelector((s) => s.grid)
  const grid = state.grid
  const solver = useWordSolver()
  const [result, setResult] = React.useState<{ words: string[]; glowing: Set<string> }>({ words: [], glowing: new Set() })
  React.useEffect(() => {
    if (!solver.ready) return
    const runs = boardRuns(grid).filter(
      (r) => r.word.length >= 3 && new Set(r.cells.map((c) => pieceAt(state, c.x, c.y)?.id)).size >= 2,
    )
    let live = true
    solver
      .checkWords(runs.map((r) => r.word))
      .then((ok) => {
        if (!live) return
        const valid = runs.filter((_, i) => ok[i])
        setResult({
          words: valid.map((r) => r.word.toLowerCase()),
          glowing: new Set(valid.flatMap((r) => r.cells.map((c) => `${c.x},${c.y}`))),
        })
      })
      .catch(() => {})
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid, solver.ready, solver.dictionary])
  return result
}
