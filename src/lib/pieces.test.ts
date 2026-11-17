import { parsePieces } from './pieces'

test('parses singles and multi-letter pieces', () => {
  expect(parsePieces('r a, er', 'horizontal')).toEqual([
    { width: 1, height: 1, matrix: [['R']] },
    { width: 1, height: 1, matrix: [['A']] },
    { width: 2, height: 1, matrix: [['E', 'R']] },
  ])
})

test('vertical pieces are one column', () => {
  expect(parsePieces('ni', 'vertical')).toEqual([{ width: 1, height: 2, matrix: [['N'], ['I']] }])
})

test('ignores junk', () => {
  expect(parsePieces('  1 ! ', 'horizontal')).toEqual([])
})
