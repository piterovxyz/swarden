use axum::extract::State;

use crate::server::state::AppState;

pub async fn get_metrics(state: State<AppState>) -> String {
    if let Some(metrics) = state.metrics.read().await.as_ref() {
        format!(
            "Available RAM: {:.1} GB\nTotal RAM: {:.1} GB\nUsed RAM: {:.1} GB\nRAM Usage: {:.1}%\nCPU Usage: {:.1}%",
            metrics.mem.available as f64 / 1024.0 / 1024.0,
            metrics.mem.total as f64 / 1024.0 / 1024.0,
            (metrics.mem.total as f64 / 1024.0 / 1024.0)
                - (metrics.mem.available as f64 / 1024.0 / 1024.0),
            (metrics.mem.total - metrics.mem.available) as f64 / (metrics.mem.total as f64 / 100.0),
            metrics.cpu.usage_percent
        )
    } else {
        "metrics isn't ready".to_string()
    }
}
