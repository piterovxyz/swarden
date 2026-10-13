use std::{io, io::Write, thread, time::Duration};

mod metrics;

fn main() -> io::Result<()> {
    clear_terminal()?;
    let mut collector = metrics::MetricsCollector::new();
    loop {
        if let Ok(metrics) = collector.collect() {
            println!("Available RAM: {} MB", metrics.mem.available_mb);
            println!("Total RAM: {} MB", metrics.mem.total_mb);
            println!("RAM Usage: {:.1}%", metrics.mem.used_percent);
        }

        thread::sleep(Duration::from_secs(2));
        clear_terminal()?;
    }
}

fn clear_terminal() -> io::Result<()> {
    let stdout = io::stdout();
    let mut handle = stdout.lock();
    handle.write_all(b"\x1B[2J\x1B[1;1H")?;
    handle.flush()
}
