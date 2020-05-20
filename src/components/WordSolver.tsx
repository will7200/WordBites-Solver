import React from "react";
import { nanoid } from "../nanoid";

interface WordSolverType {
    solve: (pieces: Array<any>) => [string, Promise<Array<{ word: string }>>];
    set_board_size: (width: number, height: number) => Promise<any>;
    // State is maintained in the provider
    set_filter_data: (type: string) => void;
    // Given an ID reject promise if present
    terminate: (id?: string) => void;
    dictionary: string;
}

export const WordSolverContext = new React.createContext<WordSolverType>(undefined);

const resolves: Record<string, any> = {}
const rejects: Record<string, any> = {}

export default class WordSolver extends React.Component<any, any> {
    worker: Worker | null = null;
    ready = false;
    state = {
        dictionary: 'alot',
    };

    componentDidMount() {
        this.worker = new Worker('../words.worker.js');
        this.worker.onmessage = this.handleMessage;
    }

    handleMessage = (m: any) => {
        const {id, data, type, error, message} = m.data;
        if (id) {
            if (data) {
                const resolve = resolves[id]
                if (resolve) {
                    resolve(data)
                }
            } else {
                // error condition
                const reject = rejects[id]
                if (reject) {
                    if (error) {
                        reject(error)
                    } else {
                        reject('Got nothing')
                    }
                }
            }
            // purge used callbacks
            delete resolves[id]
            delete rejects[id]
        }
        if (type === 'announcment') {
            if (message === 'ready') {
                this.ready = true
            }
        }
    }

    check = () => {
        return this.ready && this.worker !== null
    }

    solve = (pieces: Array<any>) => {
        const id = nanoid()
        return [id, new Promise((resolve, reject) => {
            if (!this.check()) {
                setTimeout(() => reject("worker not ready"), 100)
            }
            resolves[id] = resolve
            rejects[id] = reject
            this.worker!.postMessage([id, 'solve', pieces])
        })]
    }

    terminate = (id: string) => {
        console.log('closing', id)
        const reject = rejects[id]
        if (reject) {
            reject('worker terminated')
            // purge used callbacks
            delete resolves[id]
            delete rejects[id]
        }
        if (this.worker) {
            this.worker.terminate();
            this.ready = false;
        }
        this.worker = new Worker('../words.worker.js');
        this.worker.onmessage = this.handleMessage;
    }

    set_board_size = (width: number, height: number) => {
        return new Promise((resolve, reject) => {
            const id = nanoid()
            if (!this.check()) {
                setTimeout(() => reject("worker not ready"), 100)
            }
            this.ready = false;
            resolves[id] = resolve
            rejects[id] = reject
            this.worker!.postMessage([id, 'set_board_size', {width, height}])
        })
    }

    set_filter_data = (type: string) => {
        new Promise((resolve, reject) => {
            const id = nanoid()
            if (!this.check()) {
                setTimeout(() => reject("worker not ready"), 100)
            }
            this.ready = false;
            resolves[id] = resolve
            rejects[id] = reject
            this.worker!.postMessage([id, 'set_filter_data', type])
        }).then(r => {
            this.setState({dictionary: type})
        }).catch(e => {
            console.log(e)
        })
    }

    render() {
        const context = {
            solve: this.solve,
            terminate: this.terminate,
            set_board_size: this.set_board_size,
            dictionary: this.state.dictionary,
            set_filter_data: this.set_filter_data,
        };
        return (
            <WordSolverContext.Provider value={context}>
                {this.props.children}
            </WordSolverContext.Provider>
        )
    }
}

export const useWordSolver = (): WordSolverType => {
    return React.useContext(WordSolverContext)
};

export const withWordSolver = (Component) => {
    function WrappedComponent(props) {
        const wordSolver = useWordSolver();
        return <Component wordSolver={wordSolver} {...props}/>
    }

    return WrappedComponent
};