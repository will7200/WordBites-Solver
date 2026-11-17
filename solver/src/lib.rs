mod iter;
mod solver;

pub use solver::{MIN_WORD_LETTERS, JSSolution, Orientation, Tile, WordBitesSolution, WordSolution};

/// Decodes a base64 + bincode serialized bloom filter as stored in `public/bloomfilter_*.dat`.
pub fn decode_filter(
    data: impl AsRef<[u8]>,
) -> Result<probabilistic_collections::bloom::BloomFilter<String>, String> {
    use base64::Engine;
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(data)
        .map_err(|e| format!("invalid base64 bloom filter: {e}"))?;
    bincode::deserialize(&bytes).map_err(|e| format!("invalid bloom filter: {e}"))
}

/// Encodes a bloom filter into the format expected by [`decode_filter`].
pub fn encode_filter(
    filter: &probabilistic_collections::bloom::BloomFilter<String>,
) -> Result<String, String> {
    use base64::Engine;
    let bytes = bincode::serialize(filter).map_err(|e| e.to_string())?;
    Ok(base64::engine::general_purpose::STANDARD.encode(bytes))
}
