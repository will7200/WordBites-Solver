import type { GridPiece } from '@/features/grid/gridSlice'

/** Round length in seconds. GamePigeon's word games use 80s (Word Bites itself is unconfirmed). */
export const ROUND_SECONDS = 80
export const PRACTICE_WIDTH = 8
export const PRACTICE_HEIGHT = 9

// English letter frequencies (Scrabble tile counts) used to draw single tiles.
const LETTER_WEIGHTS: Record<string, number> = {
  E: 12, A: 9, I: 9, O: 8, N: 6, R: 6, T: 6, L: 4, S: 4, U: 4, D: 4, G: 3, B: 2, C: 2, M: 2, P: 2,
  F: 2, H: 2, V: 2, W: 2, Y: 2, K: 1, J: 1, X: 1, Z: 1, // no lone Q; it comes as a QU piece
}
// Common English letter pairs for two-letter pieces.
const PAIRS = ['QU', 'ER', 'TH', 'IN', 'AN', 'RE', 'ON', 'EN', 'AT', 'ES', 'ED', 'ST', 'OR', 'TE', 'AR', 'IS', 'LE', 'ND', 'NG', 'AL', 'IT', 'OU', 'CH', 'SH', 'LY']
const VOWELS = new Set(['A', 'E', 'I', 'O', 'U'])

export interface PracticeSpec {
  singles: number
  across: number
  down: number
}
/** Piece mix for a round. GamePigeon's exact mix isn't documented; this gives ~20 letters. */
export const PIECE_MIX: PracticeSpec = { singles: 8, across: 3, down: 3 }

type Rng = () => number

/** Random pieces: singles drawn from a tile bag (no letter more than twice, balanced vowels) plus common pairs. */
export function randomPieces(rng: Rng = Math.random, mix: PracticeSpec = PIECE_MIX): Omit<GridPiece, 'id' | 'cell'>[] {
  let singles: string[] = []
  for (let tries = 0; tries < 50; tries++) {
    const bag = Object.entries(LETTER_WEIGHTS).flatMap(([l, n]) => Array<string>(n).fill(l))
    singles = []
    while (singles.length < mix.singles && bag.length) {
      const [l] = bag.splice(Math.floor(rng() * bag.length), 1)
      if (singles.filter((x) => x === l).length < 2) singles.push(l)
    }
    const v = singles.filter((l) => VOWELS.has(l)).length
    if (v >= Math.ceil(mix.singles / 3) && v <= Math.ceil(mix.singles / 2)) break
  }
  const pairs = Array.from({ length: mix.across + mix.down }, () => PAIRS[Math.floor(rng() * PAIRS.length)])
  return [
    ...singles.map((l) => ({ width: 1, height: 1, matrix: [[l]] })),
    ...pairs.slice(0, mix.across).map((p) => ({ width: 2, height: 1, matrix: [p.split('')] })),
    ...pairs.slice(mix.across).map((p) => ({ width: 1, height: 2, matrix: p.split('').map((c) => [c]) })),
  ]
}

/**
 * Scatter pieces randomly with a one-cell gap between them where possible, so the starting
 * board spells nothing. Returns undefined if they can't all be placed.
 */
export function scatter(
  pieces: Omit<GridPiece, 'id' | 'cell'>[],
  width: number,
  height: number,
  rng: Rng = Math.random,
): Omit<GridPiece, 'id'>[] | undefined {
  for (const gap of [1, 0]) {
    for (let attempt = 0; attempt < (gap ? 400 : 30); attempt++) {
      const taken = Array.from({ length: height }, () => Array<boolean>(width).fill(false))
      const out: Omit<GridPiece, 'id'>[] = []
      const order = [...pieces].sort((a, b) => b.width * b.height - a.width * a.height)
      let ok = true
      for (const p of order) {
        const spots: { x: number; y: number }[] = []
        for (let y = 0; y + p.height <= height; y++)
          for (let x = 0; x + p.width <= width; x++) {
            let free = true
            for (let dy = 0; dy < p.height && free; dy++)
              for (let dx = 0; dx < p.width && free; dx++) free = !taken[y + dy][x + dx]
            if (free) spots.push({ x, y })
          }
        if (!spots.length) {
          ok = false
          break
        }
        const cell = spots[Math.floor(rng() * spots.length)]
        for (let dy = -gap; dy < p.height + gap; dy++)
          for (let dx = -gap; dx < p.width + gap; dx++) {
            const yy = cell.y + dy
            const xx = cell.x + dx
            if (yy >= 0 && xx >= 0 && yy < height && xx < width) taken[yy][xx] = true
          }
        out.push({ ...p, cell })
      }
      if (ok) return out
    }
  }
  return undefined
}

/** Small seeded PRNG so a round can be replayed from a seed. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
