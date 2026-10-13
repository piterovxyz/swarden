use std::{io, io::Write};

pub fn clear() -> io::Result<()> {
    let stdout = io::stdout();
    let mut handle = stdout.lock();
    handle.write_all(b"\x1B[2J\x1B[3J\x1B[H")?;
    handle.flush()
}
