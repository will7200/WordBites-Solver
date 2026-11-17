import { decodeBoard, encodeBoard } from './boardCodec'

test('round-trips a board', () => {
  const b = {
    width: 8,
    height: 9,
    pieces: [
      { width: 1, height: 1, matrix: [['R']], cell: { x: 0, y: 0 } },
      { width: 2, height: 1, matrix: [['A', 'C']], cell: { x: 2, y: 0 } },
      { width: 1, height: 2, matrix: [['N'], ['I']], cell: { x: 4, y: 1 } },
    ],
  }
  const s = encodeBoard(b)
  expect(s).toBe('8x9~r.0.0~ac.2.0~ni.4.1.v')
  expect(decodeBoard(s)).toEqual(b)
})

test('rejects garbage', () => {
  expect(decodeBoard('nope')).toBeUndefined()
  expect(decodeBoard('8x9~R!.0.0')).toBeUndefined()
  expect(decodeBoard('99x9')).toBeUndefined()
})
