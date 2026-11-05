package main

import (
	"context"
	"errors"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"

	"github.com/trias059/web-personal/backend/internal/access"
	"github.com/trias059/web-personal/backend/internal/api"
	"github.com/trias059/web-personal/backend/internal/auth"
	"github.com/trias059/web-personal/backend/internal/config"
	"github.com/trias059/web-personal/backend/internal/store"
)

func main() {
	if err := run(); err != nil {
		log.Fatal(err)
	}
}

func run() error {
	// File .env opsional, hanya untuk development lokal.
	if err := godotenv.Load(); err != nil && !errors.Is(err, fs.ErrNotExist) {
		return fmt.Errorf("membaca .env: %w", err)
	}
	cfg, err := config.Load()
	if err != nil {
		return err
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	st, err := store.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer st.Close()

	if err := ensureOwner(ctx, st, cfg.Owner); err != nil {
		return err
	}

	server := api.New(st, auth.NewTokens(cfg.JWTSecret, cfg.JWTTTL))
	httpServer := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           server.Router(cfg.CORSOrigins),
		ReadHeaderTimeout: 10 * time.Second,
	}

	serveErr := make(chan error, 1)
	go func() { serveErr <- httpServer.ListenAndServe() }()
	log.Printf("server berjalan di port %s", cfg.Port)

	select {
	case err := <-serveErr:
		return err
	case <-ctx.Done():
	}
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	return httpServer.Shutdown(shutdownCtx)
}

// ensureOwner membuat akun super_admin dari OWNER_EMAIL dan OWNER_PASSWORD jika belum ada.
func ensureOwner(ctx context.Context, st *store.Store, owner config.Owner) error {
	exists, err := st.HasRole(ctx, access.SuperAdmin)
	if err != nil || exists {
		return err
	}
	if owner.Email == "" || owner.Password == "" {
		log.Println("belum ada akun super_admin: isi OWNER_EMAIL dan OWNER_PASSWORD lalu restart server")
		return nil
	}
	_, err = st.UserByEmail(ctx, owner.Email)
	if err == nil {
		return fmt.Errorf("OWNER_EMAIL %s sudah dipakai akun biasa; pakai email lain", owner.Email)
	}
	if !errors.Is(err, store.ErrNotFound) {
		return err
	}

	hash, err := auth.HashPassword(owner.Password)
	if err != nil {
		return err
	}
	if _, err := st.CreateUser(ctx, store.User{
		Name:         owner.Name,
		Email:        owner.Email,
		PasswordHash: hash,
		Role:         access.SuperAdmin,
	}); err != nil {
		return fmt.Errorf("membuat akun super_admin: %w", err)
	}
	log.Printf("akun super_admin %s dibuat", owner.Email)
	return nil
}
