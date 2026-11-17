import { ALL, groupWords, sortWords } from './groupWords'

test('sorts longest to shortest, ties alphabetical', () => {
  expect(sortWords(['cat', 'races', 'act', 'racer', 'care'], 'length')).toEqual([
    'racer',
    'races',
    'care',
    'act',
    'cat',
  ])
})

test('sorts alphabetically', () => {
  expect(sortWords(['cat', 'act', 'care'], 'alpha')).toEqual(['act', 'care', 'cat'])
})

test('groups by first letter and keeps an ALL bucket', () => {
  const g = groupWords(['cat', 'act', 'care'], 'length')
  expect(g[ALL]).toEqual(['care', 'act', 'cat'])
  expect(g.C).toEqual(['care', 'cat'])
  expect(g.A).toEqual(['act'])
  expect(g.Z).toEqual([])
})
