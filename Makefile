.PHONY: all build frontend backend clean watch

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
	@echo "...running dev mode..."
		(trap 'kill 0' SIGINT; \
		 cargo watch -i ui -i target -x run & \
		 cd ui && bun run dev)

clean:
	@echo "...cleaning build artifacts..."
	cargo clean
	rm -rf ui/dist
