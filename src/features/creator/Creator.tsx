import React from 'react'
import clsx from 'clsx'
import './Creator.scss'
import { TileDraggable } from './TileDraggable'
import { useAppSelector } from '../../app/store'

type InputEvent = React.ChangeEvent<HTMLInputElement>
type Matrix = Array<Array<string | null>>

const emptyMatrix = (width: number, height: number): Matrix =>
  Array.from({ length: height }, () => Array<string | null>(width).fill(null))

export function Creator() {
  const [width, setWidth] = React.useState(1)
  const [height, setHeight] = React.useState(1)
  const [matrix, setMatrix] = React.useState<Matrix>(() => emptyMatrix(1, 1))
  const grid = useAppSelector((state) => state.grid)

  const resize = (w: number, h: number) => {
    setMatrix((m) => Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => m[y]?.[x] ?? null)))
    setWidth(w)
    setHeight(h)
  }

  const setCell = (y: number, x: number) => (event: InputEvent) => {
    const v = event.target.value.toUpperCase().replace(/[^A-Z]/g, '')
    setMatrix((m) => m.map((row, ry) => row.map((c, rx) => (ry === y && rx === x ? v || null : c))))
  }

  // A piece is either a single row or a single column, at most half the board.
  const maxWidth = height === 1 ? Math.floor(grid.width / 2) : 1
  const maxHeight = width === 1 ? Math.floor(grid.height / 2) : 1

  const reset = React.useCallback(() => setMatrix(emptyMatrix(width, height)), [width, height])
  const value = React.useMemo(() => ({ width, height, matrix }), [width, height, matrix])

  return (
    <div className={clsx('creator-display')}>
      <div className={clsx('col')} style={{ maxHeight: '100%' }}>
        <div className={clsx('creator-inputs')}>
          <label htmlFor="cwidth">Width: {width}</label>
          <input
            type="range"
            id="cwidth"
            value={width}
            min={1}
            max={maxWidth}
            onChange={(e) => resize(parseInt(e.target.value), height)}
          />
          <label htmlFor="cheight">Height: {height}</label>
          <input
            type="range"
            id="cheight"
            value={height}
            min={1}
            max={maxHeight}
            onChange={(e) => resize(width, parseInt(e.target.value))}
          />
        </div>
        <TileDraggable className={clsx('creator-matrix')} value={value} onDrop={reset}>
          {matrix.map((columns, y) => (
            <div className={clsx('creator-row')} data-row={y} key={`${y}-row`}>
              {columns.map((cell, x) => (
                <div className={clsx('creator-cell')} data-cell={`${cell}`} key={`matrix_input-${y}-${x}`}>
                  <input
                    className={clsx('creator-cell')}
                    type="text"
                    id={`matrix_input-${y}-${x}`}
                    aria-label={`Tile letter ${y + 1}-${x + 1}`}
                    maxLength={1}
                    value={cell ?? ''}
                    onChange={setCell(y, x)}
                  />
                </div>
              ))}
            </div>
          ))}
        </TileDraggable>
      </div>
    </div>
  )
}
