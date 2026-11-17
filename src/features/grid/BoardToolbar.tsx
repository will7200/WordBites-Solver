import React from 'react'
import { Check, Link, RotateCcw, Undo2 } from 'lucide-react'
import { encodeBoard } from '@/lib/boardCodec'
import { Button } from '@/components/ui/button'
import { useAppDispatch, useAppSelector } from '@/app/store'
import { clearBoard, GridPiece, restorePieces } from './gridSlice'

export function BoardToolbar() {
  const dispatch = useAppDispatch()
  const { pieces, width, height } = useAppSelector((s) => s.grid)
  const [undo, setUndo] = React.useState<GridPiece[]>()
  const [shared, setShared] = React.useState(false)
  const share = () => {
    const url = new URL(location.href)
    url.hash = `b=${encodeBoard({ width, height, pieces })}`
    navigator.clipboard?.writeText(url.toString()).catch(() => {})
    setShared(true)
    setTimeout(() => setShared(false), 1500)
  }

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
        <Button size="sm" variant="ghost" disabled={!pieces.length} onClick={share} title="Copy a link to this board">
          {shared ? <Check /> : <Link />} {shared ? 'Link copied' : 'Share'}
        </Button>
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
