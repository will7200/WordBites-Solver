import { Flag, Play, RotateCcw, Timer, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { formatPoints } from '@/lib/scoring'
import type { usePractice } from './usePractice'

const clock = (ms: number) => {
  const s = Math.ceil(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function PracticePanel({ game }: { game: ReturnType<typeof usePractice> }) {
  const { status, start, end, found, score, remaining, seconds, possible, error } = game
  const recent = [...found].reverse()
  const foundSet = new Set(found.map((f) => f.word))
  const missed = [...possible]
    .filter((w) => !foundSet.has(w))
    .sort((a, b) => b.length - a.length || a.localeCompare(b))
    .slice(0, 5)
  const best = [...found].sort((a, b) => b.points - a.points || a.word.localeCompare(b.word))[0]

  if (status === 'idle' || status === 'generating') {
    return (
      <div className="flex flex-col gap-4 text-sm">
        <p className="text-muted-foreground">
          You get a random board and {seconds} seconds. Drag tiles to spell words across or down. Every new word scores
          once; longer words score more.
        </p>
        <Button size="lg" className="bg-amber-300 text-amber-950 hover:bg-amber-200" onClick={start} disabled={status === 'generating'}>
          <Play /> {status === 'generating' ? 'Dealing…' : 'Start round'}
        </Button>
        {error && <p className="text-destructive">{error}</p>}
      </div>
    )
  }

  const running = status === 'running'
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase">
            <Timer className="size-3.5" /> {running ? 'Time left' : 'Round over'}
          </div>
          <div className={cn('text-4xl font-semibold tabular-nums', running && remaining < 10_000 && 'text-red-400')}>
            {clock(remaining)}
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground uppercase">
            <Trophy className="size-3.5" /> Score
          </div>
          <div className="text-4xl font-semibold tabular-nums">{formatPoints(score)}</div>
        </div>
      </div>
      <Progress value={(100 * remaining) / (seconds * 1000)} className="h-1.5 [&>*]:transition-none" aria-label="Time left" />

      {!running && (
        <div className="rounded-lg border bg-muted/40 p-3 text-sm">
          <p>
            You found <b>{found.length}</b> {found.length === 1 ? 'word' : 'words'} for <b>{formatPoints(score)}</b> points.
          </p>
          {best && (
            <p className="text-muted-foreground">
              Your best: <span className="font-mono text-foreground">{best.word}</span> (+{formatPoints(best.points)})
            </p>
          )}
          {missed.length > 0 && (
            <p className="mt-2 text-muted-foreground">
              Longest you missed:{' '}
              {missed.map((w, i) => (
                <span key={w}>
                  {i > 0 && ', '}
                  <span className="font-mono text-foreground">{w}</span>
                </span>
              ))}
            </p>
          )}
          <p className="mt-2 text-muted-foreground">
            All {possible.length.toLocaleString()} possible words are on the right; click one to see it on the board.
          </p>
        </div>
      )}

      <div className="flex gap-2">
        {running ? (
          <Button variant="outline" onClick={end} className="flex-1">
            <Flag /> End round
          </Button>
        ) : (
          <Button onClick={start} className="flex-1 bg-amber-300 text-amber-950 hover:bg-amber-200">
            <RotateCcw /> Play again
          </Button>
        )}
      </div>

      <div className="min-h-0">
        <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Your words · {found.length}
        </h3>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">{running ? 'Move tiles to make a word.' : 'No words this round.'}</p>
        ) : (
          <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto pr-1 lg:max-h-none">
            {recent.map((f, i) => (
              <li
                key={f.word}
                className={cn(
                  'flex items-center justify-between rounded-md px-2 py-1 font-mono text-sm',
                  i === 0 && running ? 'animate-in fade-in slide-in-from-top-1 bg-emerald-500/15 text-emerald-300' : 'bg-muted/50',
                )}
              >
                {f.word}
                <span className="text-xs tabular-nums">+{formatPoints(f.points)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
