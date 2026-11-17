import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TooltipProvider } from '@/components/ui/tooltip'
import WordSolver from '@/components/WordSolver'
import { Creator } from '@/features/creator/Creator'
import { GridDisplay } from '@/features/grid/GridDisplay'
import { BoardToolbar } from '@/features/grid/BoardToolbar'
import { boardFromSaved, GridState, restorePieces, setGridSize } from '@/features/grid/gridSlice'
import { useBoardWords } from '@/features/grid/useBoardWords'
import { Header, Mode } from '@/features/header/Header'
import { PracticePanel } from '@/features/practice/PracticePanel'
import { usePractice } from '@/features/practice/usePractice'
import { WordDisplay } from '@/features/wordlist/WordDisplay'
import { PRACTICE_HEIGHT, PRACTICE_WIDTH } from '@/lib/practice'
import { setBoardPersistence, useAppDispatch, useAppSelector } from './store'

export default function App() {
  const { width, height } = useAppSelector((state) => state.grid)
  return (
    <WordSolver width={width} height={height}>
      <TooltipProvider delayDuration={300}>
        <Workspace />
      </TooltipProvider>
    </WordSolver>
  )
}

function Workspace() {
  const dispatch = useAppDispatch()
  const grid = useAppSelector((state) => state.grid)
  const { width, height, pieces } = grid
  const [mode, setModeState] = React.useState<Mode>('solve')
  const solverBoard = React.useRef<GridState>(undefined)
  const boardWords = useBoardWords()
  const game = usePractice(boardWords.words)

  /** `keepBoard`: leave practice with the practice board instead of restoring the solver board. */
  const setMode = (next: Mode, { keepBoard = false } = {}) => {
    if (next === mode) return
    if (next === 'practice') {
      // Keep the solver board aside and switch to the standard game board.
      solverBoard.current = grid
      setBoardPersistence(false)
      game.reset()
      dispatch(setGridSize({ width: PRACTICE_WIDTH, height: PRACTICE_HEIGHT }))
    } else {
      game.end()
      const saved = solverBoard.current
      if (saved && !keepBoard) {
        dispatch(setGridSize({ width: saved.width, height: saved.height }))
        dispatch(restorePieces(boardFromSaved(saved).pieces))
      }
      setBoardPersistence(true)
    }
    setModeState(next)
  }

  // Positions don't affect which words exist, so only re-solve when the set of pieces changes.
  const piecesKey = pieces.map((x) => `${x.matrix.flat().join('')}:${x.width}x${x.height}`).sort().join(' ')
  const solverPieces = React.useMemo(
    () =>
      pieces.map((x) => ({
        letters: x.matrix.flat().join('').toLowerCase(),
        height: x.height,
        width: x.width,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [piecesKey],
  )
  const practice = mode === 'practice'
  const foundSet = React.useMemo(() => new Set(game.found.map((f) => f.word)), [game.found])

  return (
    <div className="flex min-h-svh flex-col lg:h-svh">
      <Header mode={mode} onModeChange={setMode} />
      <main className="mx-auto grid w-full max-w-[1600px] flex-1 gap-4 p-4 lg:min-h-0 lg:grid-cols-[320px_minmax(0,1fr)_380px]">
        <Card className="lg:min-h-0 lg:overflow-y-auto">
          <CardHeader>
            <CardTitle>{practice ? 'Practice' : 'Add pieces'}</CardTitle>
            <CardDescription>
              {practice ? 'A timed round on a random board.' : 'Type the pieces from your game.'}
            </CardDescription>
          </CardHeader>
          <CardContent>{practice ? <PracticePanel game={game} onOpenInSolver={() => setMode('solve', { keepBoard: true })} /> : <Creator />}</CardContent>
        </Card>

        <Card className="lg:min-h-0">
          <CardContent className="flex h-full min-h-0 flex-col gap-3">
            {!practice && <BoardToolbar />}
            <div
              className="aspect-(--board-ratio) min-h-0 lg:aspect-auto lg:flex-1"
              style={{ '--board-ratio': `${width} / ${height}` } as React.CSSProperties}
            >
              <GridDisplay
                width={width}
                height={height}
                glowing={boardWords.glowing}
                locked={practice}
                emptyHint={practice ? 'Press Start round to deal a board.' : undefined}
              />
            </div>
            <p className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-center text-xs text-muted-foreground">
              <span>
                <b className="font-medium text-foreground">Drag</b> a piece to move it
              </span>
              {practice ? (
                <span>
                  Words <b className="font-medium text-foreground">glow</b> and score when you spell them
                </span>
              ) : (
                <span>
                  <b className="font-medium text-foreground">×</b> or{' '}
                  <b className="font-medium text-foreground">double-click</b> to remove
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="h-[70vh] lg:h-auto lg:min-h-0">
          <CardContent className="h-full min-h-0">
            <WordDisplay
              pieces={solverPieces}
              hidden={
                practice && game.status !== 'done'
                  ? game.status === 'running'
                    ? 'Words are hidden until the round ends.'
                    : 'Start a round to play.'
                  : undefined
              }
              playedWords={practice ? foundSet : undefined}
              boardWords={boardWords.words}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
