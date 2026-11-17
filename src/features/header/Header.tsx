import { Gamepad2, Minus, Plus, Puzzle, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { HelpDialog } from './HelpDialog'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useAppDispatch, useAppSelector } from '@/app/store'
import { setGridSize } from '@/features/grid/gridSlice'
import { useWordSolver } from '@/components/WordSolver'

const DICTIONARIES = [
  { value: 'enable1', label: 'ENABLE (173k words)' },
  { value: 'alot', label: 'Everything (370k, many obscure)' },
  { value: 'ospd', label: "Official Scrabble Players' (79k)" },
  { value: 'popular', label: 'Popular words (25k)' },
  { value: 'unix_words', label: 'Unix dictionary (234k)' },
]

export type Mode = 'solve' | 'practice'

function Stepper({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="mr-1 text-xs text-muted-foreground">{label}</span>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={`Decrease ${label}`}
        disabled={disabled || value <= 2}
        onClick={() => onChange(value - 1)}
      >
        <Minus />
      </Button>
      <span className="w-6 text-center tabular-nums">{value}</span>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={`Increase ${label}`}
        disabled={disabled || value >= 10}
        onClick={() => onChange(value + 1)}
      >
        <Plus />
      </Button>
    </div>
  )
}

// Open the help automatically the first time someone visits.
const firstVisit = (() => {
  try {
    if (localStorage.getItem('wb-seen-help')) return false
    localStorage.setItem('wb-seen-help', '1')
    return true
  } catch {
    return false
  }
})()

export function Header({ mode, onModeChange }: { mode: Mode; onModeChange: (m: Mode) => void }) {
  const dispatch = useAppDispatch()
  const solver = useWordSolver()
  const { width, height, pieces } = useAppSelector((s) => s.grid)

  const resize = (w: number, h: number) => {
    if (pieces.length && !confirm('Changing the board size clears the board. Continue?')) return
    dispatch(setGridSize({ width: w, height: h }))
  }

  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-md bg-amber-300 text-amber-950">
            <Puzzle className="size-5" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight">Word Bites Solver</h1>
          <HelpDialog defaultOpen={firstVisit} />
        </div>
        <ToggleGroup
          type="single"
          variant="outline"
          value={mode}
          onValueChange={(v) => v && onModeChange(v as Mode)}
          aria-label="Mode"
        >
          <ToggleGroupItem value="solve">
            <Search /> Solver
          </ToggleGroupItem>
          <ToggleGroupItem value="practice">
            <Gamepad2 /> Practice
          </ToggleGroupItem>
        </ToggleGroup>
        <div className="ml-auto flex flex-wrap items-center gap-x-5 gap-y-2">
          <Select value={solver.dictionary} onValueChange={(v) => solver.setDictionary(v).catch(console.error)}>
            <SelectTrigger className="w-64" aria-label="Dictionary">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DICTIONARIES.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Stepper label="Width" value={width} onChange={(w) => resize(w, height)} disabled={mode === 'practice'} />
          <Stepper label="Height" value={height} onChange={(h) => resize(width, h)} disabled={mode === 'practice'} />
        </div>
      </div>
    </header>
  )
}
