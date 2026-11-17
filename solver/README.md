# solver

Rust/WebAssembly core of Word Bites Solver. `JSSolution` is exported to JavaScript through
`wasm-bindgen`. It is built from a prebuilt FST dictionary (`Uint8Array`) and a board size:

- `solve(tiles)` returns the sorted `string[]` of every word that can be laid out across or down.
  Single tiles and pieces running along the word are used whole, and a piece running across
  can cross the word with one of its letters.
- `start_solve(tiles)` / `step_solve(n)` / `finish_solve()` do the same in steps, for progress.
- `start_layout(tiles, objective, iterations, seed)` / `step_layout(n)` / `best_layout()` search
  for the arrangement that spells the most words (0) or points (1) at once (simulated annealing).
- `contains_all(words)` looks words up in the dictionary.

```sh
wasm-pack build --target web --release   # -> pkg/, consumed by src/words.worker.ts
cargo test
cargo run --release --features cli --bin build-dict -- ../public/dict name=words.txt   # or: npm run dict
```
