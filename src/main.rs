mod metrics;
mod server;

use std::time::Duration;

use axum::Router;
use axum::routing::get;
use tokio::net::TcpListener;
use tokio::sync::broadcast;
use tokio::time::sleep;
use tower_http::cors::CorsLayer;

use crate::metrics::{MetricsCollector, SystemMetrics};
use crate::server::metrics::sse_handler;
use crate::server::state::AppState;

#[tokio::main]
async fn main() {
    let cors = CorsLayer::permissive();
    let (tx, _) = broadcast::channel::<SystemMetrics>(16);

    let state = AppState {
        metrics: tx.clone(),
    };

    tokio::spawn(async move {
        let mut collector = MetricsCollector::new();
        loop {
            if let Ok(metrics) = collector.collect() {
                let _ = tx.send(metrics);
            }
            sleep(Duration::from_millis(200)).await;
        }
    });

    let app = Router::new()
        .route("/metrics", get(sse_handler))
        .layer(cors)
        .with_state(state);

    match TcpListener::bind("127.0.0.1:8080").await {
        Ok(listener) => {
            if let Err(e) = axum::serve(listener, app).await {
                eprintln!("error serve: {}", e);
            }
        }
        Err(e) => {
            eprintln!("error bind listener: {}", e);
        }
    }
}
