use axum::Json;
use axum::extract::State;

use crate::metrics::SystemMetrics;
use crate::server::state::AppState;

pub async fn get_metrics(state: State<AppState>) -> Result<Json<SystemMetrics>, &'static str> {
    if let Some(metrics) = state.metrics.read().await.as_ref() {
        Ok(Json(*metrics))
    } else {
        Err("metrics isn't ready")
    }
}
