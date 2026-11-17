import React from 'react'
import { useDragLayer, XYCoord } from 'react-dnd'
import ItemTypes, { MatrixDropValues } from '../board/ItemTypes'
import TilePreview from './TilePreview'
import { useAppSelector } from '../../app/store'

const layerStyles: React.CSSProperties = {
  position: 'fixed',
  pointerEvents: 'none',
  zIndex: 100,
  left: 0,
  top: 0,
  width: '100%',
  height: '100%',
}

function getItemStyles(initialOffset: XYCoord | null, currentOffset: XYCoord | null): React.CSSProperties {
  if (!initialOffset || !currentOffset) return { display: 'none' }
  const transform = `translate(${currentOffset.x}px, ${currentOffset.y}px)`
  return { transform, WebkitTransform: transform }
}

export function GridDragLayer({ size }: { size: number }) {
  const { itemType, isDragging, item, initialOffset, currentOffset } = useDragLayer((monitor) => ({
    item: monitor.getItem<MatrixDropValues>(),
    itemType: monitor.getItemType(),
    initialOffset: monitor.getInitialSourceClientOffset(),
    currentOffset: monitor.getSourceClientOffset(),
    isDragging: monitor.isDragging(),
  }))
  const pieces = useAppSelector((state) => state.grid.pieces)

  if (!isDragging || itemType !== ItemTypes.MATRIX || !item) return null
  const piece = (item.id && pieces.find((p) => p.id === item.id)) || item
  return (
    <div style={layerStyles}>
      <div style={getItemStyles(initialOffset, currentOffset)}>
        <TilePreview width={piece.width} height={piece.height} matrix={piece.matrix} size={size} />
      </div>
    </div>
  )
}
