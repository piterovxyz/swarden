mod config;
mod metrics;
mod server;

use std::time::Duration;

use axum::Router;
use axum::routing::get;
use tokio::net::TcpListener;
use tokio::sync::broadcast;
use tokio::time::sleep;

#[cfg(debug_assertions)]
use tower_http::cors::CorsLayer;

use crate::config::ServerConfig;
use crate::metrics::{MetricsCollector, SystemMetrics};
use crate::server::metrics::sse_handler;
use crate::server::state::AppState;

#[tokio::main]
async fn main() {
    let config = ServerConfig::from_env();
    let (tx, _) = broadcast::channel::<SystemMetrics>(32);

    let state = AppState {
        metrics: tx.clone(),
    };

    tokio::spawn(async move {
        let mut collector = MetricsCollector::new();
        loop {
            if let Ok(metrics) = collector.collect() {
                let _ = tx.send(metrics);
            }
            sleep(Duration::from_millis(500)).await;
        }
    });

    let app = Router::new()
        .route("/", get(sse_handler));

    #[cfg(debug_assertions)]
    let app = app.layer(CorsLayer::permissive());

    let app = app.with_state(state);

    let addr = match config.socket_addr() {
        Ok(addr) => addr,
        Err(e) => {
            eprintln!("invalid listen addr: {}", e);
            std::process::exit(1);
        }
    };

    match TcpListener::bind(addr).await {
        Ok(listener) => {
            let local_addr = listener.local_addr().expect("failed to get local address");
            println!("swarden running on {local_addr}");

            if let Err(e) = axum::serve(listener, app)
                .with_graceful_shutdown(shutdown_signal())
                .await
            {
                eprintln!("error serve: {}", e);
            }
        }
        Err(e) => {
            eprintln!("error bind listener: {}", e);
        }
    }
}

async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }
}
