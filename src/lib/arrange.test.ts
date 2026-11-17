import reducer, { addPiece, GridPiece, restorePieces } from '@/features/grid/gridSlice'
import { arrangeWord, boardRuns } from './arrange'

let n = 0
const piece = (letters: string, dir: 'h' | 'v' = 'h'): GridPiece => {
  const c = letters.toUpperCase().split('')
  return dir === 'h' || c.length === 1
    ? { id: `p${n++}`, width: c.length, height: 1, matrix: [c], cell: { x: 0, y: 0 } }
    : { id: `p${n++}`, width: 1, height: c.length, matrix: c.map((l) => [l]), cell: { x: 0, y: 0 } }
}

function boardFrom(pieces: GridPiece[], w = 8, h = 9) {
  let s = reducer(undefined, { type: 'init' })
  s = { ...s, width: w, height: h }
  return reducer(s, restorePieces(pieces))
}

test('arranges a word from singles and a wide piece, all pieces stay on the board', () => {
  const pieces = [piece('r'), piece('ac'), piece('er'), piece('x'), piece('ni', 'v')]
  const a = arrangeWord('racer', pieces, 8, 9)!
  expect(a).toBeDefined()
  expect(a.pieces).toHaveLength(5)
  const s = boardFrom(a.pieces)
  expect(s.pieces).toHaveLength(5) // none dropped for being out of bounds
  const runs = boardRuns(s.grid).map((r) => r.word)
  expect(runs).toContain('RACER')
  // spare pieces must not touch the word
  expect(runs.filter((r) => r.includes('RACER'))).toEqual(['RACER'])
})

test('a tall piece can cross a horizontal word', () => {
  const pieces = [piece('c'), piece('ha', 'v'), piece('t')]
  const a = arrangeWord('cat', pieces, 8, 9)!
  expect(a.axis).toBe('horizontal')
  expect(boardRuns(boardFrom(a.pieces).grid).map((r) => r.word)).toContain('CAT')
})

test('falls back to vertical when the word only works down', () => {
  const pieces = [piece('ca', 'v'), piece('t')]
  const a = arrangeWord('cat', pieces, 8, 9)!
  expect(a.axis).toBe('vertical')
})

test('returns undefined when the pieces cannot spell it', () => {
  expect(arrangeWord('dog', [piece('c'), piece('a'), piece('t')], 8, 9)).toBeUndefined()
})

test('boardRuns finds row and column runs', () => {
  let s = reducer(undefined, { type: 'init' })
  s = reducer(s, addPiece({ width: 3, height: 1, matrix: [['C', 'A', 'T']], cell: { x: 0, y: 0 } }))
  s = reducer(s, addPiece({ width: 1, height: 2, matrix: [['R'], ['E']], cell: { x: 1, y: 1 } }))
  expect(boardRuns(s.grid).map((r) => r.word).sort()).toEqual(['ARE', 'CAT'])
})
