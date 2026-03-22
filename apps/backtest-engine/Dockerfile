FROM golang:1.26-alpine AS builder

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum* ./
RUN go mod download

# Copy source
COPY . .

# Build
RUN CGO_ENABLED=0 GOOS=linux go build -o /bin/backtest-engine ./cmd/server

# ── Runtime ──
FROM alpine:3.21

RUN apk add --no-cache ca-certificates tzdata
COPY --from=builder /bin/backtest-engine /bin/backtest-engine

EXPOSE 50051 8080

ENTRYPOINT ["/bin/backtest-engine"]
