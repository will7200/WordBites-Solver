mod dictionary;
mod layout;
mod solver;

use wasm_bindgen::prelude::*;

pub use dictionary::{normalize, Dictionary, MIN_WORD_LETTERS};
pub use layout::{word_points, Evaluation, LayoutJob, Objective};
pub use solver::{solve, Axis, SolveJob, Tile};

/// JavaScript entry point. Holds a dictionary, the board size, and an optional in-progress solve.
#[wasm_bindgen]
pub struct JSSolution {
    dict: Dictionary,
    width: u32,
    height: u32,
    job: Option<SolveJob>,
    layout: Option<LayoutJob>,
}

#[wasm_bindgen]
impl JSSolution {
    /// `dictionary` is a prebuilt FST (`public/dict/<name>.fst`, written by `build-dict`).
    #[wasm_bindgen(constructor)]
    pub fn new(board_width: u32, board_height: u32, dictionary: &[u8]) -> Result<JSSolution, JsError> {
        #[cfg(feature = "console_error_panic_hook")]
        console_error_panic_hook::set_once();
        let dict = Dictionary::from_fst(dictionary).map_err(|e| JsError::new(&e))?;
        Ok(JSSolution { dict, width: board_width, height: board_height, job: None, layout: None })
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

    /// Begin searching for the layout that spells the most words (`objective` 0) or points (1).
    /// Returns the number of iterations, or an error if the pieces don't fit.
    /// `start` optionally gives a starting layout as flat [x0, y0, x1, y1, ...] (ignored if invalid).
    pub fn start_layout(
        &mut self,
        tiles: JsValue,
        objective: u8,
        iterations: usize,
        seed: u32,
        start: Option<Vec<u32>>,
    ) -> Result<usize, JsError> {
        let tiles: Vec<Tile> = serde_wasm_bindgen::from_value(tiles)?;
        let objective = if objective == 1 { Objective::Points } else { Objective::Words };
        let start: Option<Vec<(usize, usize)>> =
            start.map(|v| v.as_chunks::<2>().0.iter().map(|[x, y]| (*x as usize, *y as usize)).collect());
        let job = LayoutJob::with_start(
            &self.dict,
            &tiles,
            self.width,
            self.height,
            objective,
            iterations,
            seed as u64,
            start.as_deref(),
        )
            .ok_or_else(|| JsError::new("the pieces don't fit on the board"))?;
        let total = job.total();
        self.layout = Some(job);
        Ok(total)
    }

    /// Run up to `n` iterations; returns iterations done so far.
    pub fn step_layout(&mut self, n: usize) -> Result<usize, JsError> {
        let job = self.layout.as_mut().ok_or_else(|| JsError::new("no layout search in progress"))?;
        job.step(&self.dict, n);
        Ok(job.done())
    }

    /// The best layout so far: `{ positions: [[x, y], ...], words: string[], points }`.
    pub fn best_layout(&mut self) -> Result<JsValue, JsError> {
        let job = self.layout.as_mut().ok_or_else(|| JsError::new("no layout search in progress"))?;
        let (positions, eval) = job.best(&self.dict);
        #[derive(serde::Serialize)]
        struct Out {
            positions: Vec<(usize, usize)>,
            words: Vec<String>,
            points: u32,
        }
        Ok(serde_wasm_bindgen::to_value(&Out { positions, words: eval.words, points: eval.points })?)
    }
}
