use axum::extract::State;
use axum::response::{Sse, sse::Event, sse::KeepAlive};
use tokio_stream::StreamExt;
use tokio_stream::wrappers::BroadcastStream;

use crate::server::state::AppState;

pub async fn sse_handler(
    state: State<AppState>,
) -> Sse<impl tokio_stream::Stream<Item = Result<Event, axum::BoxError>>> {
    let rx = state.metrics.subscribe();

    let stream = BroadcastStream::new(rx).filter_map(|msg| match msg {
        Ok(metrics) => {
            let json = serde_json::to_string(&metrics).ok()?;
            Some(Ok(Event::default().data(json)))
        }
        Err(_) => None,
    });

    Sse::new(stream).keep_alive(KeepAlive::default())
}
