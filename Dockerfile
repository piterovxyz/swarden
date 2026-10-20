FROM oven/bun:1-alpine AS frontend
WORKDIR /src/frontend
COPY frontend/package.json frontend/bun.lock ./
RUN bun install --frozen-lockfile
COPY frontend/ ./
RUN bun run build

FROM golang:1.27.2-alpine AS backend
WORKDIR /src
COPY go.mod ./
COPY cmd ./cmd
COPY internal ./internal
COPY --from=frontend /src/internal/server/dist ./internal/server/dist
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -trimpath -o /swarden ./cmd/swarden

FROM scratch
COPY --from=backend /swarden /swarden
USER 65534:65534
EXPOSE 8080
ENTRYPOINT ["/swarden"]
