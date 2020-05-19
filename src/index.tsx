import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import { Provider } from 'react-redux';
import { DndProvider } from 'react-dnd';
import Backend from 'react-dnd-html5-backend';

import store from './app/store';

const render = () => {
    const App = require('./app/App').default;

    ReactDOM.render(
        <Provider store={store}>
            <DndProvider backend={Backend}>
                <React.StrictMode>
                    <App/>
                </React.StrictMode>
            </DndProvider>
        </Provider>,
        document.getElementById('root')
    )
}

render()


// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA

if (process.env.NODE_ENV === 'development' && module.hot) {
    module.hot.accept('./app/App', render)
}
