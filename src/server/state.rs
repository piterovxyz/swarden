use std::sync::Arc;

use tokio::sync::RwLock;

use crate::metrics::SystemMetrics;

#[derive(Clone)]
pub struct AppState {
    pub metrics: Arc<RwLock<Option<SystemMetrics>>>,
}
