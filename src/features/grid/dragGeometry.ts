import type { XYCoord } from 'react-dnd'
import type { MatrixDropValues } from '../board/ItemTypes'

/** A piece being dragged, plus where on it the pointer grabbed it. */
export interface DragItem extends MatrixDropValues {
  /** Which cell of the piece the drag started from (0,0 = top-left). */
  srcCell: { dx: number; dy: number }
  /** Pixel pitch (cell + gap) of the element the drag started from. */
  srcPitch: number
}

interface Offsets {
  getInitialClientOffset(): XYCoord | null
  getInitialSourceClientOffset(): XYCoord | null
  getClientOffset(): XYCoord | null
}

/** Grab point in cell units relative to the piece's top-left (e.g. 1.4,0.5 = middle of 2nd letter). */
export function grabPoint(item: DragItem, m: Offsets): XYCoord | null {
  const p = m.getInitialClientOffset()
  const s = m.getInitialSourceClientOffset()
  if (!p || !s) return null
  return { x: item.srcCell.dx + (p.x - s.x) / item.srcPitch, y: item.srcCell.dy + (p.y - s.y) / item.srcPitch }
}

/** Where the piece's top-left is now, in client pixels, when drawn at `pitch`. */
export function pieceTopLeft(item: DragItem, m: Offsets, pitch: number): XYCoord | null {
  const g = grabPoint(item, m)
  const c = m.getClientOffset()
  if (!g || !c) return null
  return { x: c.x - g.x * pitch, y: c.y - g.y * pitch }
}

/** Board cell the piece would snap to (nearest), given the board's client rect. */
export function snapCell(item: DragItem, m: Offsets, board: DOMRect, pitch: number): { x: number; y: number } | null {
  const tl = pieceTopLeft(item, m, pitch)
  if (!tl) return null
  return { x: Math.round((tl.x - board.left) / pitch), y: Math.round((tl.y - board.top) / pitch) }
}
