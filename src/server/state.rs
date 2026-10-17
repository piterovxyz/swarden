use tokio::sync::broadcast;

use crate::metrics::SystemMetrics;

#[derive(Clone)]
pub struct AppState {
    pub metrics: broadcast::Sender<SystemMetrics>,
}
