BINARY_NAME := swarden
DIST_DIR := internal/server/dist
BUILD_FLAGS := -ldflags="-s -w" -trimpath

.PHONY: all ui test build clean

all: build

ui:
	cd ui && bun i && bun run build

test: ui
	go test ./...

build: test
	CGO_ENABLED=0 go build $(BUILD_FLAGS) -o bin/$(BINARY_NAME) ./cmd/swarden
	strip bin/$(BINARY_NAME)

clean:
	rm -rf bin $(DIST_DIR)
