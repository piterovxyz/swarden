use metrics::SystemMetrics;
use tokio::sync::mpsc;
use tokio::time::{Duration, sleep};

mod metrics;
mod terminal;

#[tokio::main]
async fn main() {
    let (metrics_tx, mut metrics_rx) = mpsc::channel::<SystemMetrics>(32);

    tokio::spawn(async move {
        let mut collector = metrics::MetricsCollector::new();
        loop {
            if let Ok(metrics) = collector.collect()
                && metrics_tx.send(metrics).await.is_err()
            {
                break;
            }
            sleep(Duration::from_millis(200)).await;
        }
    });

    while let Some(metrics) = metrics_rx.recv().await {
        if let Err(e) = terminal::clear() {
            eprintln!("error clear terminal: {}", e);
        }
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
            (metrics.mem.total - metrics.mem.available) as f64 / (metrics.mem.total as f64 / 100.0)
        );
        println!("CPU Usage: {:.1}%", metrics.cpu.usage_percent);
    }
}
