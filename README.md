# swarden

lightweight monitoring for linux servers

## installing

```bash
curl -fsSL https://raw.githubusercontent.com/piterovxyz/swarden/main/install.sh | sudo sh
```

default port in 6701, to use custom port use argument:

```bash
curl -fsSL https://raw.githubusercontent.com/piterovxyz/swarden/main/install.sh | sudo BACKEND_PORT=8080 sh
```

## building from source

prerequisites:

- [rust](https://rustup.rs/)
- [bun](https://bun.sh/)

```bash
git clone https://github.com/piterovxyz/swarden.git
cd swarden
make build
```

or manually without `make`:

```bash
cd ui && bun i && bun run build && cd ..
cargo build --release
```

binary will be at `target/release/swarden`.

## development

requires `bun` and `cargo-watch`:

```bash
cargo install cargo-watch
```

start dev mode with hot reload:

```bash
make dev
```

this starts:

- backend: `http://127.0.0.1:6701`
- frontend: `http://127.0.0.1:5173`

ports can be customized with environment variables or in `.env`:

```bash
BACKEND_PORT=8080 FRONTEND_PORT=3000 make dev
```

## uninstalling

```bash
curl -fsSL https://raw.githubusercontent.com/piterovxyz/swarden/main/install.sh | sudo sh -s -- --uninstall
```
