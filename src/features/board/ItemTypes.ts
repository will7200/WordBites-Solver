const ItemTypes = {
  MATRIX: 'matrix',
} as const

export default ItemTypes

export interface MatrixDropValues {
  id?: string
  width: number
  height: number
  child?: boolean
  matrix: Array<Array<string | null>>
}

export interface DropResult {
  name: string
  cell: { x: number; y: number }
}
