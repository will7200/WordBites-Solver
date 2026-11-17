import { totalPoints, wordPoints } from './scoring'

test('points by length', () => {
  expect(wordPoints('at')).toBe(0)
  expect(wordPoints('cat')).toBe(100)
  expect(wordPoints('cats')).toBe(400)
  expect(totalPoints(['cat', 'cats'])).toBe(500)
})

test('longer words extrapolate and keep increasing', () => {
  const nine = wordPoints('abcdefghi')
  const ten = wordPoints('abcdefghij')
  expect(nine).toBeGreaterThan(wordPoints('abcdefgh'))
  expect(ten).toBeGreaterThan(nine)
})
