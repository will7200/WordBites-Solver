//! Normalize word lists into the app's dictionary format and write `index.json`.
//!
//! cargo run --release --bin build-dict -- ../public/dict name=path/to/words.txt [name=...]
use std::fmt::Write as _;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut args = std::env::args().skip(1);
    let Some(out_dir) = args.next() else {
        eprintln!("usage: build-dict <out-dir> name=words.txt [name=words.txt ...]");
        std::process::exit(2);
    };
    std::fs::create_dir_all(&out_dir)?;
    let mut entries = Vec::new();
    for spec in args {
        let (name, path) = spec.split_once('=').ok_or("expected name=path")?;
        let words = solver::normalize(&std::fs::read_to_string(path)?);
        let body = words.join("\n") + "\n";
        std::fs::write(format!("{out_dir}/{name}.txt"), &body)?;
        println!("{name}: {} words, {} bytes", words.len(), body.len());
        entries.push(format!("  \"{name}\": {{ \"words\": {}, \"bytes\": {} }}", words.len(), body.len()));
    }
    let mut index = String::new();
    write!(index, "{{\n{}\n}}\n", entries.join(",\n"))?;
    std::fs::write(format!("{out_dir}/index.json"), index)?;
    Ok(())
}
