//! Build a `bloomfilter_<name>.dat` from a newline separated word list.
//!
//! cargo run --release --bin build-filter -- words.txt ../public/bloomfilter_custom.dat
use std::io::{BufRead, BufReader};

use probabilistic_collections::bloom::BloomFilter;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut args = std::env::args().skip(1);
    let (Some(input), Some(output)) = (args.next(), args.next()) else {
        eprintln!("usage: build-filter <words.txt> <output.dat>");
        std::process::exit(2);
    };
    // Must match the parameters used for the shipped filters (same bit-length on disk).
    let mut filter = BloomFilter::<String>::new(1_000_000, 0.001);
    let mut count = 0usize;
    for line in BufReader::new(std::fs::File::open(&input)?).lines() {
        let word = line?.trim().to_lowercase();
        if word.len() >= solver::MIN_WORD_LETTERS && word.chars().all(|c| c.is_ascii_lowercase()) {
            filter.insert(&word);
            count += 1;
        }
    }
    std::fs::write(&output, solver::encode_filter(&filter)?)?;
    println!("wrote {count} words to {output}");
    Ok(())
}
