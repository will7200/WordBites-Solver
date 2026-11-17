# Word Bites Solver

Solver for the Word Bites game in GamePigeon. Lay out the tiles from your game and it
lists every word you can make, longest first.

Play with it at https://will7200.github.io/WordBites-Solver

The UI is React + Redux Toolkit with shadcn/ui and Tailwind, built with Vite. Solving runs in a Web Worker in a
Rust → WebAssembly module (`solver/`) that checks letter permutations against a bloom-filter
dictionary. Notes on the approach are in [RESEARCH.md](RESEARCH.md).

## Using it

- Pick a dictionary and board size in the header.
- Under **Add pieces**, type your pieces separated by spaces (e.g. `r a c er ni`), choose
  whether multi-letter pieces go **Across** or **Down**, and press Enter. They're placed on
  the board automatically; you can also drag a piece from the tray to a specific spot.
- Drag tiles on the board to move them. To remove one, hover it and click the red ×, or
  double-click it. **Reset board** clears everything (with undo).
- **How it works** in the header explains the controls; it opens automatically on first visit.
- Words update automatically, longest first. Filter by text or first letter, or switch to
  A–Z. Click a word and the board rearranges to spell it; any valid word on the board glows.

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
