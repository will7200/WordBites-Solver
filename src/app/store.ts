import { configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'
import rootReducer from './rootReducer'
import { decodeBoard, encodeBoard } from '@/lib/boardCodec'
import { boardFromSaved } from '@/features/grid/gridSlice'

const STORAGE_KEY = 'wb-board'

/** A board from the URL (#b=...) wins over the one saved locally. */
function loadBoard() {
  try {
    const fromUrl = new URLSearchParams(location.hash.slice(1)).get('b')
    const encoded = fromUrl ?? localStorage.getItem(STORAGE_KEY)
    const saved = encoded ? decodeBoard(encoded) : undefined
    return saved ? { grid: boardFromSaved(saved) } : undefined
  } catch {
    return undefined
  }
}

const store = configureStore({ reducer: rootReducer, preloadedState: loadBoard() })

let last = ''
let persist = true
/** Practice rounds use the same board but shouldn't overwrite the saved solver board. */
export const setBoardPersistence = (on: boolean) => {
  persist = on
}
store.subscribe(() => {
  if (!persist) return
  const { width, height, pieces } = store.getState().grid
  const encoded = encodeBoard({ width, height, pieces })
  if (encoded === last) return
  last = encoded
  try {
    localStorage.setItem(STORAGE_KEY, encoded)
  } catch {
    /* storage full or disabled */
  }
})

export type AppDispatch = typeof store.dispatch
export type RootState = ReturnType<typeof store.getState>
export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()

export default store
