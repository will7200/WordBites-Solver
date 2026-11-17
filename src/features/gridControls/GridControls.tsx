import React from 'react'
import clsx from 'clsx'
import { setGridSize } from '../grid/gridSlice'
import { useAppDispatch, useAppSelector } from '../../app/store'
import { useWordSolver } from '../../components/WordSolver'

const options = [
  { value: 'ospd', label: "Official Scrabble Player's Dictionary" },
  { value: 'unix_words', label: 'Unix Dictionary' },
  { value: 'popular', label: 'Popular Words' },
  { value: 'enable1', label: "Verbose Official Scrabble Player's Dictionary" },
  { value: 'alot', label: 'A lot of words (470,000)' },
]

export default function GridControls() {
  const dispatch = useAppDispatch()
  const wordSolver = useWordSolver()
  const { width, height } = useAppSelector((state) => state.grid)

  const setSize = (w: number, h: number) => {
    dispatch(setGridSize({ width: w, height: h }))
    wordSolver.setBoardSize(w, h).catch(console.error)
  }

  return (
    <div className={clsx('grid-controls')}>
      <div className={clsx('col')} style={{ maxHeight: '100%' }}>
        <div className={clsx('creator-inputs')}>
          <label htmlFor="fwidth">Width: {width}</label>
          <input
            type="range"
            id="fwidth"
            value={width}
            min={1}
            max={10}
            onChange={(e) => setSize(parseInt(e.target.value), height)}
          />
          <label htmlFor="fheight">Height: {height}</label>
          <input
            type="range"
            id="fheight"
            value={height}
            min={1}
            max={10}
            onChange={(e) => setSize(width, parseInt(e.target.value))}
          />
        </div>
        <div className={clsx('creator-inputs')}>
          <label htmlFor="dictionary">Dictionary</label>
          <select
            id="dictionary"
            className="dictionary-select"
            value={wordSolver.dictionary}
            onChange={(e) => wordSolver.setDictionary(e.target.value).catch(console.error)}
          >
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
