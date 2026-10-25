.PHONY: all build frontend backend clean dev watch

BIN_NAME := swarden
TARGET := target/release/$(BIN_NAME)

all: build

frontend:
	@echo "...build frontend..."
	cd ui && bun i && bun run build

backend: frontend
	@echo "...build backend..."
	cargo build --release

build: backend
	@echo "build complete: $(TARGET)"

dev:
	@which cargo-watch >/dev/null 2>&1 || (echo "cargo-watch not found" && exit 1)
	@test -d ui/node_modules || (cd ui && bun i)
	@echo "...starting dev mode..."
	@echo "-> backend:  http://localhost:6701"
	@echo "-> frontend: http://localhost:5173"
	@trap 'kill $$CARGO_PID 2>/dev/null' EXIT INT TERM; \
	 cargo watch -i ui -i target -x run & CARGO_PID=$$!; \
	 cd ui && bun run dev

watch: dev

clean:
	@echo "...cleaning build artifacts..."
	cargo clean
	rm -rf ui/dist
