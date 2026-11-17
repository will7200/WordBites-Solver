export type SortOrder = 'length' | 'alpha'

export const ALL = 'ALL'
export const LETTERS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))

/** Longest first (ties alphabetical), or plain alphabetical. */
export function sortWords(words: string[], order: SortOrder): string[] {
  const sorted = [...words]
  if (order === 'length') sorted.sort((a, b) => b.length - a.length || a.localeCompare(b))
  else sorted.sort((a, b) => a.localeCompare(b))
  return sorted
}

/** Bucket words by their first letter (upper-cased), plus an `ALL` bucket. */
export function groupWords(words: string[], order: SortOrder): Record<string, string[]> {
  const groups: Record<string, string[]> = { [ALL]: sortWords(words, order) }
  for (const l of LETTERS) groups[l] = []
  for (const w of groups[ALL]) groups[w[0].toUpperCase()]?.push(w)
  return groups
}
