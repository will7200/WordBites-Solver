//! Find every word that can be laid out in a straight line from a set of Word Bites pieces.
//!
//! A word along one axis is a sequence of distinct pieces where
//! * single tiles and pieces running along the axis contribute all their letters, and
//! * pieces running across the axis contribute exactly one of their letters (they cross the word).
//!
//! The search walks the dictionary's FST letter by letter, so any prefix that starts no word is
//! abandoned immediately.
use std::collections::BTreeSet;

use fst::raw::{CompiledAddr, Fst};
use serde::{Deserialize, Serialize};

use crate::dictionary::{Dictionary, MIN_WORD_LETTERS};

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub struct Tile {
    pub letters: String,
    pub width: u32,
    pub height: u32,
}

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Axis {
    Horizontal,
    Vertical,
}

/// One way a group of identical pieces can be used in a word.
#[derive(Debug, Clone)]
struct Use {
    letters: Vec<u8>,
    /// Cells the piece sticks out before/after the word's line (crossing pieces only).
    before: u32,
    after: u32,
}

/// Identical pieces grouped together so permutations of duplicates aren't repeated.
#[derive(Debug, Clone)]
struct Group {
    count: u32,
    uses: Vec<Use>,
}

/// (letters, width, height)
type PieceKey = (Vec<u8>, u32, u32);

fn groups_for(tiles: &[Tile], axis: Axis) -> Vec<Group> {
    let mut keyed: Vec<(PieceKey, u32)> = Vec::new();
    for t in tiles {
        let letters = t.letters.to_ascii_lowercase().into_bytes();
        if letters.is_empty() || !letters.iter().all(u8::is_ascii_lowercase) {
            continue;
        }
        let key = (letters, t.width, t.height);
        match keyed.iter_mut().find(|(k, _)| *k == key) {
            Some((_, n)) => *n += 1,
            None => keyed.push((key, 1)),
        }
    }
    keyed
        .into_iter()
        .map(|((letters, w, h), count)| {
            let along = match axis {
                Axis::Horizontal => w >= h,
                Axis::Vertical => h >= w,
            };
            let uses = if along {
                vec![Use { letters, before: 0, after: 0 }]
            } else {
                let n = letters.len() as u32;
                letters
                    .iter()
                    .enumerate()
                    .map(|(j, &l)| Use { letters: vec![l], before: j as u32, after: n - 1 - j as u32 })
                    .collect()
            };
            Group { count, uses }
        })
        .collect()
}

/// A resumable solve, split into independent branches (one per first piece) for progress reporting.
pub struct SolveJob {
    axes: Vec<(Axis, Vec<Group>, u32, u32)>,
    /// (axis index, group index, use index) for the first step of each branch.
    branches: Vec<(usize, usize, usize)>,
    next: usize,
    found: BTreeSet<String>,
}

impl SolveJob {
    pub fn new(tiles: &[Tile], width: u32, height: u32) -> Self {
        let mut axes = Vec::new();
        let mut branches = Vec::new();
        for (axis, along, across) in [(Axis::Horizontal, width, height), (Axis::Vertical, height, width)] {
            let groups = groups_for(tiles, axis);
            let ai = axes.len();
            for (gi, g) in groups.iter().enumerate() {
                for ui in 0..g.uses.len() {
                    branches.push((ai, gi, ui));
                }
            }
            axes.push((axis, groups, along, across));
        }
        SolveJob { axes, branches, next: 0, found: BTreeSet::new() }
    }

    pub fn total(&self) -> usize {
        self.branches.len()
    }

    pub fn done(&self) -> usize {
        self.next
    }

    /// Run up to `n` more branches; returns true when finished.
    pub fn step(&mut self, dict: &Dictionary, n: usize) -> bool {
        let fst = dict.fst();
        let end = (self.next + n).min(self.branches.len());
        while self.next < end {
            let (ai, gi, ui) = self.branches[self.next];
            let (_, groups, along, across) = &self.axes[ai];
            let mut search = Search {
                fst,
                groups: groups.clone(),
                along: *along as usize,
                across: *across,
                word: Vec::with_capacity(*along as usize),
                found: &mut self.found,
            };
            let root = fst.root().addr();
            search.apply(root, gi, ui, 0, 0);
            self.next += 1;
        }
        self.next >= self.branches.len()
    }

    pub fn finish(self) -> Vec<String> {
        self.found.into_iter().collect()
    }
}

struct Search<'a> {
    fst: &'a Fst<Vec<u8>>,
    groups: Vec<Group>,
    along: usize,
    across: u32,
    word: Vec<u8>,
    found: &'a mut BTreeSet<String>,
}

impl Search<'_> {
    /// Walk `letters` from `addr`; None if the prefix leads nowhere.
    fn walk(&self, mut addr: CompiledAddr, letters: &[u8]) -> Option<CompiledAddr> {
        for &b in letters {
            let node = self.fst.node(addr);
            let i = node.find_input(b)?;
            addr = node.transition(i).addr;
        }
        Some(addr)
    }

    /// Use piece group `gi` in way `ui` next, then keep extending.
    fn apply(&mut self, addr: CompiledAddr, gi: usize, ui: usize, before: u32, after: u32) {
        let u = &self.groups[gi].uses[ui];
        if self.word.len() + u.letters.len() > self.along {
            return;
        }
        let (before, after) = (before.max(u.before), after.max(u.after));
        if before + after + 1 > self.across {
            return;
        }
        let Some(next) = self.walk(addr, &u.letters) else { return };
        let letters = u.letters.clone();
        let len = self.word.len();
        self.word.extend_from_slice(&letters);
        self.groups[gi].count -= 1;

        if self.word.len() >= MIN_WORD_LETTERS && self.fst.node(next).is_final() {
            // Dictionary words are ASCII.
            self.found.insert(String::from_utf8(self.word.clone()).unwrap());
        }
        for g in 0..self.groups.len() {
            if self.groups[g].count == 0 {
                continue;
            }
            for k in 0..self.groups[g].uses.len() {
                self.apply(next, g, k, before, after);
            }
        }

        self.groups[gi].count += 1;
        self.word.truncate(len);
    }
}

/// Solve in one go.
pub fn solve(dict: &Dictionary, tiles: &[Tile], width: u32, height: u32) -> Vec<String> {
    let mut job = SolveJob::new(tiles, width, height);
    job.step(dict, usize::MAX);
    job.finish()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn dict(words: &[&str]) -> Dictionary {
        Dictionary::from_word_list(words.join("\n").as_bytes()).unwrap()
    }

    fn tile(letters: &str, width: u32, height: u32) -> Tile {
        Tile { letters: letters.into(), width, height }
    }

    #[test]
    fn singles() {
        let d = dict(&["cat", "act", "at", "tack"]);
        let found = solve(&d, &[tile("c", 1, 1), tile("a", 1, 1), tile("t", 1, 1)], 8, 9);
        assert_eq!(found, vec!["act", "cat"]); // "at" too short, "tack" needs a k
    }

    #[test]
    fn wide_piece_is_used_whole() {
        let d = dict(&["racer", "race", "care"]);
        let found = solve(&d, &[tile("r", 1, 1), tile("ac", 2, 1), tile("er", 2, 1)], 8, 9);
        assert!(found.contains(&"racer".to_string()));
        // "care" would need "ac" reversed / split — not possible across.
        assert!(!found.contains(&"care".to_string()));
    }

    #[test]
    fn wide_and_tall_combine() {
        // "racist": r + ac (across) + i from tall "ni" + s + t. The old solver missed these.
        let d = dict(&["racist"]);
        let tiles = [tile("r", 1, 1), tile("ac", 2, 1), tile("ni", 1, 2), tile("s", 1, 1), tile("t", 1, 1)];
        assert_eq!(solve(&d, &tiles, 8, 9), vec!["racist"]);
    }

    #[test]
    fn respects_board_limits() {
        let d = dict(&["cat", "cats"]);
        // Vertical only (1 wide): words at most 3 tall.
        let found = solve(&d, &[tile("ca", 1, 2), tile("t", 1, 1), tile("s", 1, 1)], 1, 3);
        assert_eq!(found, vec!["cat"]);
        // A crossing piece must fit across: tall "xc" crossing at c needs a row with one cell above.
        let d = dict(&["cat"]);
        assert!(solve(&d, &[tile("xc", 1, 2), tile("a", 1, 1), tile("t", 1, 1)], 3, 1).is_empty());
        assert_eq!(solve(&d, &[tile("xc", 1, 2), tile("a", 1, 1), tile("t", 1, 1)], 3, 2), vec!["cat"]);
    }

    #[test]
    fn duplicate_pieces() {
        let d = dict(&["sass", "ass"]);
        let found = solve(&d, &[tile("s", 1, 1), tile("s", 1, 1), tile("a", 1, 1), tile("s", 1, 1)], 8, 9);
        assert_eq!(found, vec!["ass", "sass"]);
    }

    #[test]
    fn job_steps_match_one_shot() {
        let d = dict(&["racer", "race", "acre", "care", "car", "arc", "era", "ear"]);
        let tiles = [tile("r", 1, 1), tile("a", 1, 1), tile("c", 1, 1), tile("er", 2, 1), tile("e", 1, 1)];
        let mut job = SolveJob::new(&tiles, 8, 9);
        let total = job.total();
        while !job.step(&d, 1) {}
        assert_eq!(job.done(), total);
        assert_eq!(job.finish(), solve(&d, &tiles, 8, 9));
    }
}
