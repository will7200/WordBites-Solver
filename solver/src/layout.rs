//! Search for a board layout that spells as many words (or points) at once as possible.
//!
//! Simulated annealing over piece positions. A word counts when a maximal horizontal or vertical
//! run of letters (3+ long, combining 2+ pieces) is in the dictionary; each distinct word once.
use std::collections::BTreeSet;

use crate::dictionary::{Dictionary, MIN_WORD_LETTERS};
use crate::solver::Tile;

/// GamePigeon Word Bites points per length (3..=9), +400 per letter beyond.
pub fn word_points(len: usize) -> u32 {
    match len {
        0..=2 => 0,
        3 => 100,
        4 => 400,
        5 => 800,
        6 => 1400,
        7 => 1800,
        8 => 2200,
        n => 2600 + 400 * (n as u32 - 9),
    }
}

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Objective {
    Words,
    Points,
}

#[derive(Clone, Debug)]
struct Piece {
    letters: Vec<u8>,
    w: usize,
    h: usize,
}

/// Small xorshift PRNG (deterministic for a seed; no extra dependency).
struct Rng(u64);
impl Rng {
    fn next(&mut self) -> u64 {
        let mut x = self.0;
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        self.0 = x;
        x
    }
    fn below(&mut self, n: usize) -> usize {
        (self.next() % n as u64) as usize
    }
    fn unit(&mut self) -> f64 {
        (self.next() >> 11) as f64 / (1u64 << 53) as f64
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct Evaluation {
    pub words: Vec<String>,
    pub points: u32,
}

pub struct LayoutJob {
    pieces: Vec<Piece>,
    width: usize,
    height: usize,
    objective: Objective,
    rng: Rng,
    /// Current positions (top-left) and occupancy grid (piece index + 1, 0 = empty).
    pos: Vec<(usize, usize)>,
    grid: Vec<u16>,
    score: f64,
    best_pos: Vec<(usize, usize)>,
    best_score: f64,
    iter: usize,
    total: usize,
    seeded: bool,
}

impl LayoutJob {
    /// Returns None if the pieces can't all fit on the board.
    pub fn new(
        dict: &Dictionary,
        tiles: &[Tile],
        width: u32,
        height: u32,
        objective: Objective,
        iterations: usize,
        seed: u64,
    ) -> Option<Self> {
        Self::with_start(dict, tiles, width, height, objective, iterations, seed, None)
    }

    /// Like `new`, but starts from `start` (top-left per tile) when it's a valid layout.
    #[allow(clippy::too_many_arguments)]
    pub fn with_start(
        dict: &Dictionary,
        tiles: &[Tile],
        width: u32,
        height: u32,
        objective: Objective,
        iterations: usize,
        seed: u64,
        start: Option<&[(usize, usize)]>,
    ) -> Option<Self> {
        let pieces: Vec<Piece> = tiles
            .iter()
            .map(|t| Piece {
                letters: t.letters.to_ascii_lowercase().into_bytes(),
                w: t.width as usize,
                h: t.height as usize,
            })
            .collect();
        let (width, height) = (width as usize, height as usize);
        let mut job = LayoutJob {
            grid: vec![0; width * height],
            pos: vec![(0, 0); pieces.len()],
            best_pos: Vec::new(),
            pieces,
            width,
            height,
            objective,
            rng: Rng(seed | 1),
            score: 0.0,
            best_score: f64::MIN,
            iter: 0,
            total: iterations,
            seeded: false,
        };
        let seeded = start.filter(|s| s.len() == job.pieces.len()).is_some_and(|s| {
            for (i, &at) in s.iter().enumerate() {
                if !job.fits(i, at) {
                    job.grid.iter_mut().for_each(|c| *c = 0);
                    return false;
                }
                job.place(i, at);
            }
            true
        });
        if !seeded {
            // Random initial placement, biggest pieces first.
            let mut order: Vec<usize> = (0..job.pieces.len()).collect();
            order.sort_by_key(|&i| std::cmp::Reverse(job.pieces[i].w * job.pieces[i].h));
            for i in order {
                let spots = job.free_spots(i);
                if spots.is_empty() {
                    return None;
                }
                let s = spots[job.rng.below(spots.len())];
                job.place(i, s);
            }
        }
        job.seeded = seeded;
        job.score = job.objective_value(dict);
        job.best_pos = job.pos.clone();
        job.best_score = job.score;
        Some(job)
    }

    fn fits(&self, i: usize, (x, y): (usize, usize)) -> bool {
        let p = &self.pieces[i];
        if x + p.w > self.width || y + p.h > self.height {
            return false;
        }
        for dy in 0..p.h {
            for dx in 0..p.w {
                let c = self.grid[(y + dy) * self.width + x + dx];
                if c != 0 && c as usize != i + 1 {
                    return false;
                }
            }
        }
        true
    }

    fn free_spots(&self, i: usize) -> Vec<(usize, usize)> {
        let mut v = Vec::new();
        for y in 0..self.height {
            for x in 0..self.width {
                if self.fits(i, (x, y)) {
                    v.push((x, y));
                }
            }
        }
        v
    }

    fn set(&mut self, i: usize, (x, y): (usize, usize), val: u16) {
        let p = &self.pieces[i];
        for dy in 0..p.h {
            for dx in 0..p.w {
                self.grid[(y + dy) * self.width + x + dx] = val;
            }
        }
    }

    fn place(&mut self, i: usize, at: (usize, usize)) {
        self.pos[i] = at;
        self.set(i, at, i as u16 + 1);
    }

    fn lift(&mut self, i: usize) {
        let at = self.pos[i];
        self.set(i, at, 0);
    }

    fn letter_at(&self, x: usize, y: usize) -> Option<(u8, u16)> {
        let id = self.grid[y * self.width + x];
        if id == 0 {
            return None;
        }
        let p = &self.pieces[id as usize - 1];
        let (px, py) = self.pos[id as usize - 1];
        Some((p.letters[(y - py) * p.w + (x - px)], id))
    }

    /// Distinct dictionary words currently spelled on the board.
    fn words(&self, dict: &Dictionary) -> BTreeSet<String> {
        let mut out = BTreeSet::new();
        let mut run: Vec<u8> = Vec::with_capacity(10);
        let mut ids: Vec<u16> = Vec::with_capacity(10);
        let flush = |run: &mut Vec<u8>, ids: &mut Vec<u16>, out: &mut BTreeSet<String>| {
            if run.len() >= MIN_WORD_LETTERS && ids.iter().any(|&i| i != ids[0]) {
                // Runs are ASCII lowercase.
                let w = std::str::from_utf8(run).unwrap();
                if dict.contains(w) {
                    out.insert(w.to_string());
                }
            }
            run.clear();
            ids.clear();
        };
        for y in 0..self.height {
            for x in 0..self.width {
                match self.letter_at(x, y) {
                    Some((l, id)) => {
                        run.push(l);
                        ids.push(id);
                    }
                    None => flush(&mut run, &mut ids, &mut out),
                }
            }
            flush(&mut run, &mut ids, &mut out);
        }
        for x in 0..self.width {
            for y in 0..self.height {
                match self.letter_at(x, y) {
                    Some((l, id)) => {
                        run.push(l);
                        ids.push(id);
                    }
                    None => flush(&mut run, &mut ids, &mut out),
                }
            }
            flush(&mut run, &mut ids, &mut out);
        }
        out
    }

    fn objective_value(&self, dict: &Dictionary) -> f64 {
        let words = self.words(dict);
        let points: u32 = words.iter().map(|w| word_points(w.len())).sum();
        match self.objective {
            // Most words; ties broken by points.
            Objective::Words => words.len() as f64 + points as f64 / 1e6,
            Objective::Points => points as f64 + words.len() as f64 / 1e3,
        }
    }

    fn temperature(&self) -> f64 {
        let (mut t0, t1): (f64, f64) = match self.objective {
            Objective::Words => (1.5, 0.02),
            Objective::Points => (600.0, 5.0),
        };
        // A seeded start is already good: start cooler so it isn't scrambled away.
        if self.seeded {
            t0 /= 4.0;
        }
        let f = self.iter as f64 / self.total.max(1) as f64;
        t0 * (t1 / t0).powf(f)
    }

    /// Propose one random change; returns an undo record.
    fn propose(&mut self) -> Option<Vec<(usize, (usize, usize))>> {
        let n = self.pieces.len();
        if n == 0 {
            return None;
        }
        let i = self.rng.below(n);
        let roll = self.rng.below(10);
        if roll < 3 && n > 1 {
            // Swap with another piece of the same shape.
            let j = self.rng.below(n);
            if j != i && self.pieces[i].w == self.pieces[j].w && self.pieces[i].h == self.pieces[j].h {
                let (a, b) = (self.pos[i], self.pos[j]);
                self.lift(i);
                self.lift(j);
                self.place(i, b);
                self.place(j, a);
                return Some(vec![(i, a), (j, b)]);
            }
        }
        let old = self.pos[i];
        self.lift(i);
        let target = if roll < 7 && n > 1 {
            // Next to another piece: pick a neighbour cell of a random other piece.
            let j = self.rng.below(n);
            let (jx, jy) = self.pos[j];
            let (jw, jh) = (self.pieces[j].w as i64, self.pieces[j].h as i64);
            let (w, h) = (self.pieces[i].w as i64, self.pieces[i].h as i64);
            let dx = self.rng.below((jw + w + 1) as usize) as i64 - w;
            let dy = self.rng.below((jh + h + 1) as usize) as i64 - h;
            let (x, y) = (jx as i64 + dx, jy as i64 + dy);
            if x >= 0 && y >= 0 { Some((x as usize, y as usize)) } else { None }
        } else {
            Some((self.rng.below(self.width), self.rng.below(self.height)))
        };
        match target {
            Some(t) if self.fits(i, t) => {
                self.place(i, t);
                Some(vec![(i, old)])
            }
            _ => {
                self.place(i, old);
                None
            }
        }
    }

    fn undo(&mut self, moves: &[(usize, (usize, usize))]) {
        for &(i, _) in moves {
            self.lift(i);
        }
        for &(i, at) in moves {
            self.place(i, at);
        }
    }

    /// Run up to `n` iterations; returns true when finished.
    pub fn step(&mut self, dict: &Dictionary, n: usize) -> bool {
        let end = (self.iter + n).min(self.total);
        while self.iter < end {
            self.iter += 1;
            let Some(undo) = self.propose() else { continue };
            let s = self.objective_value(dict);
            let t = self.temperature();
            if s >= self.score || self.rng.unit() < ((s - self.score) / t).exp() {
                self.score = s;
                if s > self.best_score {
                    self.best_score = s;
                    self.best_pos = self.pos.clone();
                }
            } else {
                self.undo(&undo);
            }
        }
        self.iter >= self.total
    }

    pub fn done(&self) -> usize {
        self.iter
    }

    pub fn total(&self) -> usize {
        self.total
    }

    /// Best layout found: top-left (x, y) per input tile, and what it spells.
    pub fn best(&mut self, dict: &Dictionary) -> (Vec<(usize, usize)>, Evaluation) {
        let current = std::mem::replace(&mut self.pos, self.best_pos.clone());
        self.grid.iter_mut().for_each(|c| *c = 0);
        for i in 0..self.pieces.len() {
            let at = self.pos[i];
            self.place(i, at);
        }
        let words: Vec<String> = self.words(dict).into_iter().collect();
        let points = words.iter().map(|w| word_points(w.len())).sum();
        let out = (self.pos.clone(), Evaluation { words, points });
        // Restore the annealing state so further steps continue from where they were.
        self.grid.iter_mut().for_each(|c| *c = 0);
        self.pos = current;
        for i in 0..self.pieces.len() {
            let at = self.pos[i];
            self.place(i, at);
        }
        out
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tile(l: &str, w: u32, h: u32) -> Tile {
        Tile { letters: l.into(), width: w, height: h }
    }

    #[test]
    fn finds_a_layout_with_words() {
        let d = Dictionary::from_word_list(b"cat\nact\ntac\ncats\nscat\nat\n").unwrap();
        let tiles = [tile("c", 1, 1), tile("a", 1, 1), tile("t", 1, 1), tile("s", 1, 1)];
        let mut job = LayoutJob::new(&d, &tiles, 5, 5, Objective::Points, 20_000, 7).unwrap();
        while !job.step(&d, 1000) {}
        let (pos, eval) = job.best(&d);
        assert_eq!(pos.len(), 4);
        // Best is a 4-letter word (400) plus a crossing 3-letter one if possible; at least 400.
        assert!(eval.points >= 400, "{eval:?}");
    }

    #[test]
    fn crossing_words_beat_a_single_word() {
        // c-a-t across and a-c-t... a 3x3 cross can spell two words sharing a letter.
        let d = Dictionary::from_word_list(b"cat\ntap\n").unwrap();
        let tiles = [tile("c", 1, 1), tile("a", 1, 1), tile("t", 1, 1), tile("a", 1, 1), tile("p", 1, 1)];
        let mut job = LayoutJob::new(&d, &tiles, 4, 4, Objective::Words, 30_000, 3).unwrap();
        while !job.step(&d, 1000) {}
        let (_, eval) = job.best(&d);
        assert_eq!(eval.words, vec!["cat", "tap"]);
    }

    #[test]
    fn layout_is_valid() {
        let d = Dictionary::from_word_list(b"racer\nrace\ncare\nacre\n").unwrap();
        let tiles = [tile("r", 1, 1), tile("ac", 2, 1), tile("er", 2, 1), tile("ni", 1, 2)];
        let mut job = LayoutJob::new(&d, &tiles, 8, 9, Objective::Words, 5_000, 11).unwrap();
        while !job.step(&d, 500) {}
        let (pos, _) = job.best(&d);
        // No overlaps, all in bounds.
        let mut seen = std::collections::HashSet::new();
        for (t, &(x, y)) in tiles.iter().zip(&pos) {
            for dy in 0..t.height as usize {
                for dx in 0..t.width as usize {
                    assert!(x + dx < 8 && y + dy < 9);
                    assert!(seen.insert((x + dx, y + dy)));
                }
            }
        }
    }

    #[test]
    fn seeded_start_is_used_and_never_worse() {
        let d = Dictionary::from_word_list(b"racer\nrace\nacre\n").unwrap();
        let tiles = [tile("r", 1, 1), tile("ac", 2, 1), tile("er", 2, 1), tile("x", 1, 1)];
        // r ac er spelled across row 0; x far away.
        let start = [(0, 0), (1, 0), (3, 0), (7, 8)];
        let mut job = LayoutJob::with_start(&d, &tiles, 8, 9, Objective::Points, 2_000, 5, Some(&start)).unwrap();
        assert!(job.seeded);
        while !job.step(&d, 500) {}
        assert!(job.best(&d).1.points >= 800);
        // Invalid start (overlap) falls back to random.
        let bad = [(0, 0), (0, 0), (3, 0), (7, 8)];
        let job = LayoutJob::with_start(&d, &tiles, 8, 9, Objective::Points, 10, 5, Some(&bad)).unwrap();
        assert!(!job.seeded);
    }

    #[test]
    fn too_many_pieces_dont_fit() {
        let d = Dictionary::from_word_list(b"cat\n").unwrap();
        let tiles = vec![tile("a", 1, 1); 5];
        assert!(LayoutJob::new(&d, &tiles, 2, 2, Objective::Words, 10, 1).is_none());
    }
}
