.PHONY: all build frontend backend clean dev run

BIN_NAME := swarden
BIN_DIR := bin
DIST_DIR := internal/server/dist
TARGET := $(BIN_DIR)/$(BIN_NAME)
MAIN := ./cmd/swarden
GO ?= go

all: build

frontend:
	@echo "...build frontend..."
	cd frontend && bun install && bun run build

backend: frontend
	@echo "...build backend..."
	@mkdir -p $(BIN_DIR)
	$(GO) build -trimpath -o $(TARGET) $(MAIN)

build: backend
	@echo "build complete: $(TARGET)"

run: build
	./$(TARGET)

dev:
	@echo "...running dev mode..."
	@test -d $(DIST_DIR) || $(MAKE) frontend
	(trap 'kill 0' SIGINT SIGTERM; \
		$(GO) run $(MAIN) & \
		cd frontend && bun run dev)

clean:
	@echo "...cleaning build artifacts..."
	rm -rf $(BIN_DIR) $(DIST_DIR)
	$(GO) clean
