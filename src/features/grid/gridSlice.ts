import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { MatrixDropValues } from "../board/ItemTypes";
import { containsAnything2d, countNulls2d } from "../../utils/array";
import { nanoid } from '../../nanoid';

interface GridSliceType {
    height: number
    width: number
    grid: Array<Array<string | null>>
}

interface Cell {
    x: number
    y: number
}

type GridPiece = Omit<GridSliceType, 'grid'> &
    { cell: Cell, matrix: Array<Array<string | null>>, id: string }
type GridState = GridSliceType & { pieces: Array<GridPiece> }


let initialState: GridState = {
    width: 8,
    height: 9,
    grid: new Array(9).fill(new Array(8).fill(null)),
    pieces: new Array(0)
}

export function canDropIntoCell(gridState: GridState, mdv: MatrixDropValues, dropTarget: { cell: Cell }) {
    if (countNulls2d(mdv.matrix) > 0) {
        return false
    }
    if ((mdv.height > (gridState.height / 2)) || (mdv.width > (gridState.width / 2))) {
        return false
    }
    if (((dropTarget.cell.x + mdv.width) > (gridState.width)) || ((dropTarget.cell.y + mdv.height) > (gridState.height))) {
        return false
    }
    if (containsAnything2d(gridState.grid, {...dropTarget.cell, width: mdv.width, height: mdv.height})) {
        return false
    }
    return true
}

const issuesDisplaySlice = createSlice({
    name: 'grid',
    initialState,
    reducers: {
        setGridSize(state, action: PayloadAction<GridSliceType>) {
            const {width, height} = action.payload;
            state.width = width
            state.height = height
            state.grid = new Array(height).fill(new Array(width).fill(null))
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
        removePiece(state, action: PayloadAction<Pick<GridPiece, 'id'>>) {
            const piece = state.pieces.find(x => x.id === action.payload.id)!
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
    removePiece
} = issuesDisplaySlice.actions

export default issuesDisplaySlice.reducer