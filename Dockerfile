FROM golang:1.27.2-alpine AS backend
WORKDIR /src

COPY go.mod go.sum* ./
RUN go mod download

COPY cmd ./cmd
COPY internal ./internal

RUN CGO_ENABLED=0 go build \
    -ldflags="-s -w" \
    -trimpath \
    -o /swarden ./cmd/swarden

FROM scratch
COPY --from=backend /swarden /swarden
USER 65534:65534
EXPOSE 8080
ENTRYPOINT ["/swarden"]