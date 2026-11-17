import React from 'react'
import { useDrag } from 'react-dnd'
import { getEmptyImage } from 'react-dnd-html5-backend'
import ItemTypes, { DropResult, MatrixDropValues } from '../board/ItemTypes'
import type { DragItem } from '../grid/dragGeometry'
import { GAP } from '../grid/constants'
import { useAppDispatch } from '../../app/store'
import { addPiece } from '../grid/gridSlice'

interface Props {
  className?: string
  value: MatrixDropValues
  /** Rendered tile size of the tray piece, in px. */
  tileSize: number
  onDrop?: () => void
  children: React.ReactNode
}

/** Wraps a not-yet-placed piece so it can be dragged onto the board. */
export function TileDraggable({ children, className, value, onDrop, tileSize }: Props) {
  const dispatch = useAppDispatch()
  const [{ isDragging }, drag, preview] = useDrag<DragItem, DropResult, { isDragging: boolean }>(
    () => ({
      type: ItemTypes.MATRIX,
      item: () => ({ ...value, matrix: value.matrix.map((r) => [...r]), srcCell: { dx: 0, dy: 0 }, srcPitch: tileSize + GAP }),
      end: (item, monitor) => {
        const target = monitor.getDropResult()
        if (target && item) {
          dispatch(addPiece({ height: item.height, width: item.width, matrix: item.matrix, cell: target.cell }))
          onDrop?.()
        }
      },
      collect: (m) => ({ isDragging: m.isDragging() }),
    }),
    [value, onDrop, tileSize],
  )
  React.useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true })
  }, [preview])
  return (
    <div
      className={className}
      ref={(node) => {
        drag(node)
      }}
      style={{ opacity: isDragging ? 0.25 : 1, touchAction: 'none' }}
    >
      {children}
    </div>
  )
}
