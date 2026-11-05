package api

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/trias059/web-personal/backend/internal/access"
)

// Role yang bisa diberikan lewat Data Management. super_admin sengaja tidak
// termasuk: hanya ada satu pemilik.
type roleRequest struct {
	Role access.Role `json:"role" binding:"required,oneof=keluarga teman_dekat teman"`
}

func (s *Server) stats(c *gin.Context) {
	stats, err := s.store.Stats(c.Request.Context())
	respond(c, http.StatusOK, stats, err)
}

func (s *Server) listUsers(c *gin.Context) {
	users, err := s.store.Users(c.Request.Context())
	respond(c, http.StatusOK, users, err)
}

func (s *Server) updateUserRole(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	var req roleRequest
	if !bindJSON(c, &req) || !s.notOwnerAccount(c, id) {
		return
	}
	user, err := s.store.UpdateUserRole(c.Request.Context(), id, req.Role)
	respond(c, http.StatusOK, user, err)
}

func (s *Server) deleteUser(c *gin.Context) {
	id, ok := pathID(c)
	if !ok || !s.notOwnerAccount(c, id) {
		return
	}
	respond(c, http.StatusNoContent, nil, s.store.DeleteUser(c.Request.Context(), id))
}

func (s *Server) recentComments(c *gin.Context) {
	comments, err := s.store.RecentComments(c.Request.Context(), 100)
	respond(c, http.StatusOK, comments, err)
}

// notOwnerAccount menolak perubahan pada akun super_admin agar pemilik tidak
// bisa terkunci dari rumahnya sendiri.
func (s *Server) notOwnerAccount(c *gin.Context, id int64) bool {
	user, err := s.store.UserByID(c.Request.Context(), id)
	if err != nil {
		fail(c, err)
		return false
	}
	if user.Role == access.SuperAdmin {
		abort(c, http.StatusBadRequest, "akun pemilik tidak bisa diubah atau dihapus")
		return false
	}
	return true
}
