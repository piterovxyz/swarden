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


```bash
cargo build --release
```

binary will be at `target/release/swarden`.

## uninstalling

```bash
curl -fsSL https://raw.githubusercontent.com/piterovxyz/swarden/main/install.sh | sudo sh -s -- --uninstall
```
