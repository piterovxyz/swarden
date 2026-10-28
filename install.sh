#!/usr/bin/env sh
set -eu

REPO="piterovxyz/swarden"
BIN_PATH="/usr/local/bin/swarden"
SERVICE_PATH="/etc/systemd/system/swarden.service"
SWARDEN_HOST="${SWARDEN_HOST:-"127.0.0.1"}"
SWARDEN_PORT="${SWARDEN_PORT:-6701}"
VERSION="${VERSION:-latest}"

if [ "$(id -u)" -ne 0 ]; then
    echo "error: this script must be run as root (use sudo)." >&2
    exit 1
fi

if [ "${1:-}" = "--uninstall" ]; then
    echo "uninstalling swarden..."
    systemctl stop swarden 2>/dev/null || true
    systemctl disable swarden 2>/dev/null || true
    rm -f "$SERVICE_PATH" "$BIN_PATH"
    systemctl daemon-reload
    echo "swarden uninstalled successfully."
    exit 0
fi

OS="$(uname -s)"
if [ "$OS" != "Linux" ]; then
    echo "error: swarden only supports linux (detected: $OS)." >&2
    exit 1
fi

ARCH="$(uname -m)"
case "$ARCH" in
    x86_64|amd64) ARCH="amd64" ;;
    aarch64|arm64) ARCH="arm64" ;;
    *)
        echo "error: unsupported architecture: $ARCH" >&2
        exit 1
        ;;
esac

if [ "$VERSION" = "latest" ]; then
    DOWNLOAD_URL="https://github.com/${REPO}/releases/latest/download/swarden-linux-${ARCH}"
else
    DOWNLOAD_URL="https://github.com/${REPO}/releases/download/${VERSION}/swarden-linux-${ARCH}"
fi

TMP_BIN="$(mktemp)"
trap 'rm -f "$TMP_BIN"' EXIT

echo "downloading swarden (${ARCH}) from ${DOWNLOAD_URL}..."
curl -fsSL "$DOWNLOAD_URL" -o "$TMP_BIN"

echo "installing binary to ${BIN_PATH}..."
install -m 0755 "$TMP_BIN" "$BIN_PATH"

echo "configuring systemd service (port ${SWARDEN_HOST}:${SWARDEN_HOST})..."
cat <<EOF > "$SERVICE_PATH"
[Unit]
Description=Swarden Server Monitor
After=network.target

[Service]
Type=simple
ExecStart=${BIN_PATH}
Restart=always
RestartSec=3
Environment=SWARDEN_HOST=${SWARDEN_HOST}
Environment=SWARDEN_PORT=${SWARDEN_PORT}

DynamicUser=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes
NoNewPrivileges=yes

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable swarden
systemctl restart swarden

echo "swarden is installed and running on ${SWARDEN_HOST}:${SWARDEN_HOST}!"
echo "check status: sudo systemctl status swarden"
