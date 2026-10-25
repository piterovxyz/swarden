use std::net::SocketAddr;

pub struct ServerConfig {
    pub port: u16,
}

impl ServerConfig {
    pub fn from_env() -> Self {
        dotenvy::dotenv().ok();

        let port = std::env::var("BACKEND_PORT")
            .ok()
            .and_then(|p| p.parse().ok())
            .unwrap_or(6701);

        Self { port }
    }

    pub fn socket_addr(&self) -> Result<SocketAddr, std::net::AddrParseError> {
        format!("127.0.0.1:{}", self.port).parse()
    }
}
