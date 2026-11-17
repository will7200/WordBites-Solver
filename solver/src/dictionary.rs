use fst::Set;

/// Word Bites only counts words of 3+ letters.
pub const MIN_WORD_LETTERS: usize = 3;

/// Normalize a raw word list: lowercase ASCII a–z words of 3+ letters, sorted and de-duplicated.
pub fn normalize(text: &str) -> Vec<String> {
    let mut words: Vec<String> = text
        .lines()
        .map(|w| w.trim().to_ascii_lowercase())
        .filter(|w| w.len() >= MIN_WORD_LETTERS && w.bytes().all(|b| b.is_ascii_lowercase()))
        .collect();
    words.sort_unstable();
    words.dedup();
    words
}

/// An exact dictionary that supports prefix walks (a finite state transducer).
pub struct Dictionary {
    set: Set<Vec<u8>>,
}

impl Dictionary {
    /// Build from a newline separated word list (any order/case; invalid lines are skipped).
    pub fn from_word_list(bytes: &[u8]) -> Result<Self, String> {
        let text = std::str::from_utf8(bytes).map_err(|e| format!("dictionary is not UTF-8: {e}"))?;
        let words = normalize(text);
        if words.is_empty() {
            return Err("dictionary has no words".into());
        }
        let set = Set::from_iter(words.iter()).map_err(|e| e.to_string())?;
        Ok(Dictionary { set })
    }


    /// Load a prebuilt FST set (as written by `build-dict`). Validates the header; no rebuild.
    pub fn from_fst(bytes: &[u8]) -> Result<Self, String> {
        let set = Set::new(bytes.to_vec()).map_err(|e| format!("invalid dictionary: {e}"))?;
        if set.is_empty() {
            return Err("dictionary has no words".into());
        }
        Ok(Dictionary { set })
    }

    /// The serialized FST bytes.
    pub fn as_bytes(&self) -> &[u8] {
        self.set.as_fst().as_bytes()
    }

    pub fn len(&self) -> usize {
        self.set.len()
    }

    pub fn is_empty(&self) -> bool {
        self.set.is_empty()
    }

    pub fn contains(&self, word: &str) -> bool {
        word.len() >= MIN_WORD_LETTERS && self.set.contains(word.to_ascii_lowercase())
    }

    pub(crate) fn fst(&self) -> &fst::raw::Fst<Vec<u8>> {
        self.set.as_fst()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fst_round_trip() {
        let d = Dictionary::from_word_list(b"Cat\ndog\nat\ncat\n").unwrap();
        assert_eq!(d.len(), 2); // "at" too short, "Cat" deduped
        let loaded = Dictionary::from_fst(d.as_bytes()).unwrap();
        assert!(loaded.contains("cat") && loaded.contains("dog") && !loaded.contains("at"));
    }

    #[test]
    fn rejects_garbage() {
        assert!(Dictionary::from_fst(b"not an fst").is_err());
    }
}
