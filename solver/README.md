# solver

Rust/WebAssembly core of Word Bites Solver. `JSSolution` is exported to JavaScript through
`wasm-bindgen`. It takes the board size, a minimum piece count, and a serialized bloom filter,
and `solve(tiles)` returns `{ word }[]`.

```sh
wasm-pack build --target web --release   # -> pkg/, consumed by src/words.worker.ts
cargo test
cargo run --release --bin build-filter -- words.txt out.dat
```
