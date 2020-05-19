import React from "react";
import { nanoid } from "../nanoid";

interface WordSolverType {
    solve: (pieces: Array<any>) => Promise<Array<{word: string}>>
}

export const WordSolverContext = new React.createContext<WordSolverType>(undefined);

const resolves: Record<string, any> = {}
const rejects: Record<string, any> = {}

export default class WordSolver extends React.Component<any, any> {
    worker: Worker | null = null;
    ready = false;
    state = {};

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
        return new Promise((resolve, reject) => {
            if (!this.check()) {
                reject("worker not ready")
            }
            const id = nanoid()
            resolves[id] = resolve
            rejects[id] = reject
            this.worker!.postMessage([id, 'solve', pieces])
        })
    }

    render() {
        const context = {
            solve: this.solve
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