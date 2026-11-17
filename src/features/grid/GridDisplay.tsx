import React from 'react'
import { useDrag, useDrop } from 'react-dnd'
import { getEmptyImage } from 'react-dnd-html5-backend'
import ItemTypes, { DropResult, MatrixDropValues } from '../board/ItemTypes'
import { canDropIntoCell, movePiece, pieceAt, removePiece } from './gridSlice'
import { useAppDispatch, useAppSelector } from '../../app/store'
import { GridDragLayer } from './GridDragLayer'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

const HoverContext = React.createContext<{ hovered?: string; setHovered: (id?: string) => void }>({
  setHovered: () => {},
})

export { GAP } from './constants'
import { GAP } from './constants'

function joinFor(piece: { cell: { x: number; y: number }; width: number; height: number }, x: number, y: number) {
  const j: string[] = []
  if (x > piece.cell.x) j.push('l')
  if (x < piece.cell.x + piece.width - 1) j.push('r')
  if (y > piece.cell.y) j.push('t')
  if (y < piece.cell.y + piece.height - 1) j.push('b')
  return j.join(' ')
}

function Cell({ x, y, size }: { x: number; y: number; size: number }) {
  const ref = React.useRef<HTMLDivElement>(null)
  const grid = useAppSelector((state) => state.grid)
  const dispatch = useAppDispatch()
  const value = grid.grid[y][x]
  const piece = value !== null ? pieceAt(grid, x, y) : undefined

  const [{ isOver, canDrop, item }, drop] = useDrop<
    MatrixDropValues,
    DropResult,
    { isOver: boolean; canDrop: boolean; item: MatrixDropValues | null }
  >(
    () => ({
      accept: ItemTypes.MATRIX,
      canDrop: (item) => {
        const p = item.id ? grid.pieces.find((p) => p.id === item.id) : item
        return !!p && canDropIntoCell(grid, p, { cell: { x, y } })
      },
      drop: () => ({ name: 'grid-cell', cell: { x, y } }),
      collect: (m) => ({ isOver: m.isOver(), canDrop: m.canDrop(), item: m.getItem() }),
    }),
    [grid, x, y],
  )

  const [, drag, preview] = useDrag<MatrixDropValues | null, DropResult>(
    () => ({
      type: ItemTypes.MATRIX,
      item: () => (piece ? { ...piece } : null),
      canDrag: () => !!piece,
      end: (item, monitor) => {
        const target = monitor.getDropResult()
        if (target && item?.id) dispatch(movePiece({ id: item.id, toCell: target.cell }))
      },
    }),
    [piece],
  )
  React.useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true })
  }, [preview])
  drag(drop(ref))

  const { hovered, setHovered } = React.useContext(HoverContext)
  const remove = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (piece) dispatch(removePiece({ id: piece.id }))
  }
  // The remove button sits on the piece's top-right cell.
  const isCorner = !!piece && x === piece.cell.x + piece.width - 1 && y === piece.cell.y

  const dims = item ? (item.id ? grid.pieces.find((p) => p.id === item.id) : item) : undefined
  return (
    <div
      ref={ref}
      data-cell={`${y}-${x}`}
      className={cn(piece ? 'wb-tile' : 'wb-slot', 'relative')}
      data-join={piece ? joinFor(piece, x, y) : undefined}
      title={piece ? 'Drag to move · double-click to remove' : undefined}
      onContextMenu={remove}
      onDoubleClick={remove}
      onMouseEnter={() => setHovered(piece?.id)}
      onMouseLeave={() => setHovered(undefined)}
    >
      {value ?? ''}
      {isCorner && (
        <button
          type="button"
          aria-label={`Remove ${piece!.matrix.flat().join('')}`}
          onClick={remove}
          onMouseDown={(e) => e.stopPropagation()}
          className={cn(
            'wb-remove absolute -top-2.5 -right-2.5 z-10 flex size-6 items-center justify-center rounded-full bg-red-600 text-white shadow-md ring-2 ring-background transition-opacity hover:bg-red-500',
            hovered === piece!.id ? 'opacity-100' : 'opacity-0',
          )}
        >
          <X className="size-3.5" strokeWidth={3} />
        </button>
      )}
      {canDrop && isOver && dims && (
        <div
          className="wb-drop"
          style={{
            width: dims.width * size + (dims.width - 1) * GAP,
            height: dims.height * size + (dims.height - 1) * GAP,
            inset: 'auto',
            top: 0,
            left: 0,
          }}
        />
      )}
    </div>
  )
}

/** Board that scales its cells to fit the containing element. */
export function GridDisplay({ height, width }: { height: number; width: number }) {
  const [hovered, setHovered] = React.useState<string>()
  const hover = React.useMemo(() => ({ hovered, setHovered }), [hovered])
  const empty = useAppSelector((s) => s.grid.pieces.length === 0)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [box, setBox] = React.useState({ w: 600, h: 600 })
  React.useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const size = Math.max(
    24,
    Math.floor(Math.min((box.w - GAP * (width - 1)) / width, (box.h - GAP * (height - 1)) / height, 72)),
  )

  return (
    <HoverContext.Provider value={hover}>
    <div ref={containerRef} className="relative flex h-full min-h-0 w-full items-center justify-center">
      {empty && (
        <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center p-6 text-center">
          <p className="max-w-xs rounded-lg bg-background/80 px-4 py-3 text-sm text-muted-foreground backdrop-blur">
            Your board is empty. Type pieces on the left and press Enter, or drag them here.
          </p>
        </div>
      )}
      <div
        className="board grid"
        style={
          {
            '--cell': `${size}px`,
            '--gap': `${GAP}px`,
            gap: GAP,
            gridTemplateColumns: `repeat(${width}, ${size}px)`,
            gridTemplateRows: `repeat(${height}, ${size}px)`,
          } as React.CSSProperties
        }
      >
        <GridDragLayer size={size} />
        {Array.from({ length: height }, (_, y) =>
          Array.from({ length: width }, (_, x) => <Cell x={x} y={y} size={size} key={`${y}-${x}`} />),
        )}
      </div>
    </div>
    </HoverContext.Provider>
  )
}
