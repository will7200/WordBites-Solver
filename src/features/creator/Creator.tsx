import React from 'react'
import { ArrowDown, ArrowRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Kbd } from '@/components/ui/kbd'
import { useAppDispatch, useAppSelector } from '@/app/store'
import { addPiece, findFreeCell, GridState } from '@/features/grid/gridSlice'
import { Orientation, parsePieces } from '@/lib/pieces'
import TilePreview from '@/features/grid/TilePreview'
import { TileDraggable } from './TileDraggable'
import type { MatrixDropValues } from '@/features/board/ItemTypes'

function tooBig(grid: GridState, p: MatrixDropValues) {
  return p.width > grid.width || p.height > grid.height
}

export function Creator() {
  const dispatch = useAppDispatch()
  const grid = useAppSelector((s) => s.grid)
  const [text, setText] = React.useState('')
  const [orientation, setOrientation] = React.useState<Orientation>('horizontal')
  const [message, setMessage] = React.useState<string>()

  const pieces = React.useMemo(() => parsePieces(text, orientation), [text, orientation])
  const tokens = React.useMemo(() => text.trim().split(/[\s,]+/).filter((t) => /[a-z]/i.test(t)), [text])
  const removeToken = (i: number) => setText(tokens.filter((_, j) => j !== i).join(' '))

  const placeAll = () => {
    // Place sequentially against a running copy of the grid so pieces don't collide.
    let state = grid
    const tooLong: string[] = []
    const noRoom: string[] = []
    for (const [i, p] of pieces.entries()) {
      if (tooBig(state, p)) {
        tooLong.push(tokens[i])
        continue
      }
      const cell = findFreeCell(state, p)
      if (!cell) {
        noRoom.push(tokens[i])
        continue
      }
      dispatch(addPiece({ ...p, cell }))
      const g = state.grid.map((r) => [...r])
      for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++) g[cell.y + y][cell.x + x] = p.matrix[y][x]
      state = { ...state, grid: g }
    }
    setText([...tooLong, ...noRoom].join(' '))
    const problems = [
      tooLong.length &&
        `${tooLong.map((t) => t.toUpperCase()).join(', ')} won't fit ${orientation === 'horizontal' ? `across the board (${state.width} wide)` : `down the board (${state.height} tall)`} (add spaces to split into letters)`,
      noRoom.length && `No free space for ${noRoom.map((t) => t.toUpperCase()).join(', ')}`,
    ].filter(Boolean)
    setMessage(problems.length ? problems.join('. ') : undefined)
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          placeAll()
        }}
      >
        <div className="flex gap-2">
          <Input
            autoFocus
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setMessage(undefined)
            }}
            placeholder="e.g.  r a c er ni"
            aria-label="Pieces to add"
            className="font-mono uppercase placeholder:normal-case"
          />
          <Button type="submit" disabled={pieces.length === 0}>
            <Plus /> Add
          </Button>
        </div>
        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>Multi-letter pieces</span>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={orientation}
            onValueChange={(v) => v && setOrientation(v as Orientation)}
          >
            <ToggleGroupItem value="horizontal" aria-label="Horizontal">
              <ArrowRight /> Across
            </ToggleGroupItem>
            <ToggleGroupItem value="vertical" aria-label="Vertical">
              <ArrowDown /> Down
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <p className="text-xs text-muted-foreground">
          Separate pieces with spaces, then press <Kbd>Enter</Kbd> to drop them on the board, or drag one below onto
          a spot.
        </p>
        {message && <p className="text-sm text-destructive">{message}</p>}
      </form>

      {pieces.length > 0 && (
        <div className="flex min-h-14 flex-wrap items-start gap-3 rounded-lg border border-dashed p-3">
          {pieces.map((p, i) => (
            <TileDraggable key={`${i}-${tokens[i]}-${orientation}`} value={p} onDrop={() => removeToken(i)}>
              <TilePreview {...p} size={36} />
            </TileDraggable>
          ))}
        </div>
      )}
    </div>
  )
}
