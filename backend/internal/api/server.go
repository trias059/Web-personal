// Package api berisi HTTP handler dan middleware (Gin) untuk semua room.
package api

import (
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"github.com/trias059/web-personal/backend/internal/access"
	"github.com/trias059/web-personal/backend/internal/ai"
	"github.com/trias059/web-personal/backend/internal/auth"
	"github.com/trias059/web-personal/backend/internal/store"
)

const maxBodyBytes = 1 << 20

type Server struct {
	store  *store.Store
	tokens *auth.Tokens
	ai     *ai.Client
}

func New(st *store.Store, tokens *auth.Tokens, aiClient *ai.Client) *Server {
	return &Server{store: st, tokens: tokens, ai: aiClient}
}

// Router menyusun semua route /api. Aturannya: membaca butuh akses room
// (requireRoom), mengubah data hanya untuk pemilik (ownerOnly), kecuali komentar.
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

	biodata := api.Group("/profile", requireRoom(access.Biodata))
	biodata.GET("", s.getProfile)
	biodata.PUT("", ownerOnly, s.updateProfile)
	biodata.POST("/details", ownerOnly, s.createDetail)
	biodata.PUT("/details/:id", ownerOnly, s.updateDetail)
	biodata.DELETE("/details/:id", ownerOnly, s.deleteDetail)

	for _, room := range contentRooms {
		s.contentRoutes(api.Group(room.path, requireRoom(room.room)), room)
	}

	comments := api.Group("/comments")
	comments.GET("", s.listComments)
	comments.POST("", requireLogin, s.createComment)
	comments.DELETE("/:id", requireLogin, s.deleteComment)

	learning := api.Group("/learning", requireRoom(access.Learning))
	learning.GET("", s.listLearning)
	learning.POST("", ownerOnly, s.createLearning)
	learning.GET("/:id", s.getLearning)
	learning.PUT("/:id", ownerOnly, s.updateLearning)
	learning.DELETE("/:id", ownerOnly, s.deleteLearning)
	learning.GET("/:id/flashcards", s.listFlashcards)
	learning.POST("/:id/flashcards", ownerOnly, s.createFlashcards)

	flashcards := api.Group("/flashcards", requireRoom(access.Learning))
	flashcards.GET("/due", s.dueFlashcards)
	flashcards.POST("/:id/review", ownerOnly, s.reviewFlashcard)
	flashcards.DELETE("/:id", ownerOnly, s.deleteFlashcard)

	curhat := api.Group("/curhat", requireRoom(access.Curhat))
	curhat.GET("", s.listCurhat)
	curhat.POST("", ownerOnly, s.createCurhat)
	curhat.PUT("/:id", ownerOnly, s.updateCurhat)
	curhat.DELETE("/:id", ownerOnly, s.deleteCurhat)
	curhat.POST("/:id/reply", ownerOnly, s.replyCurhat)

	aiRoutes := api.Group("/ai")
	aiRoutes.POST("/chat", s.chat) // room dicek per mode di handler
	aiRoutes.POST("/quiz", requireRoom(access.Learning), s.quiz)
	aiRoutes.POST("/sentiment", requireRoom(access.Curhat), s.sentiment)

	admin := api.Group("/admin", requireRoom(access.Data))
	admin.GET("/stats", s.stats)
	admin.GET("/users", s.listUsers)
	admin.PATCH("/users/:id", ownerOnly, s.updateUserRole)
	admin.DELETE("/users/:id", ownerOnly, s.deleteUser)
	admin.GET("/comments", s.recentComments)

	return r
}
