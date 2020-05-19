import { configureStore, Action, getDefaultMiddleware } from '@reduxjs/toolkit'
import { ThunkAction } from 'redux-thunk'
// We'll use redux-logger just as an example of adding another middleware
import logger from 'redux-logger'

import rootReducer, { RootState } from './rootReducer'

const store = configureStore({
    reducer: rootReducer,
    middleware: [...getDefaultMiddleware(), logger]
})

if (process.env.NODE_ENV === 'development' && module.hot) {
    module.hot.accept('./rootReducer', () => {
        const newRootReducer = require('./rootReducer').default
        store.replaceReducer(newRootReducer)
    })
}

export type AppDispatch = typeof store.dispatch

export type AppThunk = ThunkAction<void, RootState, unknown, Action<string>>

export default store
