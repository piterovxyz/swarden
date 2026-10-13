use std::{io, thread, time::Duration};

mod metrics;
mod terminal;

fn main() -> io::Result<()> {
    terminal::clear()?;
    let mut collector = metrics::MetricsCollector::new();
    loop {
        if let Ok(metrics) = collector.collect() {
            terminal::clear()?;
            println!(
                "Available RAM: {:.1} GB",
                metrics.mem.available as f64 / 1024.0 / 1024.0
            );
            println!(
                "Total RAM: {:.1} GB",
                metrics.mem.total as f64 / 1024.0 / 1024.0
            );
            println!(
                "Used RAM: {:.1} GB",
                (metrics.mem.total as f64 / 1024.0 / 1024.0)
                    - (metrics.mem.available as f64 / 1024.0 / 1024.0)
            );
            println!(
                "RAM Usage: {:.1}%",
                (metrics.mem.total - metrics.mem.available) as f64
                    / (metrics.mem.total as f64 / 100.0)
            );
        }

        thread::sleep(Duration::from_millis(200));
    }
}
