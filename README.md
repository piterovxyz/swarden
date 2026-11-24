# swarden

lightweight monitoring for linux servers

## installing

```bash
curl -fsSL https://raw.githubusercontent.com/piterovxyz/swarden/main/install.sh | sudo sh
```

default host in 127.0.0.1 and port in 6701, to use custom port use argument:

```bash
curl -fsSL https://raw.githubusercontent.com/piterovxyz/swarden/main/install.sh | sudo SWARDEN_PORT=8080 SWARDEN_HOST=0.0.0.0 sh
```

## building from source

```bash
CGO_ENABLED=0 go build -ldflags="-s -w" -trimpath -o bin/swarden ./cmd/swarden
```

binary will be at `bin/swarden`.

## uninstalling

```bash
curl -fsSL https://raw.githubusercontent.com/piterovxyz/swarden/main/install.sh | sudo sh -s -- --uninstall
```
