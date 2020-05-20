import * as wordSolver from '../solver/Cargo.toml';

let bloomdata = undefined;
let solver = undefined;
let widthG = 8;
let heightG = 9;

let ready_count = 0;

function update_count() {
    ready_count += 1;
    if (ready_count === 1) {
        self.postMessage({type: 'announcment', message: 'ready'})
        solver = new wordSolver.JSSolution(widthG, heightG, 1, bloomdata)
    }
}

const wordsWorker = pieces => {
    if ((pieces.length === 0)) {
        throw Error("empty")
    }
    return solver.solve(pieces)
}

fetch('/bloomfilter_alot.dat').then(data => {
    return data.text();
}).then(data => {
    bloomdata = data;
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
        case "set_board_size":
            const {width, height} = data;
            widthG = width;
            heightG = height;
            if (bloomdata) {
                solver = new wordSolver.JSSolution(widthG, heightG, 1, bloomdata)
                self.postMessage({type: 'announcment', message: 'ready'})
            }
            return
        case "set_filter_data":
            ready_count = 0;
            fetch(`/bloomfilter_${data}.dat`).then(data => {
                return data.text();
            }).then(data => {
                bloomdata = data;
                solver = new wordSolver.JSSolution(widthG, heightG, 1, bloomdata)
                self.postMessage({type: 'result', data: 'done', id});
            }).catch(err => {
                console.log(err)
            })
            return
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


