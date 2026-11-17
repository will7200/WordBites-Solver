import React from 'react'
import { useDrag, useDragLayer, useDrop } from 'react-dnd'
import { getEmptyImage } from 'react-dnd-html5-backend'
import { X } from 'lucide-react'
import ItemTypes, { DropResult } from '../board/ItemTypes'
import { canDropIntoCell, movePiece, pieceAt, removePiece } from './gridSlice'
import { useAppDispatch, useAppSelector } from '../../app/store'
import { GridDragLayer } from './GridDragLayer'
import { DragItem, snapCell } from './dragGeometry'
import { cn } from '@/lib/utils'
import { GAP } from './constants'

export { GAP } from './constants'

const BoardContext = React.createContext<{
  hovered?: string
  setHovered: (id?: string) => void
  glowing: Set<string>
  locked: boolean
  draggingId?: string
  pitch: number
}>({
  setHovered: () => {},
  glowing: new Set(),
  locked: false,
  pitch: 0,
})

function joinFor(piece: { cell: { x: number; y: number }; width: number; height: number }, x: number, y: number) {
  const j: string[] = []
  if (x > piece.cell.x) j.push('l')
  if (x < piece.cell.x + piece.width - 1) j.push('r')
  if (y > piece.cell.y) j.push('t')
  if (y < piece.cell.y + piece.height - 1) j.push('b')
  return j.join(' ')
}

function Cell({ x, y }: { x: number; y: number }) {
  const ref = React.useRef<HTMLDivElement>(null)
  const grid = useAppSelector((state) => state.grid)
  const dispatch = useAppDispatch()
  const { hovered, setHovered, glowing, locked, draggingId, pitch } = React.useContext(BoardContext)
  const value = grid.grid[y][x]
  const piece = value !== null ? pieceAt(grid, x, y) : undefined

  const [, drag, preview] = useDrag<DragItem | null, DropResult>(
    () => ({
      type: ItemTypes.MATRIX,
      // Remember which letter was grabbed so the piece moves relative to it.
      item: () => (piece ? { ...piece, srcCell: { dx: x - piece.cell.x, dy: y - piece.cell.y }, srcPitch: pitch } : null),
      canDrag: () => !!piece,
      end: (item, monitor) => {
        const target = monitor.getDropResult()
        if (target && item?.id) dispatch(movePiece({ id: item.id, toCell: target.cell }))
      },
    }),
    [piece, x, y, pitch],
  )
  React.useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true })
  }, [preview])
  drag(ref)

  const remove = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (piece && !locked) dispatch(removePiece({ id: piece.id }))
  }
  // The remove button sits on the piece's top-right cell.
  const isCorner = !locked && !!piece && x === piece.cell.x + piece.width - 1 && y === piece.cell.y
  const lifted = !!piece && piece.id === draggingId

  return (
    <div
      ref={ref}
      data-cell={`${y}-${x}`}
      className={cn(
        piece ? 'wb-tile' : 'wb-slot',
        'relative',
        piece && glowing.has(`${x},${y}`) && !lifted && 'wb-glow',
        lifted && 'wb-lifted',
      )}
      data-join={piece ? joinFor(piece, x, y) : undefined}
      title={piece ? (locked ? 'Drag to move' : 'Drag to move · double-click to remove') : undefined}
      onContextMenu={remove}
      onDoubleClick={remove}
      onMouseEnter={() => setHovered(piece?.id)}
      onMouseLeave={() => setHovered(undefined)}
    >
      {value ?? ''}
      {isCorner && !draggingId && (
        <button
          type="button"
          aria-label={`Remove ${piece!.matrix.flat().join('')}`}
          onClick={remove}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className={cn(
            'wb-remove absolute -top-2.5 -right-2.5 z-10 flex size-6 items-center justify-center rounded-full bg-red-600 text-white shadow-md ring-2 ring-background transition-opacity hover:bg-red-500',
            hovered === piece!.id ? 'opacity-100' : 'opacity-0',
          )}
        >
          <X className="size-3.5" strokeWidth={3} />
        </button>
      )}
    </div>
  )
}

/** Board that scales its cells to fit the containing element. */
export function GridDisplay({
  height,
  width,
  glowing = new Set(),
  locked = false,
  emptyHint = 'Your board is empty. Type pieces on the left and press Enter, or drag them here.',
}: {
  height: number
  width: number
  /** Cells ("x,y") to highlight as part of a valid word. */
  glowing?: Set<string>
  /** Practice mode: pieces can be moved but not removed. */
  locked?: boolean
  emptyHint?: string
}) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const boardRef = React.useRef<HTMLDivElement>(null)
  const [box, setBox] = React.useState({ w: 600, h: 600 })
  const [hovered, setHovered] = React.useState<string>()
  const grid = useAppSelector((s) => s.grid)
  const empty = grid.pieces.length === 0
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
  const pitch = size + GAP

  // Resolve the dragged item against the current board (moving pieces exclude their own cells).
  const target = React.useCallback(
    (item: DragItem, monitor: Parameters<typeof snapCell>[1]) => {
      const board = boardRef.current?.getBoundingClientRect()
      const cell = board && snapCell(item, monitor, board, pitch)
      if (!cell) return undefined
      const piece = item.id ? grid.pieces.find((p) => p.id === item.id) : item
      const ok = !!piece && cell.x >= 0 && cell.y >= 0 && canDropIntoCell(grid, piece, { cell })
      return { cell, ok, w: item.width, h: item.height }
    },
    [grid, pitch],
  )

  const [ghost, setGhost] = React.useState<{ cell: { x: number; y: number }; ok: boolean; w: number; h: number }>()
  const [{ isOver }, drop] = useDrop<DragItem, DropResult, { isOver: boolean }>(
    () => ({
      accept: ItemTypes.MATRIX,
      canDrop: (item, monitor) => !!target(item, monitor)?.ok,
      hover: (item, monitor) => {
        const t = target(item, monitor)
        setGhost((g) =>
          g && t && g.cell.x === t.cell.x && g.cell.y === t.cell.y && g.ok === t.ok && g.w === t.w && g.h === t.h ? g : t,
        )
      },
      drop: (item, monitor) => {
        const t = target(item, monitor)
        return t?.ok ? { name: 'board', cell: t.cell } : undefined
      },
      collect: (m) => ({ isOver: m.isOver() }),
    }),
    [target],
  )
  drop(boardRef)

  const { draggingId, isDragging } = useDragLayer((m) => ({
    draggingId: (m.getItem() as DragItem | null)?.id,
    isDragging: m.isDragging(),
  }))
  const showGhost = isDragging && isOver && ghost

  const ctx = React.useMemo(
    () => ({ hovered, setHovered, glowing, locked, draggingId: isDragging ? draggingId : undefined, pitch }),
    [hovered, glowing, locked, draggingId, isDragging, pitch],
  )

  return (
    <BoardContext.Provider value={ctx}>
      <div ref={containerRef} className="relative flex h-full min-h-0 w-full items-center justify-center">
        {empty && !isDragging && (
          <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center p-6 text-center">
            <p className="max-w-xs rounded-lg bg-background/80 px-4 py-3 text-sm text-muted-foreground backdrop-blur">
              {emptyHint}
            </p>
          </div>
        )}
        <div
          ref={boardRef}
          className="board relative grid"
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
            Array.from({ length: width }, (_, x) => <Cell x={x} y={y} key={`${y}-${x}`} />),
          )}
          {showGhost && (
            <div
              className={cn('wb-ghost', !ghost.ok && 'wb-ghost-bad')}
              style={{
                left: ghost.cell.x * pitch,
                top: ghost.cell.y * pitch,
                width: ghost.w * pitch - GAP,
                height: ghost.h * pitch - GAP,
              }}
            />
          )}
        </div>
      </div>
    </BoardContext.Provider>
  )
}
