package api

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/trias059/web-personal/backend/internal/access"
	"github.com/trias059/web-personal/backend/internal/store"
)

const userKey = "user"

// identify membaca token Bearer (jika ada) dan menyimpan user ke context.
// Request tanpa token diperlakukan sebagai pengunjung umum.
func (s *Server) identify(c *gin.Context) {
	header := c.GetHeader("Authorization")
	if header == "" {
		c.Next()
		return
	}
	token, ok := strings.CutPrefix(header, "Bearer ")
	if !ok {
		abort(c, http.StatusUnauthorized, "header Authorization harus berformat 'Bearer <token>'")
		return
	}
	userID, err := s.tokens.Parse(token)
	if err != nil {
		abort(c, http.StatusUnauthorized, "sesi tidak valid atau sudah kedaluwarsa, silakan login lagi")
		return
	}
	user, err := s.store.UserByID(c.Request.Context(), userID)
	if errors.Is(err, store.ErrNotFound) {
		abort(c, http.StatusUnauthorized, "akun tidak ditemukan, silakan login lagi")
		return
	}
	if err != nil {
		fail(c, err)
		return
	}
	c.Set(userKey, user)
	c.Next()
}

// currentUser mengembalikan user yang login; ok bernilai false untuk pengunjung umum.
func currentUser(c *gin.Context) (store.User, bool) {
	user, ok := c.Get(userKey)
	if !ok {
		return store.User{}, false
	}
	return user.(store.User), true
}

func currentRole(c *gin.Context) access.Role {
	if user, ok := currentUser(c); ok {
		return user.Role
	}
	return access.Umum
}

func requireLogin(c *gin.Context) {
	if _, ok := currentUser(c); !ok {
		abort(c, http.StatusUnauthorized, "silakan login terlebih dahulu")
		return
	}
	c.Next()
}

func requireRoom(room access.Room) gin.HandlerFunc {
	return func(c *gin.Context) {
		if allowRoom(c, room) {
			c.Next()
		}
	}
}

// allowRoom mengirim 401/403 dan mengembalikan false jika role tidak boleh masuk room.
func allowRoom(c *gin.Context, room access.Room) bool {
	role := currentRole(c)
	switch {
	case access.CanEnter(role, room):
		return true
	case role == access.Umum:
		abort(c, http.StatusUnauthorized, "silakan login untuk membuka room ini")
	default:
		abort(c, http.StatusForbidden, "role kamu tidak punya akses ke room ini")
	}
	return false
}

// ownerOnly membatasi aksi tulis untuk pemilik (super_admin).
func ownerOnly(c *gin.Context) {
	switch currentRole(c) {
	case access.SuperAdmin:
		c.Next()
	case access.Umum:
		abort(c, http.StatusUnauthorized, "silakan login terlebih dahulu")
	default:
		abort(c, http.StatusForbidden, "hanya pemilik yang boleh melakukan aksi ini")
	}
}

func limitBody(maxBytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)
		c.Next()
	}
}
