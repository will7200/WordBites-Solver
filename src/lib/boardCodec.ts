import type { GridPiece } from '@/features/grid/gridSlice'

export interface SavedBoard {
  width: number
  height: number
  pieces: Omit<GridPiece, 'id'>[]
}

/**
 * Compact, URL-safe board encoding: `8x9~r.0.0~ac.2.0~ni.4.1.v`
 * (letters.x.y, with `.v` for vertical multi-letter pieces).
 */
export function encodeBoard(b: SavedBoard): string {
  const parts = b.pieces.map((p) => {
    const letters = p.matrix.flat().join('').toLowerCase()
    return `${letters}.${p.cell.x}.${p.cell.y}${p.height > 1 ? '.v' : ''}`
  })
  return [`${b.width}x${b.height}`, ...parts].join('~')
}

export function decodeBoard(s: string): SavedBoard | undefined {
  const [size, ...parts] = s.split('~')
  const m = /^(\d{1,2})x(\d{1,2})$/.exec(size ?? '')
  if (!m) return undefined
  const width = Number(m[1])
  const height = Number(m[2])
  if (width < 2 || height < 2 || width > 10 || height > 10) return undefined
  const pieces: SavedBoard['pieces'] = []
  for (const part of parts) {
    const pm = /^([a-z]{1,10})\.(\d{1,2})\.(\d{1,2})(\.v)?$/.exec(part)
    if (!pm) return undefined
    const letters = pm[1].toUpperCase().split('')
    const vertical = !!pm[4] && letters.length > 1
    pieces.push({
      width: vertical ? 1 : letters.length,
      height: vertical ? letters.length : 1,
      matrix: vertical ? letters.map((l) => [l]) : [letters],
      cell: { x: Number(pm[2]), y: Number(pm[3]) },
    })
  }
  return { width, height, pieces }
}
