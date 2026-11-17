import { CircleHelp, Copy, Hand, Keyboard, MousePointerClick, RotateCcw, Sparkles, Trophy, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Kbd } from '@/components/ui/kbd'

const STEPS = [
  {
    icon: Keyboard,
    title: 'Add pieces',
    body: (
      <>
        Type the pieces from your game separated by spaces, e.g. <code className="font-mono">r a c er ni</code>, and press{' '}
        <Kbd>Enter</Kbd>. Pick <b>Across</b> or <b>Down</b> for multi-letter pieces first.
      </>
    ),
  },
  { icon: Hand, title: 'Move a piece', body: 'Drag it to another spot on the board. Green means it fits there.' },
  {
    icon: X,
    title: 'Remove a piece',
    body: 'Hover it and click the × in its corner, or double-click / right-click it. On a phone the × is always shown.',
  },
  { icon: RotateCcw, title: 'Start over', body: 'Reset board clears every piece. You can undo it right after.' },
  {
    icon: MousePointerClick,
    title: 'Browse words',
    body: 'Words update as you edit the board, longest first. Filter by text or first letter, or switch to A–Z.',
  },
  {
    icon: Sparkles,
    title: 'See a word on the board',
    body: 'Click a word and the board rearranges to spell it. Any valid word on the board glows green.',
  },
  {
    icon: Trophy,
    title: 'Score and practice',
    body: 'Each word shows its points; mark words played to track your score. Practice mode deals a random board with a timer — spell words by moving tiles.',
  },
  { icon: Copy, title: 'Copy a word', body: 'After clicking a word, use Copy in the banner above the list.' },
]

export function HelpDialog({ defaultOpen }: { defaultOpen?: boolean }) {
  return (
    <Dialog defaultOpen={defaultOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <CircleHelp /> How it works
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>How it works</DialogTitle>
          <DialogDescription>Recreate your Word Bites board and get every word you can make.</DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-4">
          {STEPS.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                <Icon className="size-4" />
              </div>
              <div className="text-sm">
                <p className="font-medium">{title}</p>
                <p className="text-muted-foreground">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
