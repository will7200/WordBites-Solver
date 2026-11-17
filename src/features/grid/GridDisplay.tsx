import React from 'react'
import clsx from 'clsx'
import { useDrag, useDrop } from 'react-dnd'
import { getEmptyImage } from 'react-dnd-html5-backend'
import './GridDisplay.scss'
import ItemTypes, { DropResult, MatrixDropValues } from '../board/ItemTypes'
import { canDropIntoCell, movePiece, pieceAt, removePiece } from './gridSlice'
import { useAppDispatch, useAppSelector } from '../../app/store'
import { Overlay } from '../../components/Overlay'
import { GridDragLayer } from './GridDragLayer'

interface GridDisplayProps {
  height: number
  width: number
  size: number
}

export interface CellProps {
  x: number
  y: number
}

function Tile({ x, y }: CellProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const grid = useAppSelector((state) => state.grid)
  const dispatch = useAppDispatch()
  const value = grid.grid[y][x]
  const modNumberClass = React.useMemo(() => ((x + 1) * (y + 1) + Math.floor(Math.random() * 5)) % 5, [x, y])

  const [{ isOver, canDrop, item }, drop] = useDrop<
    MatrixDropValues,
    DropResult,
    { isOver: boolean; canDrop: boolean; item: MatrixDropValues | null }
  >(
    () => ({
      accept: ItemTypes.MATRIX,
      canDrop: (item) => {
        const piece = item.id ? grid.pieces.find((p) => p.id === item.id) : item
        return !!piece && canDropIntoCell(grid, piece, { cell: { x, y } })
      },
      drop: () => ({ name: 'grid-cell', cell: { x, y } }),
      collect: (monitor) => ({ isOver: monitor.isOver(), canDrop: monitor.canDrop(), item: monitor.getItem() }),
    }),
    [grid, x, y],
  )

  const [, drag, preview] = useDrag<MatrixDropValues | null, DropResult>(
    () => ({
      type: ItemTypes.MATRIX,
      item: () => {
        const piece = pieceAt(grid, x, y)
        return piece ? { ...piece, child: piece.cell.x !== x || piece.cell.y !== y } : null
      },
      canDrag: () => value !== null,
      end: (item, monitor) => {
        const dropTarget = monitor.getDropResult()
        if (dropTarget && item?.id) {
          dispatch(movePiece({ id: item.id, toCell: dropTarget.cell }))
        }
      },
    }),
    [grid, x, y, value],
  )

  React.useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true })
  }, [preview])
  drag(drop(ref))

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault()
    const piece = pieceAt(grid, x, y)
    if (piece) dispatch(removePiece({ id: piece.id }))
  }

  const dims = item ? (item.id ? grid.pieces.find((p) => p.id === item.id) : item) : undefined
  return (
    <div
      className={clsx(value ? 'tile' : 'empty-tile')}
      data-cell={`${y}-${x}`}
      data-x={x}
      data-y={y}
      data-mod={modNumberClass}
      ref={ref}
      onContextMenu={handleRightClick}
    >
      {value ?? ''}
      {canDrop && isOver && dims && <Overlay color="darkgreen" width={dims.width} height={dims.height} />}
    </div>
  )
}

export function GridDisplay({ height, width, size }: GridDisplayProps) {
  return (
    <div
      className={clsx('board')}
      style={{
        gridTemplateColumns: `repeat(${width}, ${size}px)`,
        gridTemplateRows: `repeat(${height}, ${size}px)`,
      }}
    >
      <GridDragLayer width={size} />
      {Array.from({ length: height }, (_, y) =>
        Array.from({ length: width }, (_, x) => <Tile x={x} y={y} key={`${y}-${x}`} />),
      )}
    </div>
  )
}
