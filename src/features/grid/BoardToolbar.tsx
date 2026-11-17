import React from 'react'
import { RotateCcw, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppDispatch, useAppSelector } from '@/app/store'
import { clearBoard, GridPiece, restorePieces } from './gridSlice'

export function BoardToolbar() {
  const dispatch = useAppDispatch()
  const { pieces, width, height } = useAppSelector((s) => s.grid)
  const [undo, setUndo] = React.useState<GridPiece[]>()

  // Offer undo for a few seconds after a reset, or until the board changes.
  React.useEffect(() => {
    if (!undo) return
    const t = setTimeout(() => setUndo(undefined), 8000)
    return () => clearTimeout(t)
  }, [undo])
  React.useEffect(() => {
    if (pieces.length) setUndo(undefined)
  }, [pieces.length])

  return (
    <div className="flex items-center gap-2">
      <h2 className="text-base font-semibold">Board</h2>
      <span className="text-sm text-muted-foreground tabular-nums">
        {width}×{height} · {pieces.length} {pieces.length === 1 ? 'piece' : 'pieces'}
      </span>
      <div className="ml-auto flex items-center gap-2">
        {undo ? (
          <>
            <span className="text-sm text-muted-foreground">Board cleared</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                dispatch(restorePieces(undo))
                setUndo(undefined)
              }}
            >
              <Undo2 /> Undo
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled={!pieces.length}
            onClick={() => {
              setUndo(pieces)
              dispatch(clearBoard())
            }}
          >
            <RotateCcw /> Reset board
          </Button>
        )}
      </div>
    </div>
  )
}
