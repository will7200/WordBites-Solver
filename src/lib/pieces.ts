import type { MatrixDropValues } from '@/features/board/ItemTypes'

export type Orientation = 'horizontal' | 'vertical'

/**
 * Parse free text like "r a c er ni" into pieces. Whitespace or commas separate pieces;
 * multi-letter pieces take the given orientation.
 */
export function parsePieces(text: string, orientation: Orientation): MatrixDropValues[] {
  return text
    .toUpperCase()
    .split(/[\s,]+/)
    .map((t) => t.replace(/[^A-Z]/g, ''))
    .filter(Boolean)
    .map((letters) => {
      const chars = letters.split('')
      return orientation === 'horizontal' || chars.length === 1
        ? { width: chars.length, height: 1, matrix: [chars] }
        : { width: 1, height: chars.length, matrix: chars.map((c) => [c]) }
    })
}
