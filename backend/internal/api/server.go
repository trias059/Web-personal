// Package api berisi HTTP handler dan middleware (Gin) untuk semua room.
package api

import (
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"github.com/trias059/web-personal/backend/internal/auth"
	"github.com/trias059/web-personal/backend/internal/store"
)

const maxBodyBytes = 1 << 20

type Server struct {
	store  *store.Store
	tokens *auth.Tokens
}

func New(st *store.Store, tokens *auth.Tokens) *Server {
	return &Server{store: st, tokens: tokens}
}

// Router menyusun semua route /api beserta proteksi role-nya.
func (s *Server) Router(corsOrigins []string) *gin.Engine {
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery(), limitBody(maxBodyBytes), cors.New(cors.Config{
		AllowOrigins:  corsOrigins,
		AllowWildcard: true,
		AllowMethods:  []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete},
		AllowHeaders:  []string{"Authorization", "Content-Type"},
		MaxAge:        12 * time.Hour,
	}))

	r.GET("/api/health", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"status": "ok"}) })

	api := r.Group("/api", s.identify)

	authRoutes := api.Group("/auth")
	authRoutes.POST("/register", s.register)
	authRoutes.POST("/login", s.login)
	authRoutes.GET("/me", requireLogin, s.me)

	return r
}
