# Word Bites Solver

Solver for the Word Bites game in GamePigeon. Lay out the tiles from your game and it
lists every word you can make, longest first.

Play with it at https://will7200.github.io/WordBites-Solver

The UI is React + Redux Toolkit with shadcn/ui and Tailwind, built with Vite. Solving runs in a Web Worker in a
Rust → WebAssembly module (`solver/`) that searches a compact dictionary index, dropping any
prefix no word starts with. Notes on the approach are in [RESEARCH.md](RESEARCH.md).

## Using it

- Pick a dictionary and board size in the header.
- Under **Add pieces**, type your pieces separated by spaces (e.g. `r a c er ni`), choose
  whether multi-letter pieces go **Across** or **Down**, and press Enter. They're placed on
  the board automatically; you can also drag a piece from the tray to a specific spot.
- Drag tiles on the board to move them. To remove one, hover it and click the red ×, or
  double-click it. **Reset board** clears everything (with undo).
- **How it works** in the header explains the controls; it opens automatically on first visit.
- Each word shows its GamePigeon points (3 letters = 100 … 9 letters = 2,600). Click a word,
  then **Mark played** to track your score; played words move to the bottom.
- **Best layout** rearranges every piece to spell as many words (or points) at once as
  possible, using a randomized search in the Rust solver. **On board** in the word list
  shows the words the board spells right now.
- **Share** copies a link to the current board; the board and dictionary are also remembered
  between visits.
- **Practice** mode deals a random 8×9 board with an 80-second timer. Drag tiles to spell
  words; each new word scores once. When time runs out you see every word you missed.
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

Source word lists live in `dictionaries/<name>.txt` (sorted, lowercase a–z, 3+ letters).
`npm run dict` turns each into a prebuilt [`fst`](https://docs.rs/fst) set,
`public/dict/<name>.fst.gz`, plus `public/dict/index.json`. They're gzipped ahead of time
because static hosts like GitHub Pages don't compress binary files. The worker downloads and
decompresses one, and the solver uses it directly with no build step. The solver walks the set
letter by letter, so it drops any prefix no word starts with.

Words must have 3+ letters and combine at least two pieces.

Sources: `alot` is [dwyl/english-words](https://github.com/dwyl/english-words) `words_alpha.txt`.
`enable1`, `ospd`, `popular` and `unix_words` come from [dolph/dictionary](https://github.com/dolph/dictionary).

To add a dictionary, put its word list in `dictionaries/`, add it to the `dict` script in
`package.json` and to `DICTIONARIES` in `src/features/header/Header.tsx`, then run `npm run dict`.
