import React from 'react'
import clsx from 'clsx'
import './WordDisplay.scss'
import { useWordSolver } from '../../components/WordSolver'
import type { PieceInput } from '../../workerProtocol'
import Cancel from './Cancel'
import Solve from './Solve'
import { ALL, groupWords, LETTERS, SortOrder } from './groupWords'

const formatSeconds = (ms: number) => `${(ms / 1000).toFixed(2)}s`

export function WordDisplay({ pieces }: { pieces: PieceInput[] }) {
  const wordSolver = useWordSolver()
  const [currentLetter, setCurrentLetter] = React.useState<string>(ALL)
  const [sortOrder, setSortOrder] = React.useState<SortOrder>('length')
  const [words, setWords] = React.useState<string[]>([])
  const [currId, setCurrId] = React.useState<string>()
  const [elapsed, setElapsed] = React.useState<number>()
  const [error, setError] = React.useState<string>()

  // Pieces the user cancelled a solve for; don't auto-restart on them when the worker comes back.
  const cancelledFor = React.useRef<PieceInput[]>(undefined)

  const solve = React.useCallback((force = false) => {
    if (!wordSolver.ready) return
    if (!force && cancelledFor.current === pieces) return
    cancelledFor.current = undefined
    if (pieces.length === 0) {
      setWords([])
      setElapsed(undefined)
      return
    }
    const start = performance.now()
    const [id, result] = wordSolver.solve(pieces)
    setCurrId(id)
    setError(undefined)
    let cancelled = false
    result
      .then((r) => {
        if (cancelled) return
        setWords(r.map((w) => w.word))
        setElapsed(performance.now() - start)
      })
      .catch((e: Error) => {
        if (!cancelled && e.message !== 'worker terminated') setError(e.message)
      })
      .finally(() => setCurrId((c) => (c === id ? undefined : c)))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pieces, wordSolver.ready, wordSolver.dictionary])

  React.useEffect(() => solve(), [solve])

  const groups = React.useMemo(() => groupWords(words, sortOrder), [words, sortOrder])
  const shown = groups[currentLetter] ?? []

  return (
    <>
      <h2 className="words-header">
        Words
        {currId === undefined && elapsed !== undefined && <span className="time-load">{formatSeconds(elapsed)}</span>}
        {(currId !== undefined || !wordSolver.ready) && <div className="lds-hourglass" title="Working…" />}
        {currId !== undefined ? (
          <button
            className={clsx('icon-container', 'cancel-word-solver')}
            title="Cancel"
            onClick={() => {
              cancelledFor.current = pieces
              wordSolver.terminate()
              setCurrId(undefined)
            }}
          >
            <Cancel />
          </button>
        ) : (
          <button className={clsx('icon-container', 'solve-word-solver')} title="Solve" onClick={() => solve(true)}>
            <Solve />
          </button>
        )}
        <label className="sort-order">
          Sort
          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as SortOrder)}>
            <option value="length">Longest first</option>
            <option value="alpha">A → Z</option>
          </select>
        </label>
      </h2>
      {(error || wordSolver.error) && <div className="solver-error">{error || wordSolver.error}</div>}
      <div className="letters">
        {[ALL, ...LETTERS].map((letter) => {
          const count = groups[letter].length
          return (
            <button
              className="letter-root"
              key={letter}
              disabled={count === 0}
              onClick={() => setCurrentLetter(letter)}
            >
              <span className={clsx('letter', 'ripple', count === 0 && 'no-results', currentLetter === letter && 'active')}>
                {letter === ALL ? 'All' : letter}
              </span>
              {count > 0 && <span className={clsx('badge', 'badge-top-right')}>{count}</span>}
            </button>
          )
        })}
      </div>
      <div className="word-list">
        <div className="summary">
          Found {shown.length} words
          {currentLetter !== ALL && (
            <>
              {' '}
              that start with <span className="letter">{currentLetter}</span>
            </>
          )}
        </div>
        <ul className="list">
          {shown.map((w) => (
            <li className="word" key={w}>
              {w}
              <span className="word-length">{w.length}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
