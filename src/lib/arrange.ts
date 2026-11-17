import type { GridPiece } from '@/features/grid/gridSlice'

type Cell = { x: number; y: number }
export type Axis = 'horizontal' | 'vertical'

export interface Arrangement {
  pieces: GridPiece[]
  /** Cells spelling the word, in order. */
  wordCells: Cell[]
  axis: Axis
}

const lettersOf = (p: GridPiece) => p.matrix.flat().join('').toUpperCase()
const isSingle = (p: GridPiece) => p.width === 1 && p.height === 1
const runsAlong = (p: GridPiece, axis: Axis) => (axis === 'horizontal' ? p.height === 1 && p.width > 1 : p.width === 1 && p.height > 1)
const crosses = (p: GridPiece, axis: Axis) => (axis === 'horizontal' ? p.width === 1 && p.height > 1 : p.height === 1 && p.width > 1)

/** One step of a decomposition: piece `index`, either whole (`at` undefined) or crossing at letter `at`. */
type Step = { index: number; at?: number }

/** All ways to spell `word` with distinct pieces along `axis`. */
function* decompositions(word: string, pieces: GridPiece[], axis: Axis): Generator<Step[]> {
  const letters = pieces.map(lettersOf)
  const used = new Array(pieces.length).fill(false)
  const steps: Step[] = []
  function* go(k: number): Generator<Step[]> {
    if (k === word.length) {
      yield [...steps]
      return
    }
    const seen = new Set<string>() // skip identical alternatives
    for (let i = 0; i < pieces.length; i++) {
      if (used[i]) continue
      const p = pieces[i]
      const l = letters[i]
      const options: Step[] = []
      if ((isSingle(p) || runsAlong(p, axis)) && word.startsWith(l, k)) options.push({ index: i })
      else if (crosses(p, axis)) for (let j = 0; j < l.length; j++) if (l[j] === word[k]) options.push({ index: i, at: j })
      for (const o of options) {
        const key = `${l}|${p.width}x${p.height}|${o.at ?? '-'}`
        if (seen.has(key)) continue
        seen.add(key)
        used[i] = true
        steps.push(o)
        yield* go(k + (o.at === undefined ? l.length : 1))
        steps.pop()
        used[i] = false
      }
    }
  }
  yield* go(0)
}

/** Positions ordered from the middle of [0, n) outward. */
function centerOut(n: number): number[] {
  const mid = (n - 1) / 2
  return Array.from({ length: n }, (_, i) => i).sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid) || a - b)
}

/**
 * Lay out `word` on a `width`×`height` board using `pieces` (every piece stays on the board).
 * The word goes as close to the centre as possible; other pieces are kept out of its way.
 */
export function arrangeWord(word: string, pieces: GridPiece[], width: number, height: number): Arrangement | undefined {
  word = word.toUpperCase()
  for (const axis of ['horizontal', 'vertical'] as Axis[]) {
    const along = axis === 'horizontal' ? width : height
    const across = axis === 'horizontal' ? height : width
    if (word.length > along) continue
    let tries = 0
    for (const steps of decompositions(word, pieces, axis)) {
      if (++tries > 200) break
      for (const line of centerOut(across)) {
        for (const start of centerOut(along - word.length + 1)) {
          const r = tryLayout(steps, pieces, axis, line, start, width, height, word.length)
          if (r) return r
        }
      }
    }
  }
  return undefined
}

function tryLayout(
  steps: Step[],
  pieces: GridPiece[],
  axis: Axis,
  line: number,
  start: number,
  width: number,
  height: number,
  wordLen: number,
): Arrangement | undefined {
  const at = (along: number, acrossOff = 0): Cell =>
    axis === 'horizontal' ? { x: along, y: line + acrossOff } : { x: line + acrossOff, y: along }
  const occ = Array.from({ length: height }, () => Array<boolean>(width).fill(false))
  const inside = (c: Cell) => c.x >= 0 && c.y >= 0 && c.x < width && c.y < height
  const placed = new Map<number, Cell>()
  const wordCells: Cell[] = []

  let k = start
  for (const s of steps) {
    const p = pieces[s.index]
    const origin = s.at === undefined ? at(k) : at(k, -s.at)
    for (let y = 0; y < p.height; y++)
      for (let x = 0; x < p.width; x++) {
        const c = { x: origin.x + x, y: origin.y + y }
        if (!inside(c)) return undefined
        occ[c.y][c.x] = true
      }
    placed.set(s.index, origin)
    const len = s.at === undefined ? Math.max(p.width, p.height) : 1
    for (let i = 0; i < len; i++) wordCells.push(at(k + i))
    k += len
  }

  // Keep the rest of the pieces away from the word so they don't extend or touch it.
  const reserved = occ.map((r) => [...r])
  for (const c of [at(start - 1), at(start + wordLen)]) if (inside(c)) reserved[c.y][c.x] = true
  const halo = occ.map((r) => [...r])
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (occ[y][x])
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) if (inside({ x: x + dx, y: y + dy })) halo[y + dy][x + dx] = true
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (reserved[y][x]) halo[y][x] = true

  const rest = pieces
    .map((p, i) => ({ p, i }))
    .filter(({ i }) => !placed.has(i))
    .sort((a, b) => b.p.width * b.p.height - a.p.width * a.p.height)

  for (const blocked of [halo, reserved]) {
    const taken = blocked.map((r) => [...r])
    const extra = new Map<number, Cell>()
    let ok = true
    for (const { p, i } of rest) {
      const cell = firstFit(taken, p, width, height)
      if (!cell) {
        ok = false
        break
      }
      // Leave a one-cell gap around each spare piece too, so spares don't form words.
      for (let y = -1; y <= p.height; y++)
        for (let x = -1; x <= p.width; x++) {
          const c = { x: cell.x + x, y: cell.y + y }
          if (inside(c) && (blocked === halo || (x >= 0 && y >= 0 && x < p.width && y < p.height))) taken[c.y][c.x] = true
        }
      extra.set(i, cell)
    }
    if (ok) {
      const all = new Map([...placed, ...extra])
      return { pieces: pieces.map((p, i) => ({ ...p, cell: all.get(i)! })), wordCells, axis }
    }
  }
  return undefined
}

function firstFit(taken: boolean[][], p: GridPiece, width: number, height: number): Cell | undefined {
  for (let y = 0; y + p.height <= height; y++)
    for (let x = 0; x + p.width <= width; x++) {
      let free = true
      for (let dy = 0; dy < p.height && free; dy++) for (let dx = 0; dx < p.width && free; dx++) free = !taken[y + dy][x + dx]
      if (free) return { x, y }
    }
  return undefined
}

/** Maximal runs of 2+ letters along rows and columns (callers decide which count as words). */
export function boardRuns(grid: Array<Array<string | null>>): { word: string; cells: Cell[] }[] {
  const runs: { word: string; cells: Cell[] }[] = []
  const h = grid.length
  const w = grid[0]?.length ?? 0
  const scan = (len: number, lines: number, get: (line: number, i: number) => Cell) => {
    for (let line = 0; line < lines; line++) {
      let cells: Cell[] = []
      for (let i = 0; i <= len; i++) {
        const c = i < len ? get(line, i) : undefined
        if (c && grid[c.y][c.x]) cells.push(c)
        else {
          if (cells.length >= 2) runs.push({ word: cells.map((c) => grid[c.y][c.x]).join(''), cells })
          cells = []
        }
      }
    }
  }
  scan(w, h, (y, x) => ({ x, y }))
  scan(h, w, (x, y) => ({ x, y }))
  return runs
}
