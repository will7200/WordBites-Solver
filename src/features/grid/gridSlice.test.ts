import reducer, { addPiece, canDropIntoCell, movePiece, removePiece, setGridSize } from './gridSlice'

const start = () => reducer(undefined, { type: 'init' })

test('add, move and remove a piece', () => {
  let s = reducer(start(), addPiece({ width: 2, height: 1, matrix: [['A', 'B']], cell: { x: 0, y: 0 } }))
  expect(s.grid[0].slice(0, 3)).toEqual(['A', 'B', null])
  const id = s.pieces[0].id
  s = reducer(s, movePiece({ id, toCell: { x: 1, y: 0 } }))
  expect(s.grid[0].slice(0, 3)).toEqual([null, 'A', 'B'])
  s = reducer(s, removePiece({ id }))
  expect(s.grid.flat().every((c) => c === null)).toBe(true)
  expect(s.pieces).toHaveLength(0)
})

test('rows are independent after resize', () => {
  let s = reducer(start(), setGridSize({ width: 4, height: 4 }))
  s = reducer(s, addPiece({ width: 1, height: 1, matrix: [['Z']], cell: { x: 0, y: 0 } }))
  expect(s.grid[1][0]).toBeNull()
})

test('a piece may be moved onto cells it currently occupies', () => {
  const s = reducer(start(), addPiece({ width: 3, height: 1, matrix: [['A', 'B', 'C']], cell: { x: 0, y: 0 } }))
  const piece = s.pieces[0]
  expect(canDropIntoCell(s, piece, { cell: { x: 1, y: 0 } })).toBe(true)
  expect(canDropIntoCell(s, { ...piece, id: undefined }, { cell: { x: 1, y: 0 } })).toBe(false)
})
