use std::collections::BTreeSet;

use probabilistic_collections::bloom::BloomFilter;
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

use crate::iter::build_iterator;

/// Word Bites never accepts words shorter than this; the dictionaries only contain 3+ letter words.
pub const MIN_WORD_LETTERS: usize = 3;

#[derive(Serialize, Debug, Clone, Eq, PartialEq, Ord, PartialOrd, Hash)]
pub struct WordSolution {
    pub word: String,
}

#[wasm_bindgen]
#[derive(Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum Orientation {
    Horizontal,
    Vertical,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Tile {
    pub letters: String,
    pub width: i32,
    pub height: i32,
}

impl Tile {
    fn is_single(&self) -> bool {
        self.width == 1 && self.height == 1
    }
    fn is_wide(&self) -> bool {
        self.height == 1 && self.width > 1
    }
    fn is_tall(&self) -> bool {
        self.width == 1 && self.height > 1
    }
}

pub struct WordBitesSolution {
    /// (width, height) of the board.
    board_size: (usize, usize),
    /// Minimum number of pieces in a candidate word.
    min_length: usize,
    bf: BloomFilter<String>,
}

impl WordBitesSolution {
    pub fn new(board_size: (usize, usize), min_length: usize, bf: BloomFilter<String>) -> Self {
        WordBitesSolution { board_size, min_length, bf }
    }

    fn collect(&self, pieces: &[String], max_len: usize, out: &mut BTreeSet<WordSolution>) {
        for w in build_iterator(pieces, self.min_length, max_len) {
            let word = w.concat();
            if word.len() >= MIN_WORD_LETTERS && word.len() <= max_len && self.bf.contains(&word) {
                out.insert(WordSolution { word });
            }
        }
    }

    /// Words laid out along one axis. `along` tiles are placed whole; `across` tiles
    /// contribute a single letter (the `i`-th) each.
    fn iterate_axis(
        &self,
        base: &[String],
        tiles: &[Tile],
        along: fn(&Tile) -> bool,
        across: fn(&Tile) -> bool,
        max_len: usize,
        out: &mut BTreeSet<WordSolution>,
    ) {
        let mut pieces = base.to_vec();
        pieces.extend(tiles.iter().filter(|t| along(t)).map(|t| t.letters.clone()));
        self.collect(&pieces, max_len, out);

        if base.len() + 1 > max_len {
            return;
        }
        let across_tiles: Vec<&Tile> = tiles.iter().filter(|t| across(t)).collect();
        let longest = across_tiles.iter().map(|t| t.letters.chars().count()).max().unwrap_or(0);
        for i in 0..longest {
            let mut pieces = base.to_vec();
            pieces.extend(across_tiles.iter().filter_map(|t| t.letters.chars().nth(i).map(String::from)));
            self.collect(&pieces, max_len, out);
        }
    }

    pub fn contains(&self, word: &String) -> bool {
        self.bf.contains(word)
    }

    pub fn solve(&self, tiles: &[Tile]) -> Vec<WordSolution> {
        let tiles: Vec<Tile> = tiles
            .iter()
            .map(|t| Tile { letters: t.letters.to_lowercase(), ..t.clone() })
            .collect();
        let singles: Vec<String> = tiles.iter().filter(|t| t.is_single()).map(|t| t.letters.clone()).collect();
        let (width, height) = self.board_size;

        let mut out = BTreeSet::new();
        self.iterate_axis(&singles, &tiles, Tile::is_wide, Tile::is_tall, width, &mut out);
        self.iterate_axis(&singles, &tiles, Tile::is_tall, Tile::is_wide, height, &mut out);
        out.into_iter().collect()
    }
}

#[wasm_bindgen]
pub struct JSSolution {
    sol: WordBitesSolution,
}

#[wasm_bindgen]
impl JSSolution {
    #[wasm_bindgen(constructor)]
    pub fn new(board_width: u32, board_height: u32, min_length: u32, bloom_filter: &str) -> Result<JSSolution, JsError> {
        #[cfg(feature = "console_error_panic_hook")]
        console_error_panic_hook::set_once();
        let filter = crate::decode_filter(bloom_filter).map_err(|e| JsError::new(&e))?;
        Ok(JSSolution {
            sol: WordBitesSolution::new((board_width as usize, board_height as usize), min_length as usize, filter),
        })
    }

    /// Whether each word is in the dictionary (3+ letters only).
    pub fn contains_all(&self, words: Vec<String>) -> Vec<u8> {
        words
            .iter()
            .map(|w| {
                let w = w.to_lowercase();
                (w.len() >= MIN_WORD_LETTERS && self.sol.contains(&w)) as u8
            })
            .collect()
    }

    pub fn solve(&self, tiles: JsValue) -> Result<JsValue, JsError> {
        let tiles: Vec<Tile> = serde_wasm_bindgen::from_value(tiles)?;
        Ok(serde_wasm_bindgen::to_value(&self.sol.solve(&tiles))?)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn filter() -> BloomFilter<String> {
        let path = concat!(env!("CARGO_MANIFEST_DIR"), "/../public/bloomfilter_enable1.dat");
        crate::decode_filter(std::fs::read(path).expect("bloom filter data")).unwrap()
    }

    fn tile(letters: &str, width: i32, height: i32) -> Tile {
        Tile { letters: letters.into(), width, height }
    }

    fn words(sol: &[WordSolution]) -> Vec<&str> {
        sol.iter().map(|w| w.word.as_str()).collect()
    }

    #[test]
    fn singles() {
        let wbs = WordBitesSolution::new((8, 9), 1, filter());
        let found = wbs.solve(&[tile("C", 1, 1), tile("A", 1, 1), tile("T", 1, 1)]);
        let found = words(&found);
        assert!(found.contains(&"cat"));
        assert!(found.contains(&"act"));
        assert!(found.iter().all(|w| w.len() >= MIN_WORD_LETTERS));
    }

    #[test]
    fn multi_letter_tiles() {
        let wbs = WordBitesSolution::new((8, 9), 1, filter());
        let found = wbs.solve(&[tile("r", 1, 1), tile("ac", 2, 1), tile("er", 2, 1), tile("ni", 1, 2)]);
        let found = words(&found);
        assert!(found.contains(&"racer"), "{found:?}");
    }

    #[test]
    fn respects_board_height_for_vertical_words() {
        // Board only 3 high: vertical words longer than 3 letters cannot fit.
        let wbs = WordBitesSolution::new((1, 3), 1, filter());
        let found = wbs.solve(&[tile("ca", 1, 2), tile("t", 1, 1), tile("s", 1, 1)]);
        let found = words(&found);
        assert!(found.contains(&"cat"));
        assert!(!found.contains(&"cats"));
    }
}
