export interface PieceInput {
  letters: string
  width: number
  height: number
}

export interface SolvedWord {
  word: string
}

export type Request =
  | { id: string; method: 'solve'; data: PieceInput[] }
  | { id: string; method: 'set_board_size'; data: { width: number; height: number } }
  | { id: string; method: 'set_filter_data'; data: string }

export type Response =
  | { type: 'ready' }
  | { type: 'fatal'; error: string }
  | { type: 'result'; id: string; data: unknown }
  | { type: 'error'; id: string; error: string }
