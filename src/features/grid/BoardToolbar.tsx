import React from 'react'
import { Check, ChevronDown, Link, RotateCcw, Sparkles, Square, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAppDispatch, useAppSelector } from '@/app/store'
import { useWordSolver } from '@/components/WordSolver'
import { encodeBoard } from '@/lib/boardCodec'
import { formatPoints } from '@/lib/scoring'
import type { LayoutObjective } from '@/workerProtocol'
import { clearBoard, GridPiece, restorePieces } from './gridSlice'

type Notice =
  | { kind: 'cleared'; undo: GridPiece[] }
  | {
      kind: 'layout'
      undo: GridPiece[]
      words: number
      points: number
      objective: LayoutObjective
      signature: string
      searches: number
    }

const signature = (pieces: GridPiece[]) => pieces.map((p) => `${p.id}@${p.cell.x},${p.cell.y}`).join(' ')

/** Identifies a set of pieces regardless of position or order. */
const pieceKey = (p: GridPiece) => `${p.matrix.flat().join('')}:${p.width}x${p.height}`

interface BestKnown {
  /** Cells by piece key, in board order (duplicates are interchangeable). */
  cells: Map<string, { x: number; y: number }[]>
  words: number
  points: number
  searches: number
}

/**
 * The search is randomized, so remember the best layout found so far for each set of pieces
 * and objective; searching again only ever improves on it.
 */
const bestKnown = new Map<string, BestKnown>()

export function BoardToolbar() {
  const dispatch = useAppDispatch()
  const solver = useWordSolver()
  const { pieces, width, height } = useAppSelector((s) => s.grid)
  const [notice, setNotice] = React.useState<Notice>()
  const [shared, setShared] = React.useState(false)
  const [search, setSearch] = React.useState<{ id: string; progress: number }>()

  // Drop the notice once the board changes from what it describes.
  React.useEffect(() => {
    if (!notice) return
    if (notice.kind === 'cleared' && pieces.length) setNotice(undefined)
    if (notice.kind === 'layout' && signature(pieces) !== notice.signature) setNotice(undefined)
  }, [pieces, notice])
  React.useEffect(() => {
    if (notice?.kind !== 'cleared') return
    const t = setTimeout(() => setNotice(undefined), 8000)
    return () => clearTimeout(t)
  }, [notice])

  const share = () => {
    const url = new URL(location.href)
    url.hash = `b=${encodeBoard({ width, height, pieces })}`
    navigator.clipboard?.writeText(url.toString()).catch(() => {})
    setShared(true)
    setTimeout(() => setShared(false), 1500)
  }

  const findBest = (objective: LayoutObjective) => {
    const before = pieces
    const input = pieces.map((p) => ({ letters: p.matrix.flat().join('').toLowerCase(), width: p.width, height: p.height }))
    const [id, result] = solver.bestLayout(input, objective, (p) =>
      setSearch((s) => (s && s.id === id ? { id, progress: p.total ? p.done / p.total : 0 } : s)),
    )
    setSearch({ id, progress: 0 })
    const setKey = `${objective}|${before.map(pieceKey).sort().join(' ')}`
    result
      .then((r) => {
        const prev = bestKnown.get(setKey)
        const isBetter =
          !prev ||
          (objective === 'words'
            ? r.words.length - prev.words || r.points - prev.points
            : r.points - prev.points || r.words.length - prev.words) > 0
        let next: GridPiece[]
        let words = r.words.length
        let points = r.points
        if (isBetter) {
          next = before.map((p, i) => ({ ...p, cell: { x: r.positions[i][0], y: r.positions[i][1] } }))
          const cells = new Map<string, { x: number; y: number }[]>()
          for (const p of next) cells.set(pieceKey(p), [...(cells.get(pieceKey(p)) ?? []), p.cell])
          bestKnown.set(setKey, { cells, words, points, searches: (prev?.searches ?? 0) + 1 })
        } else {
          // This search did worse than an earlier one: show the earlier best instead.
          prev.searches += 1
          const used = new Map<string, number>()
          next = before.map((p) => {
            const k = pieceKey(p)
            const n = used.get(k) ?? 0
            used.set(k, n + 1)
            return { ...p, cell: prev.cells.get(k)![n] }
          })
          words = prev.words
          points = prev.points
        }
        dispatch(restorePieces(next))
        setNotice({
          kind: 'layout',
          undo: before,
          words,
          points,
          objective,
          signature: signature(next),
          searches: bestKnown.get(setKey)!.searches,
        })
      })
      .catch(() => {})
      .finally(() => setSearch((s) => (s?.id === id ? undefined : s)))
  }

  const undo = () => {
    if (!notice) return
    dispatch(restorePieces(notice.undo))
    setNotice(undefined)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold">Board</h2>
        <span className="text-sm text-muted-foreground tabular-nums">
          {width}×{height} · {pieces.length} {pieces.length === 1 ? 'piece' : 'pieces'}
        </span>
        <div className="ml-auto flex items-center gap-1">
          {search ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                solver.terminate()
                setSearch(undefined)
              }}
            >
              <Square /> Stop
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" disabled={pieces.length < 2 || !solver.ready}>
                  <Sparkles /> Best layout <ChevronDown className="opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  Rearrange every piece to spell as many words at once as possible
                </DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => findBest('words')}>Most words</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => findBest('points')}>Most points</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button size="sm" variant="ghost" disabled={!pieces.length} onClick={share} title="Copy a link to this board">
            {shared ? <Check /> : <Link />} {shared ? 'Link copied' : 'Share'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={!pieces.length || !!search}
            onClick={() => {
              setNotice({ kind: 'cleared', undo: pieces })
              dispatch(clearBoard())
            }}
          >
            <RotateCcw /> Reset board
          </Button>
        </div>
      </div>

      {search && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="shrink-0">Searching layouts…</span>
          <Progress value={100 * search.progress} className="h-1.5 [&>*]:transition-none" aria-label="Searching layouts" />
        </div>
      )}

      {notice && !search && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-sm">
          {notice.kind === 'cleared' ? (
            <span>Board cleared</span>
          ) : (
            <span>
              <Sparkles className="mr-1 inline size-4 text-amber-300" />
              Best layout found: <b>{notice.words}</b> {notice.words === 1 ? 'word' : 'words'} ·{' '}
              <b>{formatPoints(notice.points)}</b> pts on the board
              {notice.searches > 1 && (
                <span className="text-muted-foreground"> · best of {notice.searches} searches</span>
              )}
            </span>
          )}
          <Button size="xs" variant="ghost" className="ml-auto" onClick={undo}>
            <Undo2 /> Undo
          </Button>
        </div>
      )}
    </div>
  )
}
