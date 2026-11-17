import React from 'react'
import { Check, CircleCheck, Copy, LayoutGrid, Loader2, Play, Search, Square, Trophy } from 'lucide-react'
import { formatPoints, totalPoints, wordPoints } from '@/lib/scoring'
import { useAppDispatch, useAppSelector } from '@/app/store'
import { restorePieces } from '@/features/grid/gridSlice'
import { arrangeWord, boardRuns } from '@/lib/arrange'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import { useWordSolver } from '@/components/WordSolver'
import type { PieceInput } from '@/workerProtocol'
import { ALL, groupWords, LETTERS, SortOrder, sortWords } from './groupWords'

const ON_BOARD = 'ON_BOARD'

export function WordDisplay({
  pieces,
  hidden,
  playedWords,
  boardWords = [],
}: {
  pieces: PieceInput[]
  /** Words currently spelled on the board (for the "On board" filter). */
  boardWords?: string[]
  /** Hide the list (practice round in progress) while still solving in the background. */
  hidden?: string
  /** Externally controlled set of played words (practice results). */
  playedWords?: Set<string>
}) {
  const wordSolver = useWordSolver()
  const [letter, setLetter] = React.useState<string>(ALL)
  const [sortOrder, setSortOrder] = React.useState<SortOrder>('length')
  const [query, setQuery] = React.useState('')
  const [words, setWords] = React.useState<string[]>([])
  const [currId, setCurrId] = React.useState<string>()
  const [elapsed, setElapsed] = React.useState<number>()
  const [error, setError] = React.useState<string>()
  const [solveProgress, setSolveProgress] = React.useState<number>()
  // Only show the solve bar if a solve takes long enough to notice.
  const [showBar, setShowBar] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  // Words the user has already played in the game; reset whenever the set of pieces changes.
  const [ownPlayed, setPlayed] = React.useState<Set<string>>(() => new Set())
  React.useEffect(() => setPlayed(new Set()), [pieces])
  const played = playedWords ?? ownPlayed
  const togglePlayed = (w: string) =>
    setPlayed((p) => {
      const n = new Set(p)
      if (n.has(w)) n.delete(w)
      else n.add(w)
      return n
    })
  const [selected, setSelected] = React.useState<string>()
  const [arrangeError, setArrangeError] = React.useState<string>()
  const dispatch = useAppDispatch()
  const grid = useAppSelector((s) => s.grid)
  // A selected word stays selected while it's still spelled out on the board.
  const onBoard = React.useMemo(
    () => new Set(boardRuns(grid.grid).map((r) => r.word.toLowerCase())),
    [grid.grid],
  )
  React.useEffect(() => {
    if (selected && !onBoard.has(selected)) setSelected(undefined)
  }, [onBoard, selected])

  const arrange = (w: string) => {
    const a = arrangeWord(w, grid.pieces, grid.width, grid.height)
    if (!a) {
      setArrangeError(`Couldn't lay out “${w}” on this board.`)
      return
    }
    setArrangeError(undefined)
    dispatch(restorePieces(a.pieces))
    setSelected(w)
    setCopied(false)
  }
  // Pieces the user cancelled a solve for; don't auto-restart on them when the worker comes back.
  const cancelledFor = React.useRef<PieceInput[]>(undefined)

  const solve = React.useCallback(
    (force = false) => {
      if (!wordSolver.ready) return
      if (!force && cancelledFor.current === pieces) return
      cancelledFor.current = undefined
      if (pieces.length === 0) {
        setWords([])
        setElapsed(undefined)
        return
      }
      const start = performance.now()
      let cancelled = false
      const [id, result] = wordSolver.solve(pieces, (p) => {
        if (!cancelled) setSolveProgress(p.total ? p.done / p.total : 0)
      })
      setCurrId(id)
      setError(undefined)
      setSolveProgress(0)
      setShowBar(false)
      const barTimer = setTimeout(() => !cancelled && setShowBar(true), 150)
      result
        .then((r) => {
          if (cancelled) return
          setWords(r)
          setElapsed(performance.now() - start)
        })
        .catch((e: Error) => {
          if (!cancelled && e.message !== 'worker terminated') setError(e.message)
        })
        .finally(() => {
          clearTimeout(barTimer)
          setCurrId((c) => (c === id ? undefined : c))
          if (!cancelled) {
            setSolveProgress(undefined)
            setShowBar(false)
          }
        })
      return () => {
        cancelled = true
        clearTimeout(barTimer)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pieces, wordSolver.ready, wordSolver.dictionary],
  )
  React.useEffect(() => solve(), [solve])

  const groups = React.useMemo(() => groupWords(words, sortOrder), [words, sortOrder])
  const q = query.trim().toLowerCase()
  const boardSorted = React.useMemo(() => sortWords([...new Set(boardWords)], sortOrder), [boardWords, sortOrder])
  const matches = React.useMemo(
    () => (letter === ON_BOARD ? boardSorted : (groups[letter] ?? [])).filter((w) => !q || w.includes(q)),
    [groups, letter, q, boardSorted],
  )
  const shown = React.useMemo(() => matches.filter((w) => !played.has(w)), [matches, played])
  const playedShown = React.useMemo(() => matches.filter((w) => played.has(w)), [matches, played])
  const maxScore = React.useMemo(() => totalPoints(words), [words])
  const playedScore = React.useMemo(() => totalPoints(played), [played])
  // In "most points" mode, section the list by word length.
  const sections = React.useMemo(() => {
    const out: { title: string | null; words: string[]; played?: boolean }[] = []
    if (sortOrder !== 'length') out.push({ title: null, words: shown })
    else
      for (const w of shown) {
        const title = `${w.length} letters · ${formatPoints(wordPoints(w))} pts`
        if (out.at(-1)?.title !== title) out.push({ title, words: [] })
        out.at(-1)!.words.push(w)
      }
    if (playedShown.length) out.push({ title: playedWords ? 'You found' : 'Played', words: playedShown, played: true })
    return out
  }, [shown, playedShown, sortOrder])

  const copy = (w: string) => {
    navigator.clipboard?.writeText(w).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  const busy = currId !== undefined || !wordSolver.ready
  if (hidden)
    return (
      <div className="flex h-full flex-col gap-3">
        <h2 className="text-base font-semibold">Words</h2>
        <p className="py-8 text-center text-sm text-muted-foreground">{hidden}</p>
      </div>
    )
  const loading = wordSolver.loading
  const loadingLabel =
    loading?.phase === 'download'
      ? `Downloading dictionary… ${Math.round((100 * loading.done) / loading.total)}%`
      : loading?.phase === 'build'
        ? 'Preparing dictionary…'
        : 'Loading…'
  // 0–100 for the bar, or undefined to hide it.
  const bar = !wordSolver.ready
    ? loading?.phase === 'download'
      ? (95 * loading.done) / loading.total
      : loading?.phase === 'build'
        ? 97
        : 0
    : showBar && solveProgress !== undefined
      ? 100 * solveProgress
      : undefined
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold">Words</h2>
        <span className="text-sm text-muted-foreground tabular-nums">
          {busy ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="size-3.5 animate-spin" /> {wordSolver.ready ? 'Solving…' : loadingLabel}
            </span>
          ) : (
            elapsed !== undefined && `${words.length.toLocaleString()} found · ${Math.round(elapsed)} ms`
          )}
        </span>
        <div className="ml-auto">
          {currId !== undefined ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                cancelledFor.current = pieces
                wordSolver.terminate()
                setCurrId(undefined)
              }}
            >
              <Square /> Stop
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled={!wordSolver.ready || !pieces.length} onClick={() => solve(true)}>
              <Play /> Solve
            </Button>
          )}
        </div>
      </div>

      {words.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <Trophy className="size-4 text-amber-300" />
          <span className="tabular-nums">
            <b>{formatPoints(playedScore)}</b>
            <span className="text-muted-foreground"> / {formatPoints(maxScore)} pts possible</span>
          </span>
          {played.size > 0 && (
            <span className="text-muted-foreground tabular-nums">· {played.size} played</span>
          )}
        </div>
      )}

      {bar !== undefined && (
        <Progress
          value={bar}
          aria-label={wordSolver.ready ? 'Solving' : 'Loading dictionary'}
          className="h-1.5 [&>*]:transition-none"
        />
      )}

      {(error || wordSolver.error || arrangeError) && (
        <p className="text-sm text-destructive">{error || wordSolver.error || arrangeError}</p>
      )}

      {selected ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm">
          <LayoutGrid className="size-4 text-emerald-400" />
          <span>
            Showing <b className="font-mono">{selected}</b> on the board
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">{formatPoints(wordPoints(selected))} pts</span>
          <div className="ml-auto flex gap-1">
            {!playedWords && (
              <Button size="xs" variant={played.has(selected) ? 'secondary' : 'default'} onClick={() => togglePlayed(selected)}>
                <CircleCheck /> {played.has(selected) ? 'Played' : 'Mark played'}
              </Button>
            )}
            <Button size="xs" variant="ghost" onClick={() => copy(selected)}>
              {copied ? <Check /> : <Copy />} {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>
      ) : (
        words.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Click a word to arrange the board for it, then mark it played. Valid words on the board glow.
          </p>
        )
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter" className="pl-8" />
        </div>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={sortOrder}
          onValueChange={(v) => v && setSortOrder(v as SortOrder)}
          aria-label="Sort order"
        >
          <ToggleGroupItem value="length">Most points</ToggleGroupItem>
          <ToggleGroupItem value="alpha">A–Z</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="flex flex-wrap gap-1" role="tablist" aria-label="First letter">
        {[ON_BOARD, ALL, ...LETTERS].map((l) => {
          const count = l === ON_BOARD ? boardSorted.length : groups[l].length
          if (l === ON_BOARD && count === 0 && letter !== ON_BOARD) return null
          if (l !== ALL && count === 0) return null
          return (
            <button
              key={l}
              role="tab"
              aria-selected={letter === l}
              onClick={() => setLetter(l)}
              className={cn(
                'inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium transition-colors',
                letter === l ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              {l === ALL ? 'All' : l === ON_BOARD ? 'On board' : l}
              <span className="tabular-nums opacity-60">{count}</span>
            </button>
          )
        })}
      </div>

      <div className="-mr-2 min-h-0 flex-1 overflow-y-auto pr-2">
        {pieces.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Add some pieces to see words.</p>
        ) : shown.length === 0 && playedShown.length === 0 && !busy ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No words.</p>
        ) : (
          sections.map((s) => (
            <section key={s.title ?? 'all'} className={cn('mb-4', s.played && 'opacity-60')}>
              {s.title && (
                <h3 className="sticky top-0 mb-2 flex items-center gap-2 bg-card py-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {s.title} <Badge variant="secondary">{s.words.length}</Badge>
                </h3>
              )}
              <ul className="flex flex-wrap gap-1.5">
                {s.words.map((w) => (
                  <li key={w}>
                    <button
                      onClick={() => arrange(w)}
                      title="Arrange the board for this word"
                      aria-pressed={selected === w}
                      className={cn(
                        'word rounded-md border px-2 py-1 font-mono text-sm transition-colors hover:bg-accent',
                        s.played && 'line-through decoration-muted-foreground/60',
                        selected === w && 'border-emerald-500 bg-emerald-500/15 text-emerald-300',
                      )}
                    >
                      {w}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  )
}
