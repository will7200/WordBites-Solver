import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TooltipProvider } from '@/components/ui/tooltip'
import WordSolver from '@/components/WordSolver'
import { Creator } from '@/features/creator/Creator'
import { GridDisplay } from '@/features/grid/GridDisplay'
import { BoardToolbar } from '@/features/grid/BoardToolbar'
import { Header } from '@/features/header/Header'
import { WordDisplay } from '@/features/wordlist/WordDisplay'
import { useAppSelector } from './store'

export default function App() {
  const { width, height, pieces } = useAppSelector((state) => state.grid)
  const solverPieces = React.useMemo(
    () =>
      pieces.map((x) => ({
        letters: x.matrix.flat().join('').toLowerCase(),
        height: x.height,
        width: x.width,
      })),
    [pieces],
  )

  return (
    <WordSolver>
      <TooltipProvider delayDuration={300}>
        <div className="flex min-h-svh flex-col lg:h-svh">
          <Header />
          <main className="mx-auto grid w-full max-w-[1600px] flex-1 gap-4 p-4 lg:min-h-0 lg:grid-cols-[320px_minmax(0,1fr)_380px]">
            <Card className="lg:min-h-0">
              <CardHeader>
                <CardTitle>Add pieces</CardTitle>
                <CardDescription>Type the pieces from your game.</CardDescription>
              </CardHeader>
              <CardContent>
                <Creator />
              </CardContent>
            </Card>

            <Card className="lg:min-h-0">
              <CardContent className="flex h-full min-h-0 flex-col gap-3">
                <BoardToolbar />
                <div
                  className="aspect-(--board-ratio) min-h-0 lg:aspect-auto lg:flex-1"
                  style={{ '--board-ratio': `${width} / ${height}` } as React.CSSProperties}
                >
                  <GridDisplay width={width} height={height} />
                </div>
                <p className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-center text-xs text-muted-foreground">
                  <span>
                    <b className="font-medium text-foreground">Drag</b> a piece to move it
                  </span>
                  <span>
                    <b className="font-medium text-foreground">×</b> or <b className="font-medium text-foreground">double-click</b> to remove
                  </span>
                </p>
              </CardContent>
            </Card>

            <Card className="h-[70vh] lg:h-auto lg:min-h-0">
              <CardContent className="h-full min-h-0">
                <WordDisplay pieces={solverPieces} />
              </CardContent>
            </Card>
          </main>
        </div>
      </TooltipProvider>
    </WordSolver>
  )
}
