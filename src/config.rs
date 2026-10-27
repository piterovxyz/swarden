use std::net::SocketAddr;

pub struct ServerConfig {
    pub host: String,
    pub port: u16,
}

impl ServerConfig {
    pub fn from_env() -> Self {
        dotenvy::dotenv().ok();

        let host = std::env::var("HOST")
            .ok()
            .unwrap_or(String::from("127.0.0.1"));

        let port = std::env::var("PORT")
            .ok()
            .and_then(|p| p.parse().ok())
            .unwrap_or(6701);

        Self { host, port }
    }

    pub fn socket_addr(&self) -> Result<SocketAddr, std::net::AddrParseError> {
        format!("{}:{}", self.host, self.port).parse()
    }
}
