import React, { memo } from 'react'
import clsx from 'clsx'

interface Props {
  width: number
  height: number
  matrix: Array<Array<string | null>>
  tileWidth: number
}

const TilePreview = memo(function TilePreview({ width, height, matrix, tileWidth }: Props) {
  const items: React.ReactNode[] = []
  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      items.push(
        <div className={clsx('tile')} key={`${i}${j}`} style={{ width: tileWidth, height: tileWidth }}>
          {matrix[j]?.[i]}
        </div>,
      )
    }
  }
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${width}, ${tileWidth}px)`,
        gridTemplateRows: `repeat(${height}, ${tileWidth}px)`,
      }}
    >
      {items}
    </div>
  )
})

export default TilePreview
