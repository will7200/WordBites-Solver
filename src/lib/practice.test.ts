import { boardRuns } from './arrange'
import { boardFromSaved } from '@/features/grid/gridSlice'
import { mulberry32, PIECE_MIX, randomPieces, scatter } from './practice'

test('random pieces follow the mix', () => {
  const p = randomPieces(mulberry32(1))
  expect(p).toHaveLength(PIECE_MIX.singles + PIECE_MIX.across + PIECE_MIX.down)
  expect(p.filter((x) => x.width === 2)).toHaveLength(PIECE_MIX.across)
  expect(p.filter((x) => x.height === 2)).toHaveLength(PIECE_MIX.down)
})

test('scatter places every piece without overlaps and without 3+ letter runs', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const rng = mulberry32(seed)
    const placed = scatter(randomPieces(rng), 8, 9, rng)!
    expect(placed).toBeDefined()
    const state = boardFromSaved({ width: 8, height: 9, pieces: placed })
    expect(state.pieces).toHaveLength(placed.length)
    expect(boardRuns(state.grid).filter((r) => r.word.length >= 3)).toEqual([])
  }
})

test('no letter appears more than twice among singles', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const singles = randomPieces(mulberry32(seed)).filter((p) => p.width === 1 && p.height === 1).map((p) => p.matrix[0][0]!)
    const counts = singles.reduce<Record<string, number>>((m, l) => ((m[l] = (m[l] ?? 0) + 1), m), {})
    expect(Math.max(...Object.values(counts))).toBeLessThanOrEqual(2)
  }
})
