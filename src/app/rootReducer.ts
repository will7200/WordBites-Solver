import { combineReducers } from '@reduxjs/toolkit'
import gridDisplayReducer from '../features/grid/gridSlice'

const rootReducer = combineReducers({
    grid: gridDisplayReducer
})

export type RootState = ReturnType<typeof rootReducer>

export default rootReducer