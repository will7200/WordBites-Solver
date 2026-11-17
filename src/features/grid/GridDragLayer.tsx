import { useDragLayer } from 'react-dnd'
import ItemTypes from '../board/ItemTypes'
import TilePreview from './TilePreview'
import { useAppSelector } from '../../app/store'
import { DragItem, pieceTopLeft } from './dragGeometry'
import { GAP } from './constants'

/** Draws the lifted piece under the pointer, keeping the grabbed letter under the finger. */
export function GridDragLayer({ size }: { size: number }) {
  const { item, itemType, isDragging, monitorOffsets } = useDragLayer((m) => ({
    item: m.getItem<DragItem>(),
    itemType: m.getItemType(),
    isDragging: m.isDragging(),
    monitorOffsets: {
      initialClient: m.getInitialClientOffset(),
      initialSource: m.getInitialSourceClientOffset(),
      client: m.getClientOffset(),
    },
  }))
  const pieces = useAppSelector((state) => state.grid.pieces)
  if (!isDragging || itemType !== ItemTypes.MATRIX || !item) return null
  const tl = pieceTopLeft(
    item,
    {
      getInitialClientOffset: () => monitorOffsets.initialClient,
      getInitialSourceClientOffset: () => monitorOffsets.initialSource,
      getClientOffset: () => monitorOffsets.client,
    },
    size + GAP,
  )
  if (!tl) return null
  const piece = (item.id && pieces.find((p) => p.id === item.id)) || item
  return (
    <div className="pointer-events-none fixed inset-0 z-[100]">
      <div
        className="wb-dragging"
        style={{ transform: `translate3d(${tl.x}px, ${tl.y}px, 0)`, width: 'max-content' }}
      >
        <TilePreview width={piece.width} height={piece.height} matrix={piece.matrix} size={size} />
      </div>
    </div>
  )
}
