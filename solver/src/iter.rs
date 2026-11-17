use itertools::Itertools;
use std::cmp::min;

/// Every unique ordering of `min_length..=max_length` items drawn from `text`.
pub(crate) fn build_iterator(
    text: &[String],
    min_length: usize,
    max_length: usize,
) -> impl Iterator<Item = Vec<String>> + '_ {
    (min_length..=min(max_length, text.len()))
        .flat_map(move |len| text.iter().cloned().permutations(len).unique())
}

#[cfg(test)]
mod tests {
    use super::build_iterator;

    fn strings(v: &[&str]) -> Vec<String> {
        v.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn unique_permutations() {
        let word = strings(&["a", "b", "c"]);
        assert_eq!(build_iterator(&word, 3, 3).count(), 6);
        let word = strings(&["t", "s", "s", "s"]);
        assert_eq!(build_iterator(&word, 4, 4).count(), 4);
    }

    #[test]
    fn respects_length_bounds() {
        let word = strings(&["3", "3", "4", "5"]);
        // 2-length unique permutations of {3,3,4,5}: 33 34 35 43 45 53 54
        assert_eq!(build_iterator(&word, 2, 2).count(), 7);
        assert_eq!(build_iterator(&word, 5, 9).count(), 0);
    }
}
