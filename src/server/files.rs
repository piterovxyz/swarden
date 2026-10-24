use axum::{
    body::Body,
    extract::Path,
    http::{StatusCode, header},
    response::Response,
};
use rust_embed::Embed;

#[derive(Embed)]
#[folder = "ui/dist/"]
pub struct Assets;

pub async fn index() -> Response {
    serve_file("index.html")
}

pub async fn static_file(Path(path): Path<String>) -> Response {
    serve_file(&path)
}

fn serve_file(path: &str) -> Response {
    match Assets::get(path) {
        Some(file) => {
            let content_type = mime_guess::from_path(path).first_or_octet_stream();

            Response::builder()
                .status(StatusCode::OK)
                .header(header::CONTENT_TYPE, content_type.as_ref())
                .body(Body::from(file.data))
                .unwrap()
        }
        None => Response::builder()
            .status(StatusCode::NOT_FOUND)
            .body(Body::from("404 Not Found"))
            .unwrap(),
    }
}
