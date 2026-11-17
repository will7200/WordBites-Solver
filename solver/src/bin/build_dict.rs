//! Build the app's dictionaries: normalize word lists, serialize each as an FST set, and gzip it
//! (`<name>.fst.gz`; static hosts like GitHub Pages don't compress binary files themselves).
//! Also writes `index.json` with word counts and compressed/uncompressed sizes.
//!
//! cargo run --release --features cli --bin build-dict -- ../public/dict name=../dictionaries/name.txt [...]
//!
//! Pass `--write-normalized` to also rewrite each input file in normalized form.

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut args: Vec<String> = std::env::args().skip(1).collect();
    let normalize_inputs = if let Some(i) = args.iter().position(|a| a == "--write-normalized") {
        args.remove(i);
        true
    } else {
        false
    };
    let Some((out_dir, specs)) = args.split_first() else {
        eprintln!("usage: build-dict [--write-normalized] <out-dir> name=words.txt [name=words.txt ...]");
        std::process::exit(2);
    };
    std::fs::create_dir_all(out_dir)?;
    let mut entries = Vec::new();
    for spec in specs {
        let (name, path) = spec.split_once('=').ok_or("expected name=path")?;
        let words = solver::normalize(&std::fs::read_to_string(path)?);
        if normalize_inputs {
            std::fs::write(path, words.join("\n") + "\n")?;
        }
        let set = fst::Set::from_iter(words.iter())?;
        let bytes = set.as_fst().as_bytes();
        let mut gz = flate2::write::GzEncoder::new(Vec::new(), flate2::Compression::best());
        std::io::Write::write_all(&mut gz, bytes)?;
        let gz = gz.finish()?;
        std::fs::write(format!("{out_dir}/{name}.fst.gz"), &gz)?;
        println!("{name}: {} words, {} bytes ({} gzipped)", words.len(), bytes.len(), gz.len());
        entries.push(format!(
            "  \"{name}\": {{ \"words\": {}, \"bytes\": {}, \"gzipBytes\": {} }}",
            words.len(),
            bytes.len(),
            gz.len()
        ));
    }
    std::fs::write(format!("{out_dir}/index.json"), format!("{{\n{}\n}}\n", entries.join(",\n")))?;
    Ok(())
}
