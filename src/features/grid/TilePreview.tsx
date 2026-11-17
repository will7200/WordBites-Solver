import { memo } from 'react'
import type React from 'react'
import { GAP } from './constants'

interface Props {
  width: number
  height: number
  matrix: Array<Array<string | null>>
  size: number
}

/** A piece rendered as fused tiles (used for drag previews and the piece tray). */
const TilePreview = memo(function TilePreview({ width, height, matrix, size }: Props) {
  const join = (x: number, y: number) =>
    [x > 0 && 'l', x < width - 1 && 'r', y > 0 && 't', y < height - 1 && 'b'].filter(Boolean).join(' ')
  return (
    <div
      className="grid"
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
      {Array.from({ length: height }, (_, y) =>
        Array.from({ length: width }, (_, x) => (
          <div className="wb-tile" data-join={join(x, y)} key={`${x}-${y}`}>
            {matrix[y]?.[x]}
          </div>
        )),
      )}
    </div>
  )
})

export default TilePreview
