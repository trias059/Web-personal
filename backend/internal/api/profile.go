package api

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/trias059/web-personal/backend/internal/access"
	"github.com/trias059/web-personal/backend/internal/store"
)

type profileRequest struct {
	FullName string   `json:"full_name" binding:"notblank,max=100"`
	Headline string   `json:"headline" binding:"max=160"`
	Bio      string   `json:"bio" binding:"max=4000"`
	PhotoURL string   `json:"photo_url" binding:"omitempty,http_url,max=500"`
	Skills   []string `json:"skills" binding:"max=30,dive,notblank,max=40"`
}

type detailRequest struct {
	Label      string            `json:"label" binding:"notblank,max=60"`
	Value      string            `json:"value" binding:"notblank,max=500"`
	Visibility access.Visibility `json:"visibility" binding:"required,oneof=private shared public"`
}

// getProfile mengirim profil inti (selalu publik) dan detail sesuai visibility role.
func (s *Server) getProfile(c *gin.Context) {
	ctx := c.Request.Context()
	profile, err := s.store.Profile(ctx)
	if err != nil {
		fail(c, err)
		return
	}
	details, err := s.store.ProfileDetails(ctx, access.Visibilities(currentRole(c)))
	respond(c, http.StatusOK, gin.H{"profile": profile, "details": details}, err)
}

func (s *Server) updateProfile(c *gin.Context) {
	var req profileRequest
	if !bindJSON(c, &req) {
		return
	}
	skills := make(store.StringList, len(req.Skills))
	for i, skill := range req.Skills {
		skills[i] = strings.TrimSpace(skill)
	}
	profile, err := s.store.UpdateProfile(c.Request.Context(), store.Profile{
		FullName: strings.TrimSpace(req.FullName),
		Headline: strings.TrimSpace(req.Headline),
		Bio:      strings.TrimSpace(req.Bio),
		PhotoURL: req.PhotoURL,
		Skills:   skills,
	})
	respond(c, http.StatusOK, profile, err)
}

func (s *Server) createDetail(c *gin.Context) {
	detail, ok := bindDetail(c)
	if !ok {
		return
	}
	created, err := s.store.CreateProfileDetail(c.Request.Context(), detail)
	respond(c, http.StatusCreated, created, err)
}

func (s *Server) updateDetail(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	detail, ok := bindDetail(c)
	if !ok {
		return
	}
	detail.ID = id
	updated, err := s.store.UpdateProfileDetail(c.Request.Context(), detail)
	respond(c, http.StatusOK, updated, err)
}

func (s *Server) deleteDetail(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	respond(c, http.StatusNoContent, nil, s.store.DeleteProfileDetail(c.Request.Context(), id))
}

func bindDetail(c *gin.Context) (store.ProfileDetail, bool) {
	var req detailRequest
	if !bindJSON(c, &req) {
		return store.ProfileDetail{}, false
	}
	return store.ProfileDetail{
		Label:      strings.TrimSpace(req.Label),
		Value:      strings.TrimSpace(req.Value),
		Visibility: req.Visibility,
	}, true
}
