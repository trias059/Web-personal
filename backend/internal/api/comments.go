package api

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/trias059/web-personal/backend/internal/access"
	"github.com/trias059/web-personal/backend/internal/store"
)

type commentTarget struct {
	TargetType string `json:"target_type" form:"target_type" binding:"required,oneof=vlog memory"`
	TargetID   int64  `json:"target_id" form:"target_id" binding:"required,min=1"`
}

type commentRequest struct {
	commentTarget
	Body string `json:"body" binding:"notblank,max=2000"`
}

// Komentar bisa dibaca siapa pun yang boleh melihat kontennya.
func (s *Server) listComments(c *gin.Context) {
	var target commentTarget
	if !bindQuery(c, &target) || !s.canSeeTarget(c, target) {
		return
	}
	comments, err := s.store.Comments(c.Request.Context(), target.TargetType, target.TargetID)
	respond(c, http.StatusOK, comments, err)
}

func (s *Server) createComment(c *gin.Context) {
	user, _ := currentUser(c)
	if !access.CanComment(user.Role) {
		abort(c, http.StatusForbidden, "role kamu belum bisa berkomentar")
		return
	}
	var req commentRequest
	if !bindJSON(c, &req) || !s.canSeeTarget(c, req.commentTarget) {
		return
	}
	comment, err := s.store.CreateComment(c.Request.Context(), store.Comment{
		TargetType: req.TargetType,
		TargetID:   req.TargetID,
		UserID:     user.ID,
		Body:       strings.TrimSpace(req.Body),
	})
	respond(c, http.StatusCreated, comment, err)
}

// deleteComment: penulis komentar atau pemilik boleh menghapus.
func (s *Server) deleteComment(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	ctx := c.Request.Context()
	comment, err := s.store.Comment(ctx, id)
	if err != nil {
		fail(c, err)
		return
	}
	user, _ := currentUser(c)
	if comment.UserID != user.ID && user.Role != access.SuperAdmin {
		abort(c, http.StatusForbidden, "kamu hanya bisa menghapus komentarmu sendiri")
		return
	}
	respond(c, http.StatusNoContent, nil, s.store.DeleteComment(ctx, id))
}

func (s *Server) canSeeTarget(c *gin.Context, target commentTarget) bool {
	room := contentRooms[target.TargetType]
	if !allowRoom(c, room.room) {
		return false
	}
	_, ok := s.visibleContent(c, room, target.TargetID)
	return ok
}
