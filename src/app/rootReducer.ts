import { combineReducers } from '@reduxjs/toolkit'
import gridDisplayReducer from '../features/grid/gridSlice'

const rootReducer = combineReducers({
  grid: gridDisplayReducer,
})

export default rootReducer
