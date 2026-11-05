// Package config membaca konfigurasi aplikasi dari environment variable.
package config

import (
	"errors"
	"fmt"
	"os"
	"strings"
	"time"
)

type Config struct {
	Port string
	// DatabaseURL yang diawali postgres:// atau postgresql:// memakai PostgreSQL;
	// nilai lain dianggap path file SQLite.
	DatabaseURL string
	JWTSecret   string
	JWTTTL      time.Duration
	CORSOrigins []string
	Owner       Owner
	AI          AI
}

// Owner adalah akun super_admin yang dibuat saat server start jika belum ada.
type Owner struct {
	Name     string
	Email    string
	Password string
}

// AI menunjuk ke endpoint chat completions yang kompatibel dengan OpenAI.
type AI struct {
	BaseURL string
	APIKey  string
	Model   string
}

func Load() (Config, error) {
	ttl, err := time.ParseDuration(getenv("JWT_TTL", "72h"))
	if err != nil {
		return Config{}, fmt.Errorf("JWT_TTL tidak valid: %w", err)
	}

	cfg := Config{
		Port:        getenv("PORT", "8080"),
		DatabaseURL: getenv("DATABASE_URL", "data/rumah.db"),
		JWTSecret:   os.Getenv("JWT_SECRET"),
		JWTTTL:      ttl,
		CORSOrigins: splitList(getenv("CORS_ORIGINS", "http://localhost:5173")),
		Owner: Owner{
			Name:     getenv("OWNER_NAME", "Trias Aji Lomanto"),
			Email:    strings.ToLower(strings.TrimSpace(os.Getenv("OWNER_EMAIL"))),
			Password: os.Getenv("OWNER_PASSWORD"),
		},
		AI: AI{
			BaseURL: os.Getenv("AI_BASE_URL"),
			APIKey:  os.Getenv("AI_API_KEY"),
			Model:   os.Getenv("AI_MODEL"),
		},
	}

	if len(cfg.JWTSecret) < 32 {
		return Config{}, errors.New("JWT_SECRET wajib diisi minimal 32 karakter (contoh: openssl rand -hex 32)")
	}
	if cfg.Owner.Password != "" && len(cfg.Owner.Password) < 8 {
		return Config{}, errors.New("OWNER_PASSWORD minimal 8 karakter")
	}
	for _, origin := range cfg.CORSOrigins {
		if origin != "*" && !strings.HasPrefix(origin, "http://") && !strings.HasPrefix(origin, "https://") {
			return Config{}, fmt.Errorf("CORS_ORIGINS %q harus diawali http:// atau https://", origin)
		}
	}
	return cfg, nil
}

func getenv(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}

func splitList(s string) []string {
	var out []string
	for _, part := range strings.Split(s, ",") {
		if p := strings.TrimSpace(part); p != "" {
			out = append(out, p)
		}
	}
	return out
}
