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

export function TileDraggable({ children, className, value, onDrop }: Props) {
  const dispatch = useAppDispatch()
  const [{ isDragging }, drag, preview] = useDrag<MatrixDropValues, DropResult, { isDragging: boolean }>(
    () => ({
      type: ItemTypes.MATRIX,
      // Snapshot the matrix so later edits don't mutate the in-flight item.
      item: () => ({ ...value, matrix: value.matrix.map((r) => [...r]) }),
      end: (item, monitor) => {
        const dropTarget = monitor.getDropResult()
        if (dropTarget && item) {
          dispatch(addPiece({ height: item.height, width: item.width, matrix: item.matrix, cell: dropTarget.cell }))
          onDrop?.()
        }
      },
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
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
      style={{ cursor: 'move', opacity: isDragging ? 0.5 : 1 }}
    >
      {children}
    </div>
  )
}
