package api

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/trias059/web-personal/backend/internal/ai"
	"github.com/trias059/web-personal/backend/internal/store"
)

type curhatRequest struct {
	Body string `json:"body" binding:"notblank,max=10000"`
}

// curhatEntry menambahkan label mood hasil analisis sentimen ke entri jurnal.
type curhatEntry struct {
	store.CurhatEntry
	MoodLabel string `json:"mood_label"`
}

func withMood(e store.CurhatEntry) curhatEntry {
	return curhatEntry{CurhatEntry: e, MoodLabel: ai.MoodLabel(e.MoodScore)}
}

func (s *Server) listCurhat(c *gin.Context) {
	entries, err := s.store.CurhatEntries(c.Request.Context())
	if err != nil {
		fail(c, err)
		return
	}
	out := make([]curhatEntry, len(entries))
	for i, e := range entries {
		out[i] = withMood(e)
	}
	c.JSON(http.StatusOK, out)
}

// createCurhat menyimpan entri beserta skor mood dari analisis sentimen.
func (s *Server) createCurhat(c *gin.Context) {
	var req curhatRequest
	if !bindJSON(c, &req) {
		return
	}
	body := strings.TrimSpace(req.Body)
	entry, err := s.store.CreateCurhatEntry(c.Request.Context(), body, ai.AnalyzeSentiment(body).Score)
	respond(c, http.StatusCreated, withMood(entry), err)
}

func (s *Server) updateCurhat(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	var req curhatRequest
	if !bindJSON(c, &req) {
		return
	}
	body := strings.TrimSpace(req.Body)
	entry, err := s.store.UpdateCurhatEntry(c.Request.Context(), id, body, ai.AnalyzeSentiment(body).Score)
	respond(c, http.StatusOK, withMood(entry), err)
}

func (s *Server) deleteCurhat(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	respond(c, http.StatusNoContent, nil, s.store.DeleteCurhatEntry(c.Request.Context(), id))
}

// replyCurhat meminta balasan empatik dari teman curhat AI dan menyimpannya di entri.
func (s *Server) replyCurhat(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	ctx := c.Request.Context()
	entry, err := s.store.CurhatEntry(ctx, id)
	if err != nil {
		fail(c, err)
		return
	}
	reply, err := s.ai.Curhat(ctx, []ai.Message{{Role: "user", Content: entry.Body}})
	if err != nil {
		fail(c, err)
		return
	}
	entry, err = s.store.SetCurhatReply(ctx, id, reply)
	respond(c, http.StatusOK, withMood(entry), err)
}
