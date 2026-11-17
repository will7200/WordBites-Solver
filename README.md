# Word Bites Solver

Solver for the Word Bites game in GamePigeon. Lay out the tiles from your game and it
lists every word you can make, longest first.

Play with it at https://will7200.github.io/WordBites-Solver

The UI is React + Redux Toolkit, built with Vite. Solving runs in a Web Worker in a
Rust → WebAssembly module (`solver/`) that checks letter permutations against a bloom-filter
dictionary. Notes on the approach are in [RESEARCH.md](RESEARCH.md).

## Using it

- Set the board size and the dictionary under **Grid Controls**.
- In **Creator**, choose the piece size, type its letters, and drag it onto the grid.
  Right-click a tile on the grid to remove it.
- Words are listed under **Words**. Sort them **Longest first** or **A → Z**, and filter
  by first letter or show **All**. Drag the bottom edge of the panel to make it taller.

## Development

Requirements: Node 22.12+, Rust stable with the `wasm32-unknown-unknown` target, and
[`wasm-pack`](https://rustwasm.github.io/wasm-pack/).

```sh
rustup target add wasm32-unknown-unknown
npm ci
npm run dev      # builds the wasm package, then starts the Vite dev server
npm test         # frontend unit tests (Vitest)
npm run build    # production build into ./build
(cd solver && cargo test)
```

Pushes to `master` are built and deployed to GitHub Pages by
[`.github/workflows/ci.yml`](.github/workflows/ci.yml).

### Dictionaries

`public/bloomfilter_*.dat` are bloom filters (base64 of bincode-serialized
`probabilistic-collections` 0.7 `BloomFilter<String>`). To build one from a word list:

```sh
cd solver
cargo run --release --bin build-filter -- words.txt ../public/bloomfilter_custom.dat
```

Then add it to the dictionary options in `src/features/gridControls/GridControls.tsx`.
