mod dictionary;
mod solver;

use wasm_bindgen::prelude::*;

pub use dictionary::{normalize, Dictionary, MIN_WORD_LETTERS};
pub use solver::{solve, Axis, SolveJob, Tile};

/// JavaScript entry point. Holds a dictionary, the board size, and an optional in-progress solve.
#[wasm_bindgen]
pub struct JSSolution {
    dict: Dictionary,
    width: u32,
    height: u32,
    job: Option<SolveJob>,
}

#[wasm_bindgen]
impl JSSolution {
    /// `word_list` is the raw bytes of a newline separated word list.
    #[wasm_bindgen(constructor)]
    pub fn new(board_width: u32, board_height: u32, word_list: &[u8]) -> Result<JSSolution, JsError> {
        #[cfg(feature = "console_error_panic_hook")]
        console_error_panic_hook::set_once();
        let dict = Dictionary::from_word_list(word_list).map_err(|e| JsError::new(&e))?;
        Ok(JSSolution { dict, width: board_width, height: board_height, job: None })
    }

    pub fn word_count(&self) -> usize {
        self.dict.len()
    }

    pub fn set_board_size(&mut self, width: u32, height: u32) {
        self.width = width;
        self.height = height;
    }

    /// 1/0 for whether each word is in the dictionary (3+ letters only).
    pub fn contains_all(&self, words: Vec<String>) -> Vec<u8> {
        words.iter().map(|w| self.dict.contains(w) as u8).collect()
    }

    /// Solve in one call.
    pub fn solve(&self, tiles: JsValue) -> Result<Vec<String>, JsError> {
        let tiles: Vec<Tile> = serde_wasm_bindgen::from_value(tiles)?;
        Ok(solve(&self.dict, &tiles, self.width, self.height))
    }

    /// Begin an incremental solve; returns the number of branches to run.
    pub fn start_solve(&mut self, tiles: JsValue) -> Result<usize, JsError> {
        let tiles: Vec<Tile> = serde_wasm_bindgen::from_value(tiles)?;
        let job = SolveJob::new(&tiles, self.width, self.height);
        let total = job.total();
        self.job = Some(job);
        Ok(total)
    }

    /// Run up to `n` branches; returns how many are done so far.
    pub fn step_solve(&mut self, n: usize) -> Result<usize, JsError> {
        let job = self.job.as_mut().ok_or_else(|| JsError::new("no solve in progress"))?;
        job.step(&self.dict, n);
        Ok(job.done())
    }

    /// Finish the incremental solve and return the words found, sorted.
    pub fn finish_solve(&mut self) -> Result<Vec<String>, JsError> {
        let mut job = self.job.take().ok_or_else(|| JsError::new("no solve in progress"))?;
        job.step(&self.dict, usize::MAX);
        Ok(job.finish())
    }
}
