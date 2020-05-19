import * as wordSolver from '../solver/Cargo.toml';
import trie from 'trie-prefix-tree';

let bloomdata = undefined;
let mytrie = trie([]);

let ready_count = 0;

function update_count() {
    ready_count += 1;
    if (ready_count === 2) {
        self.postMessage({type: 'announcment', message: 'ready'})
    }
}

const wordsWorker = pieces => {
    if ((pieces.length === 0) || (pieces === undefined)) {
        throw Error("empty")
    }
    const solver = new wordSolver.JSSolution(8, 9, 1, bloomdata)

    const actual = solver.solve(pieces)
    // console.log(actual.filter(x => mytrie.hasWord(x.word)).length, actual.length)
    // return actual.filter(x => mytrie.hasWord(x.word))
    return actual
}

fetch('/bloomfilter.dat').then(data => {
    return data.text();
}).then(data => {
    bloomdata = data;
    update_count();
}).catch(err => {
    console.log(err)
})
fetch('/words_alpha.txt').then(data => {
    return data.text();
}).then(data => {
    let d = data.split("\r\n")
    d.forEach(x => mytrie.addWord(x))
    update_count();
}).catch(err => {
    console.log(err)
})

self.onmessage = async (e) => {
    let r = null;
    let message = e.data;
    let id = message[0];
    let method = message[1];
    let data = message[2];
    switch (method) {
        case "solve":
            r = wordsWorker
            break;
        default:
            self.postMessage({type: 'error', error: 'Unknown call to method: ' + method, id})
            return
    }
    try {
        self.postMessage({type: 'result', data: await r(data), id});
    } catch (e) {
        self.postMessage({type: 'error', error: e.message, id})
    }
};


