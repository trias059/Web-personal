# Build: biner statis (SQLite memakai driver pure Go, jadi CGO tidak dibutuhkan).
FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server && mkdir -p /out/data

# Runtime: image minimal tanpa shell, berjalan sebagai user non-root.
FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /app
COPY --from=build /out/server /app/server
# Folder data yang bisa ditulis, untuk SQLite jika DATABASE_URL tidak menunjuk ke PostgreSQL.
COPY --from=build --chown=nonroot:nonroot /out/data /app/data
ENV GIN_MODE=release PORT=8080
EXPOSE 8080
ENTRYPOINT ["/app/server"]
