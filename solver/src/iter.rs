use itertools::Itertools;
use std::cmp::{max, min};
use wasm_bindgen::__rt::std::collections::HashMap;

pub(crate) fn build_iterator(text: &Vec<String>, min_length: i8, max_length: i8) -> impl Iterator<Item=Vec<String>> + '_ {
    (min_length..=min(max_length, text.len() as i8))
        .flat_map(move |len| text.clone().into_iter().permutations(len as usize).unique())
}

pub(crate) fn count_occurrences(text: &Vec<String>) -> HashMap<&String, i32> {
    let mut hm = HashMap::new();
    for c in text {
        *hm.entry(c).or_insert(0) += 1;
    }
    hm
}

fn factorial_iterative(n: u64) -> u64 {
    (1..=n).product()
}

pub(crate) fn total_size_unique_permutations(text: &Vec<String>) -> i32 {
    let hm = count_occurrences(text);
    let numerator = factorial_iterative(text.len() as u64);
    let mut denominator = 1;
    for (key, value) in hm {
        denominator = denominator * factorial_iterative(value as u64)
    }
    return (numerator / denominator) as i32;
}

#[cfg(test)]
mod tests {
    use crate::iter::{build_iterator, total_size_unique_permutations};

    #[test]
    fn build_iterator_test() {
        let word = vec!["3".to_string(), "3".to_string(), "4".to_string(), "5".to_string()];
        for j in 2..3 {
            for i in 2..3 {
                let mut total = 0;
                let it = build_iterator(&word, i as i8, j as i8);
                for ii in it {
                    println!("{}", ii.join(""));
                    total += 1;
                }
                println!("Total {}, minimum {}, length {}", total, i, j);
            }
        }
    }

    #[test]
    fn test_size_permutations() {
        let word: Vec<String> = vec!["a", "b", "c"].iter().map(|x| String::from(*x)).collect();
        let size = total_size_unique_permutations(&word);
        assert_eq!(size, 6);
        let word1: Vec<String> = vec!["t", "s", "s", "s"].iter().map(|x| String::from(*x)).collect();
        let size1 = total_size_unique_permutations(&word1);
        assert_eq!(size1, 4);
        let word2: Vec<String> = vec!["t", "s", "s", "s", "s"].iter().map(|x| String::from(*x)).collect();
        let size2 = total_size_unique_permutations(&word2);
        assert_eq!(size2, 5);
    }
}