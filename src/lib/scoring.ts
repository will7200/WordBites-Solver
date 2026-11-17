/**
 * GamePigeon Word Bites points per word length (3–9 letters; 9 is the most an 8×9 board fits).
 * GamePigeon doesn't publish rules; this table matches independent open-source Word Bites
 * bots (Iden5347/gamepigeon `bites.py`, condyl/word-games-bot `config.py`).
 * Longer words (bigger custom boards) continue at +400 per letter.
 */
export const POINTS: Record<number, number> = {
  3: 100,
  4: 400,
  5: 800,
  6: 1400,
  7: 1800,
  8: 2200,
  9: 2600,
}

export function wordPoints(word: string): number {
  const n = word.length
  if (n < 3) return 0
  if (POINTS[n] !== undefined) return POINTS[n]
  const lengths = Object.keys(POINTS).map(Number).sort((a, b) => a - b)
  const max = lengths[lengths.length - 1]
  const step = POINTS[max] - POINTS[max - 1]
  return POINTS[max] + (n - max) * step
}

export const totalPoints = (words: Iterable<string>) => {
  let t = 0
  for (const w of words) t += wordPoints(w)
  return t
}

export const formatPoints = (n: number) => n.toLocaleString()
