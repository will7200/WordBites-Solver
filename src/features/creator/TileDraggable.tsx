import React from 'react'
import { useDrag } from 'react-dnd'
import { getEmptyImage } from 'react-dnd-html5-backend'
import ItemTypes, { DropResult, MatrixDropValues } from '../board/ItemTypes'
import { useAppDispatch } from '../../app/store'
import { addPiece } from '../grid/gridSlice'

interface Props {
  className?: string
  value: MatrixDropValues
  onDrop?: () => void
  children: React.ReactNode
}

/** Wraps a not-yet-placed piece so it can be dragged onto the board. */
export function TileDraggable({ children, className, value, onDrop }: Props) {
  const dispatch = useAppDispatch()
  const [{ isDragging }, drag, preview] = useDrag<MatrixDropValues, DropResult, { isDragging: boolean }>(
    () => ({
      type: ItemTypes.MATRIX,
      item: () => ({ ...value, matrix: value.matrix.map((r) => [...r]) }),
      end: (item, monitor) => {
        const target = monitor.getDropResult()
        if (target && item) {
          dispatch(addPiece({ height: item.height, width: item.width, matrix: item.matrix, cell: target.cell }))
          onDrop?.()
        }
      },
      collect: (m) => ({ isDragging: m.isDragging() }),
    }),
    [value, onDrop],
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
      style={{ opacity: isDragging ? 0.4 : 1 }}
    >
      {children}
    </div>
  )
}
