mod metrics;
mod server;

use std::sync::Arc;
use std::time::Duration;

use axum::Router;
use axum::routing::get;
use tokio::sync::{RwLock, mpsc};
use tokio::time::sleep;

use crate::metrics::SystemMetrics;
use crate::server::metrics::get_metrics;
use crate::server::state::AppState;

#[tokio::main]
async fn main() {
    let (metrics_tx, mut metrics_rx) = mpsc::channel::<SystemMetrics>(32);

    let shared_metrics = Arc::new(RwLock::new(None));
    let state = AppState {
        metrics: shared_metrics.clone(),
    };

    tokio::spawn(async move {
        let app = Router::new()
            .route("/metrics", get(get_metrics))
            .with_state(state);

        match tokio::net::TcpListener::bind("127.0.0.1:8080").await {
            Ok(listener) => {
                if let Err(e) = axum::serve(listener, app).await {
                    eprintln!("error serve: {}", e);
                }
            }
            Err(e) => {
                eprintln!("error bind listener: {}", e);
            }
        }
    });

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

    tokio::spawn(async move {
        while let Some(metrics) = metrics_rx.recv().await {
            let mut lock = shared_metrics.write().await;
            *lock = Some(metrics);
        }
    });
}
