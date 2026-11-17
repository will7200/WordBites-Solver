import React from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { DndProvider } from 'react-dnd-multi-backend'
import { HTML5toTouch } from 'rdndmb-html5-to-touch'
import './index.css'
import store from './app/store'
import App from './app/App'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <DndProvider options={HTML5toTouch}>
        <App />
      </DndProvider>
    </Provider>
  </React.StrictMode>,
)
