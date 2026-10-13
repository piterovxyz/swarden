use std::{io, thread, time::Duration};

mod metrics;
mod terminal;

fn main() -> io::Result<()> {
    terminal::clear()?;
    let mut collector = metrics::MetricsCollector::new();
    loop {
        if let Ok(metrics) = collector.collect() {
            println!("Available RAM: {} MB", metrics.mem.available_mb);
            println!("Total RAM: {} MB", metrics.mem.total_mb);
            println!("RAM Usage: {:.1}%", metrics.mem.used_percent);
        }

        thread::sleep(Duration::from_secs(2));
        terminal::clear()?;
    }
}
