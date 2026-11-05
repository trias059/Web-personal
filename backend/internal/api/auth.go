package api

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/trias059/web-personal/backend/internal/access"
	"github.com/trias059/web-personal/backend/internal/auth"
	"github.com/trias059/web-personal/backend/internal/store"
)

type registerRequest struct {
	Name     string `json:"name" binding:"notblank,max=100"`
	Email    string `json:"email" binding:"required,email,max=254"`
	Password string `json:"password" binding:"required,min=8,max=72"`
}

type loginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// sessionUser adalah data user untuk frontend, termasuk room yang boleh dibuka.
type sessionUser struct {
	store.User
	Rooms      []access.Room `json:"rooms"`
	CanComment bool          `json:"can_comment"`
}

func newSessionUser(u store.User) sessionUser {
	return sessionUser{User: u, Rooms: access.Rooms(u.Role), CanComment: access.CanComment(u.Role)}
}

// register membuat akun baru dengan role teman; pemilik bisa menaikkan role-nya
// lewat Data Management.
func (s *Server) register(c *gin.Context) {
	var req registerRequest
	if !bindJSON(c, &req) {
		return
	}
	// bcrypt hanya memproses 72 byte pertama; validator menghitung karakter, bukan byte.
	if len(req.Password) > 72 {
		abort(c, http.StatusBadRequest, "password maksimal 72 byte")
		return
	}
	ctx := c.Request.Context()
	email := normalizeEmail(req.Email)

	_, err := s.store.UserByEmail(ctx, email)
	if err == nil {
		abort(c, http.StatusConflict, "email sudah terdaftar")
		return
	}
	if !errors.Is(err, store.ErrNotFound) {
		fail(c, err)
		return
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		fail(c, err)
		return
	}
	user, err := s.store.CreateUser(ctx, store.User{
		Name:         strings.TrimSpace(req.Name),
		Email:        email,
		PasswordHash: hash,
		Role:         access.Teman,
	})
	if err != nil {
		fail(c, err)
		return
	}
	s.respondSession(c, http.StatusCreated, user)
}

func (s *Server) login(c *gin.Context) {
	var req loginRequest
	if !bindJSON(c, &req) {
		return
	}
	user, err := s.store.UserByEmail(c.Request.Context(), normalizeEmail(req.Email))
	if err != nil && !errors.Is(err, store.ErrNotFound) {
		fail(c, err)
		return
	}
	if !auth.ComparePassword(user.PasswordHash, req.Password) {
		abort(c, http.StatusUnauthorized, "email atau password salah")
		return
	}
	s.respondSession(c, http.StatusOK, user)
}

func (s *Server) me(c *gin.Context) {
	user, _ := currentUser(c)
	c.JSON(http.StatusOK, gin.H{"user": newSessionUser(user)})
}

func (s *Server) respondSession(c *gin.Context, status int, user store.User) {
	token, err := s.tokens.Issue(user.ID)
	if err != nil {
		fail(c, err)
		return
	}
	c.JSON(status, gin.H{"token": token, "user": newSessionUser(user)})
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}
