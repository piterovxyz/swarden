.PHONY: all build frontend backend clean

BIN_NAME := swarden
TARGET := target/release/$(BIN_NAME)

all: build

frontend:
	@echo "...build frontend..."
	cd frontend && bun install && bun run build

backend: frontend
	@echo "...build backend..."
	cargo build --release

build: backend
	@echo "build complete: $(TARGET)"

clean:
	@echo "...cleaning build artifacts..."
	cargo clean
	rm -rf frontend/dist
