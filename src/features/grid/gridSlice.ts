import { createSlice, nanoid, PayloadAction } from '@reduxjs/toolkit'
import { MatrixDropValues } from "../board/ItemTypes";
import { containsAnything2d, countNulls2d } from "../../utils/array";

interface GridSliceType {
    height: number
    width: number
    grid: Array<Array<string | null>>
}

interface Cell {
    x: number
    y: number
}

export type GridPiece = Omit<GridSliceType, 'grid'> &
    { cell: Cell, matrix: Array<Array<string | null>>, id: string }
export type GridState = GridSliceType & { pieces: Array<GridPiece> }


const emptyGrid = (width: number, height: number) =>
    Array.from({length: height}, () => Array<string | null>(width).fill(null))

const initialState: GridState = {
    width: 8,
    height: 9,
    grid: emptyGrid(8, 9),
    pieces: new Array(0)
}

export function pieceAt(gridState: GridState, x: number, y: number): GridPiece | undefined {
    return gridState.pieces.find(p => p.cell.x <= x && x < p.cell.x + p.width && p.cell.y <= y && y < p.cell.y + p.height)
}

export function canDropIntoCell(gridState: GridState, mdv: MatrixDropValues, dropTarget: { cell: Cell }) {
    if (countNulls2d(mdv.matrix) > 0) {
        return false
    }
    if (((dropTarget.cell.x + mdv.width) > (gridState.width)) || ((dropTarget.cell.y + mdv.height) > (gridState.height))) {
        return false
    }
    // When moving an existing piece, its current cells don't count as occupied.
    const grid = mdv.id === undefined ? gridState.grid : gridState.grid.map((row, y) =>
        row.map((v, x) => pieceAt(gridState, x, y)?.id === mdv.id ? null : v))
    if (containsAnything2d(grid, {...dropTarget.cell, width: mdv.width, height: mdv.height})) {
        return false
    }
    return true
}

/** First top-left cell (row-major) where the piece fits, if any. */
export function findFreeCell(gridState: GridState, mdv: MatrixDropValues): Cell | undefined {
    for (let y = 0; y < gridState.height; y++) {
        for (let x = 0; x < gridState.width; x++) {
            if (canDropIntoCell(gridState, mdv, {cell: {x, y}})) {
                return {x, y}
            }
        }
    }
    return undefined
}

/** Build a grid state from a saved board, dropping pieces that overlap or don't fit. */
export function boardFromSaved(saved: { width: number; height: number; pieces: Omit<GridPiece, 'id'>[] }): GridState {
    let state: GridState = {width: saved.width, height: saved.height, grid: emptyGrid(saved.width, saved.height), pieces: []}
    for (const p of saved.pieces) {
        if (canDropIntoCell(state, p, {cell: p.cell})) {
            state = issuesDisplaySlice.reducer(state, issuesDisplaySlice.actions.addPiece(p))
        }
    }
    return state
}

const issuesDisplaySlice = createSlice({
    name: 'grid',
    initialState,
    reducers: {
        setGridSize(state, action: PayloadAction<Omit<GridSliceType, 'grid'>>) {
            const {width, height} = action.payload;
            state.width = width
            state.height = height
            state.grid = emptyGrid(width, height)
            state.pieces = []
        },
        addPiece(state, action: PayloadAction<Omit<GridPiece, 'id'>>) {
            const {width, height, matrix, cell} = action.payload
            for (let i = cell.x; i < (cell.x + width); i++) {
                for (let j = cell.y; j < (cell.y + height); j++) {
                    state.grid[j][i] = matrix[j - cell.y][i - cell.x]
                }
            }
            state.pieces.push({...action.payload, cell: cell, id: nanoid(6)})
        },
        movePiece(state, action: PayloadAction<Pick<GridPiece, 'id'> & { toCell: Cell }>) {
            const {id, toCell} = action.payload
            const piece = state.pieces.find(x => x.id === id)
            if (!piece) {
                throw Error("unknown piece")
            }
            const {width, height, matrix} = piece;
            const oldCell = piece.cell;
            for (let i = oldCell.x; i < (oldCell.x + width); i++) {
                for (let j = oldCell.y; j < (oldCell.y + height); j++) {
                    state.grid[j][i] = null
                }
            }

            for (let i = toCell.x; i < (toCell.x + width); i++) {
                for (let j = toCell.y; j < (toCell.y + height); j++) {
                    state.grid[j][i] = matrix[j - toCell.y][i - toCell.x]
                }
            }
            piece.cell = toCell;
        },
        /** Restore a previous set of pieces (used for undo). */
        restorePieces(state, action: PayloadAction<GridPiece[]>) {
            state.grid = emptyGrid(state.width, state.height)
            state.pieces = []
            for (const p of action.payload) {
                if (p.cell.x + p.width > state.width || p.cell.y + p.height > state.height) continue
                for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++) state.grid[p.cell.y + y][p.cell.x + x] = p.matrix[y][x]
                state.pieces.push(p)
            }
        },
        clearBoard(state) {
            state.grid = emptyGrid(state.width, state.height)
            state.pieces = []
        },
        removePiece(state, action: PayloadAction<Pick<GridPiece, 'id'>>) {
            const piece = state.pieces.find(x => x.id === action.payload.id)
            if (!piece) {
                return
            }
            const {width, height} = piece;
            const oldCell = piece.cell;
            for (let i = oldCell.x; i < (oldCell.x + width); i++) {
                for (let j = oldCell.y; j < (oldCell.y + height); j++) {
                    state.grid[j][i] = null
                }
            }
            state.pieces = state.pieces.filter(x => x.id !== action.payload.id)
        }
    }
})

export const {
    setGridSize,
    addPiece,
    movePiece,
    removePiece,
    clearBoard,
    restorePieces
} = issuesDisplaySlice.actions

export default issuesDisplaySlice.reducer