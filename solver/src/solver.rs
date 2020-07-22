use std::borrow::Borrow;
use std::cmp::{max, min};
use std::hash::{Hash, Hasher};

use itertools::{all, Itertools};
use serde::Serialize;
use wasm_bindgen::prelude::*;

use crate::iter::{build_iterator, total_size_unique_permutations};
use probabilistic_collections::bloom::BloomFilter;
use std::io::{BufWriter, BufReader, Read};
use std::fs::File;
use std::fs;

#[derive(Serialize)]
pub struct Point {
    pub x: i32,
    pub y: i32,
}

#[derive(Serialize)]
pub struct BoardCoordinates {
    pub ul: Point,
    pub lr: Point,
}

#[derive(Serialize)]
#[derive(Debug, Eq, PartialEq, Ord, PartialOrd)]
pub struct WordSolution {
    pub word: String,
}

impl Hash for WordSolution {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.word.hash(state);
    }
}

impl Borrow<String> for WordSolution {
    fn borrow(&self) -> &String {
        &self.word
    }
}


#[wasm_bindgen]
#[derive(Serialize, Deserialize)]
#[derive(Clone, Copy, PartialEq, Debug)]
pub enum Orientation {
    Horizontal,
    Vertical,
}

#[derive(Serialize, Deserialize)]
pub struct Tile {
    pub letters: String,
    pub width: i32,
    pub height: i32,
}

struct WordBitesSolution {
    board_size: (i32, i32),
    min_length: i8,
    bf: BloomFilter::<String>,
}

impl WordBitesSolution {
    pub fn new(board_size: (i32, i32), min_length: i8, bloom_filter: BloomFilter<String>) -> WordBitesSolution {
        let mut buf_stream_reader = BufReader::new(File::open("bloomfilter.dat").unwrap());
        let mut buffer_data = vec![];
        buf_stream_reader.read_to_end(&mut buffer_data).unwrap();
        WordBitesSolution { board_size, min_length, bf: bloom_filter }
    }

    fn max_height(tiles: &Vec<Tile>) -> Option<i32> {
        (tiles).into_iter().map(|ct| ct.height).max()
    }

    fn max_width(tiles: &Vec<Tile>) -> Option<i32> {
        (tiles).into_iter().map(|ct| ct.width).max()
    }

    fn iterate_horizontally(&self, base: &Vec<String>, mut vm: Vec<WordSolution>, tiles: &Vec<Tile>) -> Vec<WordSolution> {
        let max_height = WordBitesSolution::max_height(tiles).unwrap();
        {
            let wts: Vec<String> = (tiles).into_iter().filter(|ct| ct.height == 1 && ct.width > 1).collect_vec().into_iter().fold(Vec::new(), |mut acc, v| {
                acc.push(v.letters.clone());
                acc
            });
            let mut first = base.clone();
            first.extend(wts);
            let allcs_ref = &first;
            let it = build_iterator(allcs_ref, self.min_length, self.board_size.0 as i8);
            for w in it {
                let lookup = w.into_iter().join("");
                if self.bf.contains(&lookup) {
                    vm.push(WordSolution {
                        word: lookup
                    });
                }
            }
        }
        for i in 0..max_height {
            let wide_tiles_extra: Vec<String> = (tiles).into_iter().filter(|ct| ct.height > 1 && ct.width == 1).collect_vec().into_iter().fold(Vec::new(), |mut acc, v| {
                let val: String = v.letters.chars().skip(i as usize).take(1).collect();
                if val.len() > 0 {
                    acc.push(val);
                }
                acc
            });
            let mut first = base.clone();
            first.extend(wide_tiles_extra);
            let allcs_ref = &first;
            if (base.len() + 1) > self.board_size.0 as usize {
                continue;
            }
            let it = build_iterator(allcs_ref, self.min_length, self.board_size.0 as i8);
            for w in it {
                let lookup = w.into_iter().join("");
                if self.bf.contains(&lookup) {
                    vm.push(WordSolution {
                        word: lookup
                    });
                }
            }
        }
        vm
    }

    fn iterate_vertically(&self, base: &Vec<String>, mut vm: Vec<WordSolution>, tiles: &Vec<Tile>) -> Vec<WordSolution> {
        let max_width = WordBitesSolution::max_width(tiles).unwrap();
        {
            let vts: Vec<String> = (tiles).into_iter().filter(|ct| ct.height > 1 && ct.width == 1).collect_vec().into_iter().fold(Vec::new(), |mut acc, v| {
                acc.push(v.letters.clone());
                acc
            });
            let mut first = base.clone();
            first.extend(vts);
            let allcs_ref = &first;
            let it = build_iterator(allcs_ref, self.min_length, self.board_size.0 as i8);
            for w in it {
                let lookup = w.into_iter().join("");
                if self.bf.contains(&lookup) {
                    vm.push(WordSolution {
                        word: lookup
                    });
                }
            }
        }
        for i in 0..max_width {
            let wide_tiles_extra: Vec<String> = (tiles).into_iter().filter(|ct| ct.height == 1 && ct.width > 1).collect_vec().into_iter().fold(Vec::new(), |mut acc, v| {
                acc.push(v.letters.chars().skip(i as usize).take(1).collect());
                acc
            });
            let mut first = base.clone();
            first.extend(wide_tiles_extra);
            let allcs_ref = &first;
            if (base.len() + 1) > self.board_size.1 as usize {
                continue;
            }
            let it = build_iterator(allcs_ref, self.min_length, self.board_size.1 as i8);
            for w in it {
                let lookup = w.into_iter().join("");
                if self.bf.contains(&lookup) {
                    vm.push(WordSolution {
                        word: lookup
                    });
                }
            }
        }
        vm
    }

    pub fn solve(&self, tiles: Vec<Tile>) -> Vec<WordSolution> {
        // check free floating character
        let single_tiles = (&tiles).into_iter().filter(|ct| ct.height == 1 && ct.width == 1).collect_vec();
        let single_tiles_size = single_tiles.len();
        let mut single_tiles_strings: Vec<String> = single_tiles.into_iter().fold(Vec::with_capacity(single_tiles_size), |mut acc, v| {
            acc.push(v.letters.clone());
            acc
        });
        let it = build_iterator(&single_tiles_strings, min(self.min_length, self.board_size.0 as i8), (&self.board_size.0).clone() as i8);
        let mut ws = Vec::new();
        for w in it {
            let lookup = w.into_iter().join("");
            if self.bf.contains(&lookup) {
                ws.push(WordSolution {
                    word: lookup
                });
            }
        }
        ws = self.iterate_horizontally(&single_tiles_strings, ws, &tiles);
        ws = self.iterate_vertically(&single_tiles_strings, ws, &tiles);


        ws.sort();
        ws.dedup();
        ws
    }
}

#[cfg(test)]
mod tests {
    use std::fs::File;
    use std::io::prelude::*;
    use std::path::Path;

    use probabilistic_collections::bloom::BloomFilter;

    use crate::solver::{Tile, WordBitesSolution, WordSolution};
    use std::hash::Hash;
    use std::collections::HashSet;
    use std::io;
    use bincode::{serialize_into};
    use std::io::{BufWriter, BufReader};
    use probabilistic_collections::SipHasherBuilder;

    extern crate base64;

    fn my_eq<T>(a: &[T], b: &[T]) -> bool
        where
            T: Eq + Hash,
    {
        let a: HashSet<_> = a.iter().collect();
        let b: HashSet<_> = b.iter().collect();
        a == b
    }

    fn getFilter() -> BloomFilter<String, SipHasherBuilder> {
        let mut buf_stream_reader = BufReader::new(File::open("bloomfilter.dat").unwrap());
        let mut buffer_data = vec![];
        let mut x = buf_stream_reader.read_to_end(&mut buffer_data).unwrap();
        let filter: BloomFilter<String> = bincode::deserialize(base64::decode(buffer_data).unwrap().as_ref()).unwrap();
        filter
    }

    #[test]
    fn simple_solution() {

        let wbs = WordBitesSolution::new((8, 9), 2, getFilter());
        let possible_words = wbs.solve(vec![
            Tile { letters: 'A'.to_string(), width: 1, height: 1 },
            Tile { letters: 'S'.to_string(), width: 1, height: 1 },
            Tile { letters: 'S'.to_string(), width: 1, height: 1 }
        ]);
        assert!(my_eq(
            &[
                WordSolution {
                    word: String::from("AS"),
                },
                WordSolution {
                    word: String::from("SA"),
                },
                WordSolution {
                    word: String::from("SS"),
                },
                WordSolution {
                    word: String::from("ASS"),
                },
                WordSolution {
                    word: String::from("SAS"),
                },
                WordSolution {
                    word: String::from("SSA"),
                },
            ],
            possible_words.as_ref(),
        ));
        ()
    }

    #[test]
    fn characters_with_doubles() {
        let wbs = WordBitesSolution::new((8, 9), 2, getFilter());
        let possible_words = wbs.solve(vec![
            Tile { letters: 'A'.to_string(), width: 1, height: 1 },
            Tile { letters: "CH".to_string(), width: 2, height: 1 },
            Tile { letters: "SH".to_string(), width: 1, height: 2 },
        ]);
        dbg!(possible_words);
    }

    #[test]
    fn full_solution() {
        let tiles = WordBitesSolution::new((8, 9), 8, getFilter());
        let possible_words = tiles.solve(vec![
            Tile { letters: "r".to_string(), height: 1, width: 1 },
            Tile { letters: "a".to_string(), height: 1, width: 1 },
            Tile { letters: "c".to_string(), height: 1, width: 1 },
            Tile { letters: "er".to_string(), height: 1, width: 2 },
            Tile { letters: "ma".to_string(), height: 1, width: 2 },
            Tile { letters: "li".to_string(), height: 1, width: 2 },
            Tile { letters: "ro".to_string(), height: 1, width: 2 },
            Tile { letters: "c".to_string(), height: 1, width: 1 },
            Tile { letters: "h".to_string(), height: 1, width: 1 },
            Tile { letters: "s".to_string(), height: 1, width: 1 },
            Tile { letters: "ni".to_string(), height: 2, width: 1 }
        ]);
        println!("{}", possible_words.len());
        dbg!(possible_words);
    }

    // The output is wrapped in a Result to allow matching on errors
    // Returns an Iterator to the Reader of the lines of the file.
    fn read_lines<P>(filename: P) -> io::Result<io::Lines<io::BufReader<File>>>
        where P: AsRef<Path>, {
        let file = File::open(filename)?;
        Ok(io::BufReader::new(file).lines())
    }

    #[test]
    fn bloom_filter() {
        // set up filter
        let false_positive_rate = 0.001;  // = .1%
        let expected_elements = 1000000;
        let mut filter = BloomFilter::<String>::new(expected_elements, false_positive_rate);

        // File hosts must exist in current path before this produces output
        if let Ok(lines) = read_lines("./words_alpha.txt") {
            // Consumes the iterator, returns an (Optional) String
            for line in lines {
                if let Ok(word) = line {
                    if word.len() > 2 {
                        filter.insert(&word)
                    }
                }
            }
        }

        assert!(filter.contains(&"aaa".to_string()));
        assert!(!filter.contains(&"another super long string".to_string()));
        let serialized_filter = bincode::serialize(&filter).unwrap();
        let de_filter: BloomFilter<String> = bincode::deserialize(&serialized_filter).unwrap();
        {
            let mut f = BufWriter::new(File::create("bloomfilter.dat").unwrap());
            f.write(base64::encode(&serialized_filter).as_ref());
            drop(f);
        }

        // read the whole file
        let mut buf_stream_reader = BufReader::new(File::open("bloomfilter.dat").unwrap());
        let mut buffer_data = vec![];
        let mut x = buf_stream_reader.read_to_end(&mut buffer_data).unwrap();
        let de_filter: BloomFilter<String> = bincode::deserialize(base64::decode(buffer_data).unwrap().as_ref()).unwrap();
        assert!(de_filter.contains(&"racer".to_string()));
        assert!(!de_filter.contains(&"another super long string".to_string()));
    }

    #[test]
    fn make_bloom_filter() {
        // set up filter
        let false_positive_rate = 0.001;  // = .1%
        let expected_elements = 1000000;
        let mut filter = BloomFilter::<String>::new(expected_elements, false_positive_rate);

        // File hosts must exist in current path before this produces output
        if let Ok(lines) = read_lines(r"D:\Downloads\dictionary-master\dictionary-master\enable1.txt") {
            // Consumes the iterator, returns an (Optional) String
            for line in lines {
                if let Ok(word) = line {
                    if word.len() > 2 {
                        filter.insert(&word.to_lowercase())
                    }
                }
            }
        }
        assert!(!filter.contains("asonbdiec"));
        let serialized_filter = bincode::serialize(&filter).unwrap();
        let de_filter: BloomFilter<String> = bincode::deserialize(&serialized_filter).unwrap();
        {
            let mut f = BufWriter::new(File::create("bloomfilter_enable1.dat").unwrap());
            f.write(base64::encode(&serialized_filter).as_ref());
            drop(f);
        }

        // read the whole file
        let mut buf_stream_reader = BufReader::new(File::open("bloomfilter_enable1.dat").unwrap());
        let mut buffer_data = vec![];
        let mut x = buf_stream_reader.read_to_end(&mut buffer_data).unwrap();
        let de_filter: BloomFilter<String> = bincode::deserialize(base64::decode(buffer_data).unwrap().as_ref()).unwrap();
        assert!(!de_filter.contains("asonbdiec"));
    }
}

trait Solution {
    fn solve(self, min_length: i8) -> Vec<WordSolution>;
}

#[wasm_bindgen]
pub struct JSSolution {
    sol: WordBitesSolution
}

#[wasm_bindgen]
impl JSSolution {
    #[wasm_bindgen(constructor)]
    pub fn new(board_width: i32, board_height: i32, min_length: i32, bloom_filter: String) -> JSSolution {
        let filter: BloomFilter<String> = bincode::deserialize(base64::decode(bloom_filter).unwrap().as_ref()).unwrap();
        JSSolution {
            sol: WordBitesSolution { board_size: (board_width, board_height), min_length: min_length as i8, bf: filter }
        }
    }

    pub fn solve(&self, js_objects: &JsValue) -> Result<JsValue, JsValue> {
        let elements: Vec<Tile> = js_objects.into_serde().unwrap();
        let data = self.sol.solve(elements);
        let js_result: JsValue = JsValue::from_serde(&data).unwrap();
        Ok(js_result)
    }
}

