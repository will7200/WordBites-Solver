export interface PieceInput {
  letters: string
  width: number
  height: number
}

export type Request =
  | { id: string; method: 'solve'; data: PieceInput[] }
  | { id: string; method: 'set_board_size'; data: { width: number; height: number } }
  | { id: string; method: 'set_filter_data'; data: string }
  | { id: string; method: 'check_words'; data: string[] }

export type Phase = 'download' | 'build' | 'solve'

export type Response =
  | { type: 'ready'; dictionary: string; words: number }
  | { type: 'fatal'; error: string }
  | { type: 'progress'; id?: string; phase: Phase; done: number; total: number }
  | { type: 'result'; id: string; data: unknown }
  | { type: 'error'; id: string; error: string }
