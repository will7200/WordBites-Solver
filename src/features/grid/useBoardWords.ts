import React from 'react'
import { useAppSelector } from '@/app/store'
import { useWordSolver } from '@/components/WordSolver'
import { boardRuns } from '@/lib/arrange'

/** Dictionary words currently spelled on the board (runs of 3+ letters), and their cells ("x,y"). */
export function useBoardWords() {
  const grid = useAppSelector((s) => s.grid.grid)
  const solver = useWordSolver()
  const [state, setState] = React.useState<{ words: string[]; glowing: Set<string> }>({ words: [], glowing: new Set() })
  React.useEffect(() => {
    if (!solver.ready) return
    const runs = boardRuns(grid).filter((r) => r.word.length >= 3)
    let live = true
    solver
      .checkWords(runs.map((r) => r.word))
      .then((ok) => {
        if (!live) return
        const valid = runs.filter((_, i) => ok[i])
        setState({
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
  return state
}
